/**
 * Jadibot (Sub-bot) Command Handler — Smart Edition v2
 * Works anywhere (group/private), redirects to private chat for pairing
 * Auto-detects user phone number from JID
 *
 * Commands:
 *   .تنصيب / .connect               - Auto-detect sender, start pairing
 *   .تنصيب <number> / .connect <number>  - Owner only: pair specific number
 *   .قائمة_البوتات / .listjadibot    - List all sub-bots (owner only)
 *   .حذف_جادي <number> / .deljadibot - Remove a sub-bot (owner only)
 *
 * Developer: Yaseen ELMINYAWE
 */

const {
    createJadibot,
    stopJadibot,
    getFullJadibotStatus,
    getActiveJadibots,
    isJadibotConnected,
    isPendingPairing,
    extractNumberFromJid,
    MAX_JADIBOTS,
} = require('../lib/jadibot');

// ── Anti-Ban: Request Rate Limiter ─────────────────────────────────────────
// Only 1 .تنصيب request per 60 seconds globally to protect master number
const LAST_INSTALL_REQUEST = { timestamp: 0 };
const INSTALL_COOLDOWN_MS = 60_000;

const forwardCtx = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363193862622642@newsletter',
            newsletterName: 'ELMINYAWE',
            serverMessageId: -1
        }
    },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function formatUptime(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d} يوم، ${h % 24} ساعة`;
    if (h > 0) return `${h} ساعة، ${m % 60} دقيقة`;
    if (m > 0) return `${m} دقيقة`;
    return `${s} ثانية`;
}

// ── Installation Guide Text ──────────────────────────────────────────────

const GUIDE_TEXT = `🛠️ *دليل تنصيب البوت* 🛠️

مرحبًا بك! بدأت عملية ربط رقمك بالبوت.

📱 *الخطوات:*
1. هيوصلك إشعار من واتساب (طلب ربط جهاز جديد)
2. اضغط على الإشعار
3. اضغط *تأكيد*
4. الصق كود الـ 8 أرقام اللي هيوصلك في الرسالة الجاية

⚡ لازم يكون الإنترنت شغال عندك.

━━━━━━━━━━━━━━━━━`;

// ── Main command handler ─────────────────────────────────────────────────

/**
 * @param {object} sock    Main bot socket
 * @param {string} chatId  Chat ID
 * @param {object} message WhatsApp message object
 * @param {boolean} isGroup Whether the chat is a group
 */
async function jadibotCommand(sock, chatId, message, isGroup) {
    try {
        // ── Parse command ────────────────────────────────────────────────
        const rawText =
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() || '';

        const parts = rawText.split(/\s+/);
        const cmd = (parts[0] || '').toLowerCase();

        const isConnect = cmd === '.تنصيب' || cmd === '.connect' || cmd === '.ربط' || cmd === '.صلة';
        const isList    = cmd === '.قائمة_البوتات' || cmd === '.listjadibot' || cmd === '.البوتات';
        const isDelete  = cmd === '.حذف_جادي' || cmd === '.deljadibot' || cmd === '.حذف_البوت';

        // ── .تنصيب / .connect ────────────────────────────────────────────
        if (isConnect) {
            // ── Anti-Ban: Rate limit .تنصيب requests ───────────────────
            const now = Date.now();
            const elapsed = now - LAST_INSTALL_REQUEST.timestamp;
            if (elapsed < INSTALL_COOLDOWN_MS) {
                const remaining = Math.ceil((INSTALL_COOLDOWN_MS - elapsed) / 1000);
                await sock.sendMessage(chatId, {
                    text: `⏳ *انتظر ${remaining} ثانية* قبل ما تجرب تاني.\n\nحماية الأمان: لازم فترة بين كل عملية تنصيب عشان نحمي الرقم من التقييد.`,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }
            LAST_INSTALL_REQUEST.timestamp = now;

            const hasManualNumber = !!parts[1];
            const senderJid = message.key.participant || message.key.remoteJid;

            // --- If in group, ask user to go to private ---
            if (isGroup) {
                await sock.sendMessage(chatId, {
                    text: `📩 *يرجى استخدام الأمر في الخاص*\n\nابعت الأمر .تنصيب في المحادثة الخاصة مع البوت.\n\n💡 افتح محادثة خاصة بالبوت واكتب:\n➤ \`.تنصيب\`\n\nمع تحيات، المطور *ELMINYAWE*`,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            // --- Always require manual number ---
            if (!hasManualNumber) {
                await sock.sendMessage(chatId, {
                    text: `📱 *أدخل رقمك*\n\nابعت رقمك مع رمز الدولة بدون علامة + بعد الأمر:\n\n*مثال:* \`.تنصيب 2010xxxxxxxxxx\`\n*مثال:* \`.تنصيب 48459194470\`\n\n💡 لازم يكون الرقم مسجل على واتساب.`,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            // --- Parse the provided number ---
            let targetNumber;
            let targetChatId = chatId;

            // Clean the provided number: extract ALL digits
            const rawNumber = rawText.substring(rawText.indexOf(parts[0]) + parts[0].length).trim();
            targetNumber = rawNumber.replace(/[^0-9]/g, '');
            // Remove leading zeros (country codes never start with 0)
            if (targetNumber.startsWith('0') && targetNumber.length > 10) {
                targetNumber = targetNumber.replace(/^0+/, '');
            }
            console.log(`[Jadibot Cmd] Number — Raw: "${rawNumber}" → Cleaned: "${targetNumber}" (${targetNumber.length} digits)`);

            if (targetNumber.length < 7 || targetNumber.length > 16) {
                await sock.sendMessage(chatId, {
                    text: `❌ الرقم مش صحيح! لازم يكون من 7 لـ 16 رقم.\n\n*مثال:* \`.تنصيب 2010xxxxxxxxxx\``,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            // --- Pre-flight checks ---
            if (isJadibotConnected(targetNumber)) {
                await sock.sendMessage(targetChatId, {
                    text: `⚠️ في بوت شغال بالفعل بالرقم *${targetNumber}*!\nلو عايز تعيد ربطه، حذفه الأول: \`.حذف_جادي ${targetNumber}\``,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            if (isPendingPairing(targetNumber)) {
                await sock.sendMessage(targetChatId, {
                    text: `⏳ في عملية ربط جارية بالفعل للرقم *${targetNumber}*.\nاستنى لحد ما تخلص. لو مشتغلش، جرب تحذفه الأول: \`.حذف_جادي ${targetNumber}\``,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            const active = getActiveJadibots();
            if (active.count >= MAX_JADIBOTS) {
                await sock.sendMessage(targetChatId, {
                    text: `❌ وصلت للحد الأقصى من البوتات الفرعية (${MAX_JADIBOTS} بوتات).\nاحذف واحد الأول عشان تضيف واحد جديد.`,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            // --- Create sub-bot & get pairing code ---
            try {
                const pairingCode = await createJadibot(targetNumber, targetChatId, senderJid);

                // Send installation guide
                await sock.sendMessage(targetChatId, {
                    text: GUIDE_TEXT,
                    ...forwardCtx,
                }, { quoted: message });

                // Wait 2s then send the code in plain text (easy to copy, no decorations)
                await new Promise(r => setTimeout(r, 2000));

                await sock.sendMessage(targetChatId, {
                    text: `${pairingCode}`,
                });

                console.log(`[Jadibot Cmd] Pairing started for ${targetNumber} -> ${targetChatId}`);

            } catch (error) {
                console.error('[Jadibot Cmd] createJadibot error:', error);

                let errorMsg = '❌ حصل مشكلة في جلب الكود. جرب تاني.';
                const errMsg = error.message;

                if (errMsg === 'A bot is already running with this number')
                    errorMsg = `⚠️ في بوت شغال بالفعل بالرقم *${targetNumber}*!`;
                else if (errMsg === 'A bot is already registered and connected with this number')
                    errorMsg = `⚠️ في بوت متصل بالفعل بالرقم *${targetNumber}*! حذفه الأول: \`.حذف_جادي ${targetNumber}\``;
                else if (errMsg === 'Maximum sub-bots limit reached')
                    errorMsg = `❌ وصلت للحد الأقصى (${MAX_JADIBOTS} بوتات).`;
                else if (errMsg === 'Invalid phone number')
                    errorMsg = '❌ الرقم مش مسجل على واتساب أو مش صحيح.';
                else if (errMsg.includes('515') || errMsg.includes('409'))
                    errorMsg = '❌ الرقم ده وصل للحد الأقصى للأجهزة المتصلة. احذف جهاز من واتساب الأول.';
                else if (errMsg.includes('428'))
                    errorMsg = '❌ الرقم ده تم تعليقه مؤقتاً. جرب بعد شوية.';
                else if (errMsg.includes('pairing is already in progress'))
                    errorMsg = `⏳ في عملية ربط جارية بالفعل. استنى شوية أو حاول تحذف البوت الأول.`;

                await sock.sendMessage(targetChatId, {
                    text: errorMsg,
                    ...forwardCtx,
                }, { quoted: message });
            }
            return;
        }

        // ── .قائمة_البوتات / .listjadibot ────────────────────────────────
        if (isList) {
            const fullList = getFullJadibotStatus();

            if (fullList.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `📋 مفيش بوتات فرعية مسجلة حاليًا.\n\nاستخدم \`.تنصيب\` في الخاص عشان تضيف بوت جديد.`,
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            let txt = `🤖 *قائمة البوتات الفرعية (Jadibot)*\n━━━━━━━━━━━━━━━━━\n`;
            txt += `الإجمالي: ${fullList.length}/${MAX_JADIBOTS}\n\n`;

            fullList.forEach((bot, i) => {
                const emoji = bot.currentStatus === 'connected' ? '🟢' :
                              bot.currentStatus === 'pairing'   ? '🟡' :
                              bot.currentStatus === 'connecting' ? '🟠' : '🔴';
                const label = bot.currentStatus === 'connected'  ? 'متصل ✅' :
                              bot.currentStatus === 'pairing'    ? 'في انتظار الربط ⏳' :
                              bot.currentStatus === 'connecting' ? 'جاري الاتصال...' : 'غير متصل ❌';
                const up = bot.uptime ? formatUptime(bot.uptime) : '—';

                txt += `${emoji} *البوت ${i + 1}:*\n`;
                txt += `   📱 الرقم: ${bot.number}\n`;
                txt += `   📊 الحالة: ${label}\n`;
                if (bot.currentStatus === 'connected' && bot.uptime)
                    txt += `   ⏱️ مدة التشغيل: ${up}\n`;
                txt += '\n';
            });

            const ai = getActiveJadibots();
            const connected = ai.list.filter(b => b.status === 'connected').length;
            const pairing   = ai.list.filter(b => b.status === 'pairing').length;
            const offline   = fullList.length - ai.count;
            txt += `━━━━━━━━━━━━━━━━━\n`;
            txt += `🟢 متصل: ${connected} | 🟡 في انتظار: ${pairing} | 🔴 غير متصل: ${offline}\n`;
            txt += `\nالمطور: *ELMINYAWE*`;

            await sock.sendMessage(chatId, { text: txt, ...forwardCtx }, { quoted: message });
            return;
        }

        // ── .حذف_جادي / .deljadibot ──────────────────────────────────────
        if (isDelete) {
            const number = parts[1];

            if (!number) {
                await sock.sendMessage(chatId, {
                    text: '❌ لازم تكتب رقم البوت اللي عايز تحذفه.\nمثال: `.حذف_جادي 2010xxxxxxxxxx`',
                    ...forwardCtx,
                }, { quoted: message });
                return;
            }

            const cleaned = number.replace(/[^0-9]/g, '');

            try {
                const success = await stopJadibot(cleaned, true);
                if (!success) {
                    await sock.sendMessage(chatId, {
                        text: '❌ مفيش بوت شغال بالرقم ده.',
                        ...forwardCtx,
                    }, { quoted: message });
                    return;
                }
                await sock.sendMessage(chatId, {
                    text: `✅ تم حذف البوت الفرعي للرقم *${cleaned}* بنجاح.\nالجلسة اتحذفت.`,
                    ...forwardCtx,
                }, { quoted: message });
            } catch (error) {
                console.error('[Jadibot Cmd] delete error:', error);
                await sock.sendMessage(chatId, {
                    text: '❌ حصل مشكلة في حذف البوت. جرب تاني.',
                    ...forwardCtx,
                }, { quoted: message });
            }
            return;
        }

        // ── Unknown / help ────────────────────────────────────────────────
        await sock.sendMessage(chatId, {
            text: `🤖 *أوامر البوتات الفرعية (Jadibot)*\n\n` +
                  `📱 \`.تنصيب\` — تنصيب تلقائي (في الخاص)\n` +
                  `📱 \`.connect <number>\` — تنصيب لرقم معين (مالك)\n` +
                  `📋 \`.قائمة_البوتات\` — عرض كل البوتات\n` +
                  `🗑️ \`.حذف_جادي <number>\` — حذف بوت فرعي\n\n` +
                  `المطور: *ELMINYAWE*`,
            ...forwardCtx,
        }, { quoted: message });

    } catch (error) {
        console.error('[Jadibot Cmd] Unexpected error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ حصل مشكلة غير متوقعة. جرب تاني.',
            ...forwardCtx,
        }, { quoted: message });
    }
}

module.exports = jadibotCommand;
