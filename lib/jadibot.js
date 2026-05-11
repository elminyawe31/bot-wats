/**
 * Jadibot (Sub-bot) Core Manager — Smart Edition v5
 * Manages multiple Baileys WhatsApp connections for sub-bots
 * Each sub-bot is an EXACT COPY of the main bot (same features, same commands)
 * except owner-only commands (.mode, .autostatus, .antidelete, .cleartmp, .setpp, .clearsession, etc.)
 *
 * Features:
 *  - Sub-bots send same "تم توصيل الروبوت بنجاح" message as main bot
 *  - Auto-send creds.json + session files via self-chat after connection
 *  - Isolated session folders: sessions/<number>/
 *  - Auto-reconnect on disconnection
 *  - Master bot controls sub-bot lifecycle
 *  - Max 10 concurrent sub-bots
 *  - Sub-bot has ALL same socket utilities as main bot (public, decodeJid, getName, serializeM)
 *  - Full group event support (welcome, goodbye, promote, demote)
 *  - Detailed debug logging for troubleshooting
 *
 * Developer: Yaseen ELMINYAWE
 * Copyright (c) 2024 Yaseen ELMINYAWE
 */

const fs = require('fs');
const path = require('path');
const pino = require('pino');
const NodeCache = require('node-cache');
const PhoneNumber = require('awesome-phonenumber');

let _handleMessages = null;
let _handleGroupParticipantUpdate = null;

/**
 * Set the message handler from main.js to avoid circular dependency.
 * Called once during startup in index.js.
 */
function setHandleMessages(fn) {
    _handleMessages = fn;
    console.log('[Jadibot] ✅ handleMessages registered — sub-bots will respond to commands.');
}

/**
 * Set the group participant update handler from main.js.
 * Called once during startup in index.js.
 */
function setHandleGroupParticipantUpdate(fn) {
    _handleGroupParticipantUpdate = fn;
    console.log('[Jadibot] ✅ handleGroupParticipantUpdate registered — sub-bots will handle group events.');
}

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    delay
} = require('@whiskeysockets/baileys');

const { smsg } = require('./myfunc');
const store = require('./lightweight_store');

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const JADIBOT_DATA_FILE = path.join(process.cwd(), 'data', 'jadibot.json');
const MAX_JADIBOTS = 10;
const BROWSER_DESCRIPTOR = ["Ubuntu", "Chrome", "20.0.04"];

// ── Module state ──────────────────────────────────────────────────────────

/** @type {import('@whiskeysockets/baileys').WASocket | null} */
let mainBotSocket = null;

/**
 * In-memory tracking of active sub-bot connections
 * key: jid (e.g. "2010xxxxxxxxxx@s.whatsapp.net")
 * value: { sock, number, startTime, sessionPath, status, chatId, userJid }
 */
const activeJadibots = new Map();

/**
 * Pending pairings waiting for the user to enter the code on their phone
 * key: number (e.g. "2010xxxxxxxxxx")
 * value: { chatId, requestedAt, sessionPath, senderJid }
 */
const pendingPairings = new Map();

// ── Socket Utility Attachment ─────────────────────────────────────────────
/**
 * Attach the same utility methods to sub-bot socket as the main bot has.
 * This is CRITICAL — without these, many commands will fail silently.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
function attachSocketUtilities(sock) {
    // Mark as public bot (same as main bot)
    sock.public = true;

    // decodeJid — decodes WhatsApp JIDs (handles :<device> suffixes)
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            try {
                const decoded = jidDecode(jid) || {};
                return decoded.user && decoded.server ? decoded.user + '@' + decoded.server : jid;
            } catch (e) {
                return jid;
            }
        }
        return jid;
    };

    // getName — gets display name for a JID
    sock.getName = (jid, withoutContact = false) => {
        const id = sock.decodeJid(jid);
        withoutContact = sock.withoutContact || withoutContact;

        let v;
        if (id.endsWith("@g.us")) {
            v = store.contacts[id] || {};
            return v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international') || id.split('@')[0];
        }

        if (id === '0@s.whatsapp.net') {
            return 'WhatsApp';
        }

        const selfId = sock.user ? sock.decodeJid(sock.user.id || '') : '';
        if (id === selfId) {
            return sock.user?.name || sock.user?.verifiedName || global.botname || 'Bot';
        }

        v = store.contacts[id] || {};
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName ||
            PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international') || id.split('@')[0];
    };

    // serializeM — serialize message for Baileys compatibility
    sock.serializeM = (m) => {
        try {
            return smsg(sock, m, store);
        } catch (e) {
            return m;
        }
    };

    // authState getter for compatibility
    Object.defineProperty(sock, 'authState', {
        get() {
            return sock._authState || { creds: { registered: !!sock.user } };
        },
        configurable: true,
    });

    console.log('[Jadibot] ✅ Socket utilities attached (public, decodeJid, getName, serializeM)');
}

// ── Sub-bot Message Handler ──────────────────────────────────────────────
/**
 * Register the messages.upsert handler for a sub-bot.
 * This is the CORE function that makes sub-bots respond to commands.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} formatted - Bot phone number
 */
function registerMessageHandler(sock, formatted) {
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;

            const mek = chatUpdate.messages[0];
            if (!mek) return;
            if (!mek.message) return;

            const remoteJid = mek.key?.remoteJid;
            if (!remoteJid) return;

            // Skip status broadcasts
            if (remoteJid === 'status@broadcast') return;

            // Skip presence updates and status reactions
            const msgId = mek.key.id;
            if (msgId && msgId.startsWith('BAE5') && msgId.length === 16) return;

            // Skip protocol messages (read receipts, presence, etc.)
            if (mek.message.protocolMessage) return;

            // ── CRITICAL: Fix ephemeralMessage wrapper WITHOUT mutating original ──
            let msg = mek.message;
            const firstKey = Object.keys(msg)[0];
            if (firstKey === 'ephemeralMessage') {
                msg = msg.ephemeralMessage.message;
                if (!msg) return;
            }

            // Create a clean chatUpdate object (don't mutate original)
            const cleanUpdate = {
                type: chatUpdate.type,
                messages: [{
                    ...mek,
                    message: msg
                }]
            };

            // ── Check if handleMessages is available ──
            if (!_handleMessages) {
                console.error(`[Jadibot-${formatted}] ⚠️ _handleMessages is NULL! Message from ${mek.key.participant || remoteJid} will be IGNORED.`);
                return;
            }

            const sender = mek.key.participant || mek.key.remoteJid;
            const isGroup = remoteJid.endsWith('@g.us');

            // Extract command text for logging
            let cmdText = '';
            if (msg.conversation) cmdText = msg.conversation.trim();
            else if (msg.extendedTextMessage?.text) cmdText = msg.extendedTextMessage.text.trim();
            else if (msg.imageMessage?.caption) cmdText = '[image] ' + msg.imageMessage.caption.trim();
            else if (msg.videoMessage?.caption) cmdText = '[video] ' + msg.videoMessage.caption.trim();
            else if (msg.stickerMessage) cmdText = '[sticker]';
            else if (msg.audioMessage) cmdText = '[audio]';
            else if (msg.documentMessage) cmdText = '[document]';
            else cmdText = '[other]';

            const isCommand = cmdText.startsWith('.');
            console.log(`[Jadibot-${formatted}] 📩 ${isGroup ? 'Group' : 'DM'} | from: ${sender} | cmd: ${isCommand ? cmdText : '(message)'}`);

            // ── Call handleMessages (same function as main bot) ──
            await _handleMessages(sock, cleanUpdate, true);

            if (isCommand) {
                console.log(`[Jadibot-${formatted}] ✅ Command "${cmdText}" processed successfully`);
            }

        } catch (err) {
            console.error(`[Jadibot-${formatted}] ❌ Message handler FATAL error:`);
            console.error(`[Jadibot-${formatted}]    Error: ${err.message}`);
            if (err.stack) {
                console.error(`[Jadibot-${formatted}]    Stack: ${err.stack}`);
            }

            // Try to notify the chat about the error
            try {
                const remoteJid = mek?.key?.remoteJid;
                if (remoteJid && remoteJid !== 'status@broadcast') {
                    await sock.sendMessage(remoteJid, {
                        text: `❌ حصل خطأ في معالجة الرسالة.\nError: ${err.message}`
                    }).catch(() => {});
                }
            } catch (_) {}
        }
    });
}

// ── Sub-bot Group Event Handler ──────────────────────────────────────────
/**
 * Register group event handlers for a sub-bot.
 * This enables welcome/goodbye messages and promote/demote events.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} formatted - Bot phone number
 */
function registerGroupEventHandlers(sock, formatted) {
    // Group participant updates (join, leave, promote, demote)
    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (_handleGroupParticipantUpdate) {
                await _handleGroupParticipantUpdate(sock, update);
            }
        } catch (err) {
            console.error(`[Jadibot-${formatted}] Group event error:`, err.message);
        }
    });

    // Contacts update
    sock.ev.on('contacts.update', (update) => {
        try {
            for (let contact of update) {
                let id = sock.decodeJid(contact.id);
                if (store && store.contacts) {
                    store.contacts[id] = { id, name: contact.notify };
                }
            }
        } catch (err) {
            // silently ignore
        }
    });

    console.log(`[Jadibot-${formatted}] ✅ Group event handlers registered`);
}

// ── Public helpers ────────────────────────────────────────────────────────

/**
 * Store a reference to the main bot socket.
 * Call this once after the main bot connects.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
function initJadibot(sock) {
    mainBotSocket = sock;
    console.log('[Jadibot] Main bot socket stored for jadibot management.');
}

// ── Data persistence ─────────────────────────────────────────────────────

function getJadibotList() {
    try {
        if (!fs.existsSync(JADIBOT_DATA_FILE)) return [];
        const data = JSON.parse(fs.readFileSync(JADIBOT_DATA_FILE, 'utf-8'));
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('[Jadibot] Error reading jadibot.json:', error);
        return [];
    }
}

function saveJadibotData(data) {
    try {
        const dir = path.dirname(JADIBOT_DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(JADIBOT_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('[Jadibot] Error saving jadibot.json:', error);
    }
}

// ── Validation ────────────────────────────────────────────────────────────

function validateNumber(number) {
    let cleaned = String(number).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length > 10) {
        cleaned = cleaned.replace(/^0+/, '');
    }

    console.log(`[Jadibot] Phone validation — Raw: "${number}" → Cleaned: "${cleaned}" (${cleaned.length} digits)`);

    if (cleaned.length < 7) {
        return { valid: false, formatted: cleaned };
    }
    if (cleaned.length > 16) {
        return { valid: false, formatted: cleaned };
    }

    try {
        const pn = PhoneNumber('+' + cleaned);
        if (pn.isValid()) {
            const formattedNum = pn.number?.replace(/[^0-9]/g, '') || cleaned;
            return { valid: true, formatted: formattedNum };
        }
    } catch (_) {}

    if (cleaned.length >= 8) {
        return { valid: true, formatted: cleaned };
    }

    return { valid: false, formatted: cleaned };
}

function extractNumberFromJid(jid) {
    return (jid || '').split('@')[0].replace(/[^0-9]/g, '');
}

// ── Session files delivery via self-chat ─────────────────────────────────

/**
 * After successful connection, the sub-bot chats with itself and sends:
 *   1. A welcome message with instructions
 *   2. creds.json file as a document
 *   3. All app-state-sync files as documents
 *
 * @param {import('@whiskeysockets/baileys').WASocket} subBotSock
 * @param {string} sessionPath
 * @param {string} number
 */
async function sendSessionFiles(subBotSock, sessionPath, number) {
    const credsPath = path.join(sessionPath, 'creds.json');
    const selfJid = `${number}@s.whatsapp.net`;

    try {
        await delay(4000);

        const welcomeMsg = `🔐 *ملفات الجلسة الخاصة بك*

📱 الرقم: *${number}*

━━━━━━━━━━━━━━━━━

📌 *شرح الملفات:*
ملف creds.json هو ملف المصادقة الخاص ببوت الواتساب.
بدونه البوت مش هيشتغل. لازم تحفظه في مكان آمن.

📌 *طريقة نقل الجلسة لبوت تاني:*
1. حمّل الملفات اللي تحت
2. حط creds.json في مجلد session/ في السيرفر الجديد
3. حط ملفات app-state-sync في نفس المجلد
4. شغّل البوت تاني

━━━━━━━━━━━━━━━━━

⏳ جاري إرسال الملفات...`;

        await subBotSock.sendMessage(selfJid, { text: welcomeMsg });
        await delay(2000);

        // Send creds.json
        if (fs.existsSync(credsPath)) {
            const credsBuffer = fs.readFileSync(credsPath);
            await subBotSock.sendMessage(selfJid, {
                document: credsBuffer,
                fileName: `creds_${number}.json`,
                mimetype: 'application/json',
                caption: `📎 creds_${number}.json\n\n⚠️ احفظ الملف ده في مكان آمن.`,
            });
            await delay(1500);
        } else {
            console.error(`[Jadibot] creds.json not found at ${credsPath}`);
        }

        // Send all app-state-sync files
        try {
            const sessionFiles = fs.readdirSync(sessionPath).filter(f =>
                f.startsWith('app-state-sync') || f.endsWith('.json')
            ).filter(f => f !== 'creds.json');

            if (sessionFiles.length > 0) {
                for (const file of sessionFiles.slice(0, 5)) {
                    const filePath = path.join(sessionPath, file);
                    try {
                        const fileBuffer = fs.readFileSync(filePath);
                        await subBotSock.sendMessage(selfJid, {
                            document: fileBuffer,
                            fileName: file,
                            mimetype: 'application/json',
                            caption: `📎 ${file}`,
                        });
                        await delay(1000);
                    } catch (sendErr) {
                        console.error(`[Jadibot] Error sending ${file}:`, sendErr.message);
                    }
                }

                if (sessionFiles.length > 5) {
                    await subBotSock.sendMessage(selfJid, {
                        text: `📁 يوجد ${sessionFiles.length - 5} ملفات إضافية في مجلد الجلسة.\nللحصول على جميع الملفات، انسخ المجلد بالكامل من السيرفر.`,
                    });
                }
            }
        } catch (dirErr) {
            console.error(`[Jadibot] Error reading session files:`, dirErr.message);
        }

        await delay(2000);

        const detailMsg = `📋 *دليل الاستخدام المتقدم*

━━━━━━━━━━━━━━━━━

🟢 *إذا عايز تشغّل البوت على سيرفر (استضافة):*

1. ارفع الملفات على السيرفر
2. حط creds.json في مجلد: session/
3. حط ملفات app-state-sync في نفس المجلد
4. شغّل: node index.js
5. البوت هيتوصل تلقائياً

🟢 *إذا عايز تنقل البوت لجهاز تاني:*

1. انسخ المجلد session/ بالكامل
2. حطه في مشروع البوت الجديد
3. شغّل البوت

🟡 *تحذيرات مهمة:*

• متشاركش الملفات دي مع حد — دي بيانات دخولك
• لو الملفات اتحذفت، لازم تعمل تنصيب من الأول
• لو البوت اتسجل خروج، الملفات هتتحذف تلقائياً

━━━━━━━━━━━━━━━━━

✅ تم بنجاح!
المطور: *Yaseen ELMINYAWE*`;

        await subBotSock.sendMessage(selfJid, { text: detailMsg });
        console.log(`[Jadibot] Session files sent via self-chat to ${number}`);

    } catch (error) {
        console.error(`[Jadibot] Error in session files delivery:`, error);

        // Fallback: send via main bot
        try {
            if (mainBotSocket && fs.existsSync(credsPath)) {
                const credsBuffer = fs.readFileSync(credsPath);
                await mainBotSocket.sendMessage(selfJid, {
                    document: credsBuffer,
                    fileName: `creds_${number}.json`,
                    mimetype: 'application/json',
                    caption: `✅ *تم الربط بنجاح!*\n\n📱 الرقم: *${number}*\n📁 ملف الجلسة: creds_${number}.json\n\n⚠️ احفظ الملف ده في مكان آمن.\n\nمع تحيات، المطور ELMINYAWE`,
                });
            }
        } catch (fallbackErr) {
            console.error(`[Jadibot] Fallback delivery also failed:`, fallbackErr);
        }
    }
}

// ── Connection success message (same as main bot) ───────────────────────

/**
 * Send the same "تم توصيل الروبوت بنجاح" message that the main bot sends
 */
async function sendConnectionMessage(sock, number) {
    try {
        const botJid = `${number}@s.whatsapp.net`;
        await sock.sendMessage(botJid, {
            text: `🤖 تم توصيل الروبوت بنجاح\n\n⏰ وقت: ${new Date().toLocaleString()}\n✅ الحالة: متصل وجاهز!\n\n✅ تأكد من الانضمام إلى القناة أدناه\nhttps://whatsapp.com/channel/0029Va8zF8cDuMRi7HAK1D1y`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363193862622642@newsletter',
                    newsletterName: 'ELMINYAWE',
                    serverMessageId: -1
                }
            }
        });
        console.log(`[Jadibot] Connection message sent for ${number}`);
    } catch (err) {
        console.error(`[Jadibot] Error sending connection message:`, err.message);
    }
}

// ── Core: Create sub-bot ─────────────────────────────────────────────────

async function createJadibot(number, chatId, senderJid) {
    const { valid, formatted } = validateNumber(number);
    if (!valid) throw new Error('Invalid phone number');

    const jid = `${formatted}@s.whatsapp.net`;
    const sessionPath = path.join(SESSIONS_DIR, formatted);

    if (activeJadibots.has(jid)) {
        const existing = activeJadibots.get(jid);
        if (existing.status === 'connected') {
            throw new Error('A bot is already running with this number');
        }
    }

    const existingList = getJadibotList();
    if (existingList.length >= MAX_JADIBOTS) {
        throw new Error('Maximum sub-bots limit reached');
    }

    const existingEntry = existingList.find(j => j.number === formatted);
    if (existingEntry && existingEntry.status === 'connected') {
        throw new Error('A bot is already registered and connected with this number');
    }

    if (pendingPairings.has(formatted)) {
        throw new Error('A pairing is already in progress for this number. Please wait.');
    }

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    let sock;
    let pairingCode;

    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const msgRetryCounterCache = new NodeCache();

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: BROWSER_DESCRIPTOR,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({ level: 'fatal' }).child({ level: 'fatal' })
                ),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        });

        // ── Store authState for compatibility ──
        sock._authState = state;

        // ── CRITICAL: Attach socket utilities BEFORE registering event handlers ──
        attachSocketUtilities(sock);

        // ── Bind message store for group metadata, contacts, etc. ──
        try {
            store.bind(sock.ev);
        } catch (e) {
            console.log(`[Jadibot] Note: Store bind failed for ${formatted} (non-critical): ${e.message}`);
        }

        sock.ev.on('creds.update', (creds) => {
            process.nextTick(() => saveCreds(creds));
        });

        // ── CRITICAL: Register message handler FIRST ──
        registerMessageHandler(sock, formatted);

        // ── Register group event handlers ──
        registerGroupEventHandlers(sock, formatted);

        // ── Wait for connecting event ──────────────────────────────────
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout while waiting for WebSocket'));
            }, 30000);

            sock.ev.on('connection.update', async (update) => {
                if (update.connection === 'connecting') {
                    clearTimeout(timeout);
                    resolve();
                }
                if (update.connection === 'close') {
                    clearTimeout(timeout);
                    reject(new Error('Connection closed before pairing code could be requested'));
                }
            });
        });

        await delay(3000);

        pairingCode = await sock.requestPairingCode(formatted);
        pairingCode = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;

        const jadibotEntry = {
            number: formatted,
            jid,
            sessionPath,
            chatId,
            senderJid: senderJid || null,
            createdAt: new Date().toISOString(),
            status: 'pairing',
        };

        const filteredList = existingList.filter(j => j.number !== formatted);
        filteredList.push(jadibotEntry);
        saveJadibotData(filteredList);

        pendingPairings.set(formatted, {
            chatId,
            senderJid: senderJid || chatId,
            requestedAt: Date.now(),
            sessionPath,
        });

        // ── Connection update handler ─────────────────────────────────
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`[Jadibot] Sub-bot ${formatted} connected successfully!`);
                console.log(`[Jadibot] User: ${JSON.stringify(sock.user)}`);

                const subBotUserJid = sock.user?.id || jid;

                activeJadibots.set(jid, {
                    sock,
                    number: formatted,
                    startTime: Date.now(),
                    sessionPath,
                    jid,
                    chatId,
                    userJid: subBotUserJid,
                    status: 'connected',
                });

                const list = getJadibotList();
                const entry = list.find(j => j.number === formatted);
                if (entry) {
                    entry.status = 'connected';
                    entry.connectedAt = new Date().toISOString();
                }
                saveJadibotData(list);

                // ── Send same connection message as main bot ────────────
                await sendConnectionMessage(sock, formatted);

                const pending = pendingPairings.get(formatted);
                if (pending) {
                    console.log(`[Jadibot] Sending session files via self-chat for ${formatted}...`);
                    try {
                        await sendSessionFiles(sock, sessionPath, formatted);
                    } catch (err) {
                        console.error(`[Jadibot] Session delivery error:`, err);
                    }

                    if (mainBotSocket && pending.chatId) {
                        try {
                            await mainBotSocket.sendMessage(pending.chatId, {
                                text: `✅ *تم ربط البوت بنجاح!*\n\n📱 الرقم: *${formatted}*\n📂 تم إرسال ملفات الجلسة إلى محادثة نفسك (Message yourself)\n\n*افتح محادثة نفسك في واتساب* عشان تجد الملفات والشرح.\n\n✅ البوت الفرعي جاهز للاستخدام — يقدر يستخدم كل الأوامر زي البوت الرئيسي!\n\nمع تحيات، المطور *ELMINYAWE*`,
                            });
                        } catch (_) {}
                    }

                    pendingPairings.delete(formatted);
                }

                console.log(`[Jadibot] ✅ Sub-bot ${formatted} is now fully operational!`);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`[Jadibot] Sub-bot ${formatted} disconnected. Code: ${statusCode}, Reconnect: ${shouldReconnect}`);

                pendingPairings.delete(formatted);

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    activeJadibots.delete(jid);

                    try {
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                        }
                    } catch (err) {
                        console.error(`[Jadibot] Error cleaning session for ${formatted}:`, err);
                    }

                    const list = getJadibotList();
                    saveJadibotData(list.filter(j => j.number !== formatted));

                    const entry = activeJadibots.get(jid);
                    const notifyChat = entry?.chatId || chatId;
                    if (mainBotSocket && notifyChat) {
                        try {
                            await mainBotSocket.sendMessage(notifyChat, {
                                text: `⚠️ تم تسجيل خروج البوت الفرعي للرقم *${formatted}*. الجلسة اتحذفت.\nلو عايز تشغله تاني، استخدم .تنصيب من الأول.`,
                            });
                        } catch (_) {}
                    }
                } else if (shouldReconnect) {
                    console.log(`[Jadibot] Reconnecting ${formatted} in 5s...`);
                    try {
                        await delay(5000);
                        await startJadibot(formatted, chatId);
                    } catch (err) {
                        console.error(`[Jadibot] Reconnect failed for ${formatted}:`, err);
                    }
                }
            }
        });

        activeJadibots.set(jid, {
            sock,
            number: formatted,
            startTime: null,
            sessionPath,
            jid,
            chatId,
            userJid: null,
            status: 'pairing',
        });

        console.log(`[Jadibot] Pairing code generated for ${formatted}: ${pairingCode}`);
        return pairingCode;

    } catch (error) {
        console.error(`[Jadibot] Error creating sub-bot for ${formatted}:`, error);

        pendingPairings.delete(formatted);
        try {
            if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (_) {}

        const list = getJadibotList();
        saveJadibotData(list.filter(j => j.number !== formatted));
        activeJadibots.delete(jid);

        if (error.message === 'Invalid phone number' ||
            error.message === 'A bot is already running with this number' ||
            error.message === 'Maximum sub-bots limit reached' ||
            error.message === 'A bot is already registered and connected with this number' ||
            error.message === 'A pairing is already in progress for this number. Please wait.' ||
            error.message.includes('409') ||
            error.message.includes('515') ||
            error.message.includes('428')) {
            throw error;
        }
        throw new Error('Failed to get pairing code');
    }
}

// ── Reconnect existing session ───────────────────────────────────────────

async function startJadibot(number, chatId) {
    const formatted = number.replace(/[^0-9]/g, '');
    const jid = `${formatted}@s.whatsapp.net`;
    const sessionPath = path.join(SESSIONS_DIR, formatted);

    if (!fs.existsSync(sessionPath)) {
        throw new Error('No saved session found for this bot');
    }

    if (activeJadibots.has(jid)) {
        const existing = activeJadibots.get(jid);
        if (existing.status === 'connected') {
            console.log(`[Jadibot] Sub-bot ${formatted} is already connected.`);
            return;
        }
    }

    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const msgRetryCounterCache = new NodeCache();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: BROWSER_DESCRIPTOR,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({ level: 'fatal' }).child({ level: 'fatal' })
                ),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        });

        // ── Store authState for compatibility ──
        sock._authState = state;

        // ── CRITICAL: Attach socket utilities BEFORE registering event handlers ──
        attachSocketUtilities(sock);

        // ── Bind message store ──
        try {
            store.bind(sock.ev);
        } catch (e) {
            console.log(`[Jadibot] Note: Store bind failed for ${formatted} (non-critical): ${e.message}`);
        }

        sock.ev.on('creds.update', saveCreds);

        // ── CRITICAL: Register message handler ──
        registerMessageHandler(sock, formatted);

        // ── Register group event handlers ──
        registerGroupEventHandlers(sock, formatted);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`[Jadibot] Sub-bot ${formatted} reconnected!`);
                console.log(`[Jadibot] User: ${JSON.stringify(sock.user)}`);

                activeJadibots.set(jid, {
                    sock, number: formatted, startTime: Date.now(),
                    sessionPath, jid, chatId,
                    userJid: sock.user?.id || jid, status: 'connected',
                });

                const list = getJadibotList();
                const entry = list.find(j => j.number === formatted);
                if (entry) { entry.status = 'connected'; entry.connectedAt = new Date().toISOString(); }
                saveJadibotData(list);

                // Send same connection message as main bot on reconnect
                await sendConnectionMessage(sock, formatted);
                console.log(`[Jadibot] ✅ Sub-bot ${formatted} is now fully operational!`);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[Jadibot] ${formatted} disconnected. Code: ${statusCode}`);

                pendingPairings.delete(formatted);

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    activeJadibots.delete(jid);
                    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (_) {}
                    saveJadibotData(getJadibotList().filter(j => j.number !== formatted));
                } else if (shouldReconnect) {
                    console.log(`[Jadibot] Reconnecting ${formatted} in 5s...`);
                    try { await delay(5000); await startJadibot(formatted, chatId); } catch (_) {}
                }
            }
        });

        activeJadibots.set(jid, {
            sock, number: formatted, startTime: null,
            sessionPath, jid, chatId, userJid: null, status: 'connecting',
        });

    } catch (error) {
        console.error(`[Jadibot] Error starting sub-bot ${formatted}:`, error);
        throw error;
    }
}

// ── Stop / Shutdown ──────────────────────────────────────────────────────

async function stopJadibot(number, deleteSession = true) {
    const formatted = number.replace(/[^0-9]/g, '');
    const jid = `${formatted}@s.whatsapp.net`;

    const entry = activeJadibots.get(jid);
    if (!entry) {
        console.log(`[Jadibot] Sub-bot ${formatted} not found.`);
        return false;
    }

    try {
        if (entry.sock && typeof entry.sock.end === 'function') entry.sock.end();
    } catch (_) {}

    activeJadibots.delete(jid);
    pendingPairings.delete(formatted);

    if (deleteSession) {
        const sessionPath = path.join(SESSIONS_DIR, formatted);
        try {
            if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (_) {}
        saveJadibotData(getJadibotList().filter(j => j.number !== formatted));
    }

    console.log(`[Jadibot] Sub-bot ${formatted} stopped.`);
    return true;
}

async function stopAllJadibots() {
    console.log(`[Jadibot] Stopping all ${activeJadibots.size} sub-bots...`);
    for (const [key, entry] of Array.from(activeJadibots.entries())) {
        try {
            if (entry.sock && typeof entry.sock.end === 'function') entry.sock.end();
        } catch (_) {}
        activeJadibots.delete(key);
    }
    pendingPairings.clear();
    console.log('[Jadibot] All sub-bots stopped.');
}

// ── Status queries ───────────────────────────────────────────────────────

function getActiveJadibots() {
    const list = [];
    for (const [key, entry] of activeJadibots) {
        list.push({
            jid: key,
            number: entry.number,
            status: entry.status || (entry.startTime ? 'connected' : 'pairing'),
            startTime: entry.startTime,
            uptime: entry.startTime ? Date.now() - entry.startTime : null,
            chatId: entry.chatId || null,
            userJid: entry.userJid || null,
        });
    }
    return { count: list.length, list };
}

function isJadibotConnected(number) {
    const formatted = number.replace(/[^0-9]/g, '');
    const entry = activeJadibots.get(`${formatted}@s.whatsapp.net`);
    return !!entry && entry.status === 'connected';
}

function isPendingPairing(number) {
    return pendingPairings.has(number.replace(/[^0-9]/g, ''));
}

function getFullJadibotStatus() {
    const registered = getJadibotList();
    return registered.map(entry => {
        const active = activeJadibots.get(entry.jid);
        return {
            ...entry,
            isActive: !!active,
            currentStatus: active ? (active.status || 'connected') : (entry.status || 'disconnected'),
            uptime: active?.startTime ? Date.now() - active.startTime : null,
        };
    });
}

// ── Exports ──────────────────────────────────────────────────────────────

module.exports = {
    initJadibot,
    createJadibot,
    startJadibot,
    stopJadibot,
    stopAllJadibots,
    getActiveJadibots,
    isJadibotConnected,
    isPendingPairing,
    getJadibotList,
    getFullJadibotStatus,
    saveJadibotData,
    extractNumberFromJid,
    sendSessionFiles,
    setHandleMessages,
    setHandleGroupParticipantUpdate,
    MAX_JADIBOTS,
    SESSIONS_DIR,
};
