/**
 * Language System for WhatsApp Bot
 * Supports Arabic (Egyptian dialect / العامية المصرية) and English
 *
 * Manages:
 * - Bot language preference stored in ./data/botLang.json
 * - Arabic command aliases mapping to base English commands
 * - Bilingual bot response messages
 */

const fs = require('fs');
const path = require('path');

const LANG_FILE = path.join(__dirname, '..', 'data', 'botLang.json');

// ---------------------------------------------------------------------------
// Comprehensive Egyptian Arabic command alias map
// Each key is the Arabic alias users can type; value is the base English command
// ---------------------------------------------------------------------------
const ARABIC_ALIASES = {
    // ── General commands ──────────────────────────────────────────────────
    '.اوامر': '.help',
    '.قائمة': '.help',
    '.مهات': '.help',
    '.بنج': '.ping',
    '.سريع': '.ping',
    '.بالبالب': '.alive',
    '.عشان': '.alive',
    '.اكتيف': '.alive',
    '.البوت_شغال': '.alive',
    '.البوتشغال': '.alive',
    '.المالك': '.owner',
    '.صاحبى': '.owner',
    '.جيب': '.jid',
    '.رابط': '.url',
    '.لينك': '.url',

    // ── Group management – إدارة المجموعات ───────────────────────────────
    '.طرد': '.kick',
    '.اطرد': '.kick',
    '.اخرج': '.kick',
    '.كتم': '.mute',
    '.اسكت': '.mute',
    '.فك_كتم': '.unmute',
    '.فككتم': '.unmute',
    '.يلا_اتكلم': '.unmute',
    '.يلااتكلم': '.unmute',
    '.حظر': '.ban',
    '.بان': '.ban',
    '.بلوك': '.ban',
    '.فك_حظر': '.unban',
    '.فكحظر': '.unban',
    '.البان': '.unban',
    '.رفع_ادمن': '.promote',
    '.رفعدمن': '.promote',
    '.ادمن': '.promote',
    '.حط_ادمن': '.promote',
    '.حطادمن': '.promote',
    '.تنزيل_ادمن': '.demote',
    '.تنزيلادمن': '.demote',
    '.شيل_ادمن': '.demote',
    '.شيلادمن': '.demote',
    '.منع_ادمن': '.demote',
    '.منعادمن': '.demote',
    '.منشن_الكل': '.tagall',
    '.منشنالكل': '.tagall',
    '.كول_الناس': '.tagall',
    '.كولالناس': '.tagall',
    '.نادى_الكل': '.tagall',
    '.نادىالكل': '.tagall',
    '.منشن': '.tag',
    '.اشارة': '.tag',
    '.منشن_بدون_ادمن': '.tagnotadmin',
    '.منشنبدونادمن': '.tagnotadmin',
    '.منشن_مخفى': '.hidetag',
    '.منشنمخفى': '.hidetag',
    '.هاى_تاق': '.hidetag',
    '.هاىتاق': '.hidetag',
    '.مسح': '.clear',
    '.نضف': '.clear',
    '.امسح': '.clear',
    '.محو': '.delete',
    '.حذف_رسالة': '.delete',
    '.حذفرسالة': '.delete',
    '.رابط_جديد': '.resetlink',
    '.رابطجديد': '.resetlink',
    '.لينك_جديد': '.resetlink',
    '.لينكجديد': '.resetlink',
    '.الادمنية': '.staff',
    '.المشرفين': '.staff',
    '.تحذير': '.warn',
    '.حذر': '.warn',
    '.التحذيرات': '.warnings',
    '.انذارات': '.warnings',
    '.معلومات_المجموعة': '.groupinfo',
    '.معلوماتالمجموعة': '.groupinfo',
    '.معلومات': '.groupinfo',
    '.جروب_اينفو': '.groupinfo',
    '.جروباينفو': '.groupinfo',
    '.المتفوقين': '.topmembers',
    '.اكتر_نشاط': '.topmembers',
    '.اكترنشاط': '.topmembers',
    '.وصف_الجروب': '.setgdesc',
    '.وصفالجروب': '.setgdesc',
    '.اسم_الجروب': '.setgname',
    '.اسمالجروب': '.setgname',
    '.صورة_الجروب': '.setgpp',
    '.صورةالجروب': '.setgpp',
    '.ترحيب': '.welcome',
    '.سلام': '.welcome',
    '.وداع': '.goodbye',
    '.الله_معاك': '.goodbye',
    '.اللهمعاك': '.goodbye',

    // ── Protection – الحماية ──────────────────────────────────────────────
    '.منع_لينك': '.antilink',
    '.منعلينك': '.antilink',
    '.حماية_لينك': '.antilink',
    '.حمايةلينك': '.antilink',
    '.منع_شير': '.antitag',
    '.منع_منشن': '.antitag',
    '.منعمنشن': '.antitag',
    '.منع_شتائم': '.antibadword',
    '.منعشتائم': '.antibadword',
    '.حماية_كلام': '.antibadword',
    '.حمايةكلام': '.antibadword',
    '.منع_مسح': '.antidelete',
    '.منعمسح': '.antidelete',
    '.منع_مكالمات': '.anticall',
    '.منعمكالمات': '.anticall',
    '.بلوك_كول': '.anticall',
    '.بلوككول': '.anticall',
    '.منع_خاص': '.pmblocker',
    '.منعخاص': '.pmblocker',

    // ── Media – الصور والملصقات ──────────────────────────────────────────
    '.ملصق': '.sticker',
    '.ستيكر': '.sticker',
    '.صورة_ملصق': '.simage',
    '.صورةملصق': '.simage',
    '.س_صورة': '.simage',
    '.سصورة': '.simage',
    '.الصورة_ملصق': '.simage',
    '.الصورةملصق': '.simage',
    '.نص_متحرك': '.attp',
    '.نصمتحرك': '.attp',
    '.ملصق_نص': '.attp',
    '.ملصقنص': '.attp',
    '.ضبابية': '.blur',
    '.بلور': '.blur',
    '.ازالة_خلفية': '.removebg',
    '.ازالةخلفية': '.removebg',
    '.شيل_الخلفية': '.removebg',
    '.شيلالخلفية': '.removebg',
    '.تحسين': '.remini',
    '.هانسش': '.remini',
    '.قص': '.crop',
    '.خلط_ايموجي': '.emojimix',
    '.خلطايموجي': '.emojimix',
    '.اميكس': '.emojimix',
    '.ميم': '.meme',
    '.سرقه': '.take',
    '.سرق': '.take',
    '.ستيكر_تلجرام': '.stickertelegram',
    '.ستيكريتلجرام': '.stickertelegram',
    '.تق_ستيكر': '.stickertelegram',
    '.تقستيكر': '.stickertelegram',
    '.انستا_ستيكر': '.igs',
    '.انستاستيكر': '.igs',
    '.انستا_س': '.igs',
    '.انستاس': '.igs',

    // ── AI ────────────────────────────────────────────────────────────────
    '.ذكاء': '.gpt',
    '.سؤال': '.gpt',
    '.جي_بي_تي': '.gpt',
    '.جيبتي': '.gpt',
    '.صور_بذكاء': '.imagine',
    '.صوربذكاء': '.imagine',
    '.ارسم': '.imagine',
    '.سورا': '.sora',
    '.فيديو_ذكاء': '.sora',
    '.فيديوذكاء': '.sora',
    '.شات_بوت': '.chatbot',
    '.شاتبوت': '.chatbot',
    '.روبوت_كلام': '.chatbot',
    '.روبوتكلام': '.chatbot',

    // ── Downloader – التحميل ─────────────────────────────────────────────
    '.تشغيل': '.play',
    '.غنى': '.song',
    '.اغنية': '.song',
    '.فيديو': '.video',
    '.سبوتيفاي': '.spotify',
    '.انستا': '.instagram',
    '.انستجرام': '.instagram',
    '.تيك': '.tiktok',
    '.تيك_توك': '.tiktok',
    '.تيكتوك': '.tiktok',
    '.فيس': '.facebook',
    '.فيسبوك': '.facebook',

    // ── Games – الألعاب ──────────────────────────────────────────────────
    '.اكس_او': '.tictactoe',
    '.اكساو': '.tictactoe',
    '.تكتاكتو': '.tictactoe',
    '.حظ': '.8ball',
    '.كورة': '.8ball',
    '.مشنقة': '.hangman',
    '.لعبة_الكلمات': '.hangman',
    '.لعبةالكلمات': '.hangman',
    '.تخمين': '.trivia',
    '.مسابقة': '.trivia',
    '.حقيقة': '.truth',
    '.تحدي': '.dare',
    '.نسبة': '.ship',
    '.شيب': '.ship',

    // ── Fun – ممتعة ──────────────────────────────────────────────────────
    '.مديح': '.compliment',
    '.كمليمنت': '.compliment',
    '.سب': '.insult',
    '.شتيمة': '.insult',
    '.دلع': '.flirt',
    '.غزل': '.flirt',
    '.نكتة': '.joke',
    '.نكت': '.joke',
    '.حكمة': '.quote',
    '.اقتباس': '.quote',
    '.معلومة': '.fact',
    '.سمب': '.simp',
    '.سيمب': '.simp',
    '.غبى': '.stupid',
    '.احمق': '.stupid',
    '.واتسد': '.wasted',
    '.مقتول': '.wasted',
    '.بورتريه': '.character',
    '.شخصية': '.character',
    '.مساء_الخير': '.goodnight',
    '.مساءالخير': '.goodnight',
    '.نوم': '.goodnight',
    '.يوم_الورد': '.roseday',
    '.يومالورد': '.roseday',

    // ── Text maker ────────────────────────────────────────────────────────
    '.معدن': '.metallic',
    '.جليد': '.ice',
    '.ثلج': '.snow',
    '.نيون': '.neon',
    '.نار': '.fire',
    '.شيطان': '.devil',
    '.عاصفة': '.thunder',
    '.اوراق': '.leaves',
    '.ماتريكس': '.matrix',
    '.هكر': '.hacker',
    '.رمال': '.sand',

    // ── General misc ──────────────────────────────────────────────────────
    '.طقس': '.weather',
    '.اخبار': '.news',
    '.نص_صوت': '.tts',
    '.نصصوت': '.tts',
    '.تكلم': '.tts',
    '.كلمات': '.lyrics',
    '.كلمات_اغنية': '.lyrics',
    '.كلماتاغنية': '.lyrics',
    '.ترجم': '.translate',
    '.ترجمة': '.translate',
    '.سكرين': '.ss',
    '.لقطة': '.ss',
    '.جيثب': '.github',
    '.سورس': '.github',
    '.فيم': '.vv',
    '.مرة_واحدة': '.viewonce',
    '.مرةواحدة': '.viewonce',
    '.نزله': '.download',

    // ── New command aliases ────────────────────────────────────────────
    '.قص_ملصق': '.crop',
    '.قصملصق': '.crop',
    '.انستا_ستيكر_قص': '.igsc',
    '.انستاستيكرقص': '.igsc',
    '.مسح_الجلسة': '.clearsession',
    '.مسحالجلسة': '.clearsession',
    '.اقتباس_انمي': '.animequote',
    '.اقتباسانمي': '.animequote',

    // ── Owner commands ────────────────────────────────────────────────────
    '.لغة': '.lang',
    '.منشن_تلقائى': '.mention',
    '.منشنتلقائى': '.mention',
    '.منشن_اوتو': '.mention',
    '.منشناوتو': '.mention',
    '.وضع': '.mode',
    '.الاعدادات': '.settings',
    '.صورة_البوت': '.setpp',
    '.صورةالبوت': '.setpp',
    '.مسح_جلسة': '.clearsession',
    '.مسحجلسة': '.clearsession',
    '.مسح_مؤقت': '.cleartmp',
    '.مسحمؤقت': '.cleartmp',
    '.تحديث': '.update',
    '.كتابة_تلقائية': '.autotyping',
    '.كتابةتلقائية': '.autotyping',
    '.طباعة': '.autotyping',
    '.قراءة_تلقائية': '.autoread',
    '.قراءةتلقائية': '.autoread',
    '.حالة_تلقائية': '.autostatus',
    '.حالةتلقائية': '.autostatus',

    // ── Anime ─────────────────────────────────────────────────────────────
    '.انمي': '.anime',
    '.قبلة': '.kiss',
    '.عناق': '.hug',
    '.نبك': '.cry',
    '.بوك': '.poke',
    '.دمع': '.nom',

    // ── System / Test ────────────────────────────────────────────────────
    '.تست': '.t',
    '.فحص': '.t',
    '.فحص_النظام': '.t',
    '.فحصالنظام': '.t',

    // ── Jadibot (Sub-bot) ───────────────────────────────────────────────
    '.ربط': '.connect',
    '.صلة': '.connect',
    '.جادي': '.jadibot',
    '.بوتات': '.listjadibot',
    '.البوتات': '.listjadibot',
    '.قائمة_البوتات': '.listjadibot',
    '.قائمةالبوتات': '.listjadibot',
    '.حذف_البوت': '.deljadibot',
    '.حذفالبوت': '.deljadibot',
    '.حذف_جادي': '.deljadibot',

    // ── Misc ──────────────────────────────────────────────────────────────
    '.قلب': '.heart',
    '.لوليس': '.lolice',
    '.تويت': '.tweet',
    '.تعليق_يوتيوب': '.ytcomment',
    '.تعليقيوتيوب': '.ytcomment',

    // ── Pies ──────────────────────────────────────────────────────────────
    '.بيتزا': '.pies',
    '.صين': '.china',
    '.اندونيسيا': '.indonesia',
    '.يابان': '.japan',
    '.كوريا': '.korea',
    '.حجاب': '.hijab',
};

// ---------------------------------------------------------------------------
// Bilingual response messages (Egyptian Arabic / English)
// ---------------------------------------------------------------------------
const LANG_MESSAGES = {
    // ── Admin commands ──────────────────────────────────────────────────
    kickDone: {
        ar: (names) => `╭━━━〔 🚪 𝑻𝑲𝑶𝑶𝑲 𝑶𝑼𝑻 〕━━━╮
┃ 👤 العضو: @${names}
┃ ⚡ تم الطرد بنجاح
╰━━━━━━━━━━━━━━━━╯`,
        en: (names) => `╭━━━〔 🚪 𝑮𝑹𝑶𝑼𝑷 𝑹𝑬𝑴𝑶𝑽𝑬 〕━━━╮
┃ 👤 Member: @${names}
┃ ⚡ Kicked successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    banDone: {
        ar: (name) => `╭━━━〔 🔒 𝑩𝑨𝑵 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم الحظر بنجاح
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔒 𝑩𝑨𝑵 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Banned successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    unbanDone: {
        ar: (name) => `╭━━━〔 🔓 𝑼𝑵𝑩𝑨𝑵 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم فك الحظر
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔓 𝑼𝑵𝑩𝑨𝑵 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Unbanned successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    promoteDone: {
        ar: (name) => `╭━━━〔 🎖️ 𝑷𝑹𝑶𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم رفعه ادمن بنجاح 🎖️
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🎖️ 𝑷𝑹𝑶𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Promoted to admin 🎖️
╰━━━━━━━━━━━━━━━━╯`,
    },
    demoteDone: {
        ar: (name) => `╭━━━〔 ⬇️ 𝑫𝑬𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم تنزيله من الأدمن
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 ⬇️ 𝑫𝑬𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Demoted from admin
╰━━━━━━━━━━━━━━━━╯`,
    },
    muteDone: {
        ar: (name, duration) => `╭━━━〔 🔇 𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم كتمه${duration ? ` لمدة ${duration} دقيقة` : ''}
╰━━━━━━━━━━━━━━━━╯`,
        en: (name, duration) => `╭━━━〔 🔇 𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Muted${duration ? ` for ${duration} min(s)` : ''}
╰━━━━━━━━━━━━━━━━╯`,
    },
    unmuteDone: {
        ar: (name) => `╭━━━〔 🔊 𝑼𝑵𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم فك الكتم
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔊 𝑼𝑵𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Unmuted
╰━━━━━━━━━━━━━━━━╯`,
    },
    noUserMentioned: {
        ar: '❌ لازم تعمل منشن للشخص أو ترد على رسالته!',
        en: '❌ Please mention the user or reply to their message!',
    },
    noReplyMessage: {
        ar: '❌ لازم ترد على رسالة الأول.',
        en: '❌ Please reply to a message first.',
    },
    alreadyAdmin: {
        ar: '⚠️ الشخص ده ادمن فعلاً!',
        en: '⚠️ This user is already an admin!',
    },
    notAdmin: {
        ar: '⚠️ الشخص ده مش ادمن!',
        en: '⚠️ This user is not an admin!',
    },
    alreadyBanned: {
        ar: '⚠️ الشخص ده محظور فعلاً!',
        en: '⚠️ This user is already banned!',
    },
    notBanned: {
        ar: '⚠️ الشخص ده مش محظور!',
        en: '⚠️ This user is not banned!',
    },
    tagallDone: {
        ar: '🔊 *أهلا بالجميع:*',
        en: '🔊 *Attention everyone:*',
    },
    tagallNoMembers: {
        ar: '❌ مفيش أعضاء في الجروب.',
        en: '❌ No members found in the group.',
    },
    hidetagDone: {
        ar: '✅ تم منشن الأعضاء (بدون الأدمنية).',
        en: '✅ Tagged members (excluding admins).',
    },

    // ── Error / Permission messages ───────────────────────────────────────
    userIsBanned: {
        ar: '❌ انت محظور من استخدام البوت. كلمني الادمن عشان يفك الحظر.',
        en: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
    },
    noAdmin: {
        ar: '❌ للأسف بس الأدمن يقدر يستخدم الأمر ده.',
        en: '❌ Sorry, only group admins can use this command.',
    },
    botNotAdmin: {
        ar: '❌ خلي البوت يكون ادمن الأول.',
        en: '❌ Please make the bot an admin first.',
    },
    groupOnly: {
        ar: '❌ الأمر ده للجروبات بس.',
        en: '❌ This command can only be used in groups.',
    },
    ownerOnly: {
        ar: '❌ الأمر ده للمالك بس!',
        en: '❌ This command is only available for the owner!',
    },
    ownerOrSudo: {
        ar: '❌ الأمر ده للمالك بس!',
        en: '❌ This command is only available for the owner or sudo!',
    },

    // ── Language messages ─────────────────────────────────────────────────
    langChanged: {
        ar: '╭━━━〔 🌐 𝑳𝑨𝑵𝑮𝑼𝑨𝑮𝑬 〕━━━╮\n┃ ⚡ تم تغيير اللغة إلى العربية 🇪🇬\n╰━━━━━━━━━━━━━━━━╯',
        en: '╭━━━〔 🌐 𝑳𝑨𝑵𝑮𝑼𝑨𝑮𝑬 〕━━━╮\n┃ ⚡ Language changed to English 🇬🇧\n╰━━━━━━━━━━━━━━━━╯',
    },
    currentLang: {
        ar: '📍 اللغة الحالية: العربي 🇪🇬',
        en: '📍 Current language: English 🇬🇧',
    },
    langUsage: {
        ar: '📌 *استخدام الأمر:*\n.lang ar – عربي 🇪🇬\n.lang en – English 🇬🇧\n.لغة عربي – عربي 🇪🇬\n.لغة انجليزي – English 🇬🇧',
        en: '📌 *Usage:*\n.lang ar – عربي 🇪🇬\n.lang en – English 🇬🇧\n.لغة عربي – عربي 🇪🇬\n.لغة انجليزي – English 🇬🇧',
    },
    invalidLang: {
        ar: '❌ اللغة مش موجودة! استخدم .lang عشان تشوف الخيارات.',
        en: '❌ Invalid language! Use .lang to see available options.',
    },

    // ── Mode messages ─────────────────────────────────────────────────────
    modeChanged: {
        ar: (mode) => `╭━━━〔 ⚙️ 𝑴𝑶𝑫𝑬 〕━━━╮
┃ ⚡ تم تغيير الوضع
┃ 📍 الوضع: *${mode === 'public' ? 'عام 🌐' : 'خاص 🔒'}*
╰━━━━━━━━━━━━━━━━╯`,
        en: (mode) => `╭━━━〔 ⚙️ 𝑴𝑶𝑫𝑬 〕━━━╮
┃ ⚡ Mode changed
┃ 📍 Mode: *${mode}*
╰━━━━━━━━━━━━━━━━╯`,
    },
    currentMode: {
        ar: (isPublic) => `📍 الوضع الحالي: *${isPublic ? 'عام' : 'خاص'}*`,
        en: (isPublic) => `📍 Current mode: *${isPublic ? 'public' : 'private'}*`,
    },

    // ── Media / processing messages ───────────────────────────────────────
    processing: {
        ar: '⏳ استنى شوية بنعمل الطلب ده...',
        en: '⏳ Please wait, processing your request...',
    },
    noReplyMedia: {
        ar: '❌ لازم ترد على صورة أو ملصق الأول.',
        en: '❌ Please reply to an image or sticker first.',
    },
    noText: {
        ar: '❌ اكتب نص بعد الأمر.',
        en: '❌ Please provide text after the command.',
    },
    noLink: {
        ar: '❌ حط لينك الأول.',
        en: '❌ Please provide a link.',
    },
    noMention: {
        ar: '❌ لازم تعمل منشن لشخص الأول.',
        en: '❌ Please mention a user first.',
    },

    // ── Success messages ──────────────────────────────────────────────────
    done: {
        ar: '╭━━━〔 ✅ 𝑫𝑶𝑵𝑬 〕━━━╮\n┃ ⚡ تم بنجاح\n╰━━━━━━━━━━━━━━━━╯',
        en: '╭━━━〔 ✅ 𝑫𝑶𝑵𝑬 〕━━━╮\n┃ ⚡ Done successfully\n╰━━━━━━━━━━━━━━━━╯',
    },
    on: {
        ar: '✅ تم تشغيل الميزة.',
        en: '✅ Feature enabled.',
    },
    off: {
        ar: '✅ تم إيقاف الميزة.',
        en: '✅ Feature disabled.',
    },

    // ── Welcome / Goodbye ─────────────────────────────────────────────────
    welcomeUsage: {
        ar: '📌 *استخدام أمر الترحيب:*\n.welcome on – تشغيل الترحيب\n.welcome off – إيقاف الترحيب\n.welcome set <text> – تعيين رسالة ترحيب',
        en: '📌 *Welcome usage:*\n.welcome on – Enable welcome\n.welcome off – Disable welcome\n.welcome set <text> – Set custom welcome message',
    },
    welcomeSetText: {
        ar: '✅ تم تعيين رسالة الترحيب.',
        en: '✅ Welcome message has been set.',
    },
    welcomeOn: {
        ar: '✅ الترحيب مُفعّل في الجروب ده.',
        en: '✅ Welcome messages enabled for this group.',
    },
    welcomeOff: {
        ar: '✅ الترحيب متوقف في الجروب ده.',
        en: '✅ Welcome messages disabled for this group.',
    },
    goodbyeOn: {
        ar: '✅ الوداع مُفعّل في الجروب ده.',
        en: '✅ Goodbye messages enabled for this group.',
    },
    goodbyeOff: {
        ar: '✅ الوداع متوقف في الجروب ده.',
        en: '✅ Goodbye messages disabled for this group.',
    },

    // ── Mute / Kick / Ban messages (legacy single-arg wrappers) ─────────
    kicked: {
        ar: (name) => `╭━━━〔 🚪 𝑻𝑲𝑶𝑶𝑲 𝑶𝑼𝑻 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم الطرد بنجاح
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🚪 𝑮𝑹𝑶𝑼𝑷 𝑹𝑬𝑴𝑶𝑽𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Kicked successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    banned: {
        ar: (name) => `╭━━━〔 🔒 𝑩𝑨𝑵 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم الحظر بنجاح
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔒 𝑩𝑨𝑵 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Banned successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    userBanned: {
        ar: (name) => `╭━━━〔 🔒 𝑩𝑨𝑵 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم الحظر بنجاح
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔒 𝑩𝑨𝑵 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Banned successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    unbanned: {
        ar: (name) => `╭━━━〔 🔓 𝑼𝑵𝑩𝑨𝑵 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم فك الحظر
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔓 𝑼𝑵𝑩𝑨𝑵 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Unbanned successfully
╰━━━━━━━━━━━━━━━━╯`,
    },
    muted: {
        ar: (name, duration) => `╭━━━〔 🔇 𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم كتمه${duration ? ` لمدة ${duration} دقيقة` : ''}
╰━━━━━━━━━━━━━━━━╯`,
        en: (name, duration) => `╭━━━〔 🔇 𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Muted${duration ? ` for ${duration} min(s)` : ''}
╰━━━━━━━━━━━━━━━━╯`,
    },
    unmuted: {
        ar: (name) => `╭━━━〔 🔊 𝑼𝑵𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم فك الكتم
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🔊 𝑼𝑵𝑴𝑼𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Unmuted
╰━━━━━━━━━━━━━━━━╯`,
    },
    promoted: {
        ar: (name) => `╭━━━〔 🎖️ 𝑷𝑹𝑶𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم رفعه ادمن بنجاح 🎖️
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 🎖️ 𝑷𝑹𝑶𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Promoted to admin 🎖️
╰━━━━━━━━━━━━━━━━╯`,
    },
    demoted: {
        ar: (name) => `╭━━━〔 ⬇️ 𝑫𝑬𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 العضو: @${name}
┃ ⚡ تم تنزيله من الأدمن
╰━━━━━━━━━━━━━━━━╯`,
        en: (name) => `╭━━━〔 ⬇️ 𝑫𝑬𝑴𝑶𝑻𝑬 〕━━━╮
┃ 👤 Member: @${name}
┃ ⚡ Demoted from admin
╰━━━━━━━━━━━━━━━━╯`,
    },

    // ── Antilink / Protection ────────────────────────────────────────────
    antilinkUsage: {
        ar: '```إعداد منع اللينكات\n\n.antilink on\n.antilink set delete | kick | warn\n.antilink off\n```',
        en: '```ANTILINK SETUP\n\n.antilink on\n.antilink set delete | kick | warn\n.antilink off\n```',
    },
    antilinkOn: {
        ar: '✅ منع اللينكات مُفعّل. أي حد ينزل لينك هيتشال.',
        en: '✅ Antilink enabled. Any link shared will be deleted.',
    },
    antilinkOff: {
        ar: '✅ منع اللينكات متوقف.',
        en: '✅ Antilink disabled.',
    },
    antilinkSet: {
        ar: (action) => `✅ إجراء منع اللينكات اتظبط لـ *${action}*`,
        en: (action) => `✅ Antilink action set to *${action}*`,
    },
    antilinkInvalid: {
        ar: '❌ إجراء مش صحيح. اختار delete أو kick أو warn.',
        en: '❌ Invalid action. Choose delete, kick, or warn.',
    },
    antilinkGet: {
        ar: (status, action) => `*_إعدادات منع اللينكات:_*\nالحالة: ${status ? 'مُفعّل' : 'متوقف'}\nالإجراء: ${action || 'مش متعين'}`,
        en: (status, action) => `*_Antilink Configuration:_*\nStatus: ${status ? 'ON' : 'OFF'}\nAction: ${action || 'Not set'}`,
    },
    antilinkAlready: {
        ar: '⚠️ منع اللينكات شغال فعلاً!',
        en: '⚠️ Antilink is already on!',
    },
    antilinkDeleted: {
        ar: '⚠️ اللينكات ممنوعة هنا! الرسالة اتحذفت.',
        en: '⚠️ Links are not allowed here! Message deleted.',
    },
    antitagonOn: {
        ar: '✅ منع المنشن الجماعي مُفعّل.',
        en: '✅ Antitag (mass mention prevention) enabled.',
    },
    antitagonOff: {
        ar: '✅ منع المنشن الجماعي متوقف.',
        en: '✅ Antitag (mass mention prevention) disabled.',
    },
    antitagonUsage: {
        ar: '```إعداد منع المنشن الجماعي\n\n.antitag on\n.antitag set delete | kick\n.antitag off\n```',
        en: '```ANTITAG SETUP\n\n.antitag on\n.antitag set delete | kick\n.antitag off\n```',
    },
    antitagonDetected: {
        ar: '⚠️ اكتشفنا منشن جماعي!',
        en: '⚠️ Tagall detected!',
    },
    antibadwordOn: {
        ar: '✅ منع الشتائم مُفعّل.',
        en: '✅ Antibadword enabled.',
    },
    antibadwordOff: {
        ar: '✅ منع الشتائم متوقف.',
        en: '✅ Antibadword disabled.',
    },
    anticallOn: {
        ar: '✅ منع المكالمات مُفعّل. أي مكالمة هتتنحظر.',
        en: '✅ Anticall enabled. Incoming calls will be blocked.',
    },
    anticallOff: {
        ar: '✅ منع المكالمات متوقف.',
        en: '✅ Anticall disabled.',
    },
    pmblockerOn: {
        ar: '✅ حظر الرسائل الخاصة مُفعّل.',
        en: '✅ PM Blocker enabled.',
    },
    pmblockerOff: {
        ar: '✅ حظر الرسائل الخاصة متوقف.',
        en: '✅ PM Blocker disabled.',
    },
    antideleteOn: {
        ar: '✅ منع مسح الرسائل مُفعّل.',
        en: '✅ Antidelete enabled.',
    },
    antideleteOff: {
        ar: '✅ منع مسح الرسائل متوقف.',
        en: '✅ Antidelete disabled.',
    },
    antilinkWarn: {
        ar: '⚠️ ممنوع تنزل لينكات في الجروب ده! الرسالة اتحذفت.',
        en: '⚠️ Links are not allowed in this group! Message deleted.',
    },
    antitagon: {
        ar: '⚠️ ممنوع تعمل منشن جماعي! الرسالة اتحذفت.',
        en: '⚠️ Mass mentions are not allowed! Message deleted.',
    },

    // ── Clear / Delete ────────────────────────────────────────────────────
    cleared: {
        ar: '✅ تم مسح جميع رسائل البوت.',
        en: '✅ All bot messages have been cleared.',
    },
    deleted: {
        ar: '✅ تم حذف الرسالة.',
        en: '✅ Message deleted.',
    },
    cannotDelete: {
        ar: '❌ مش قادر أحذف الرسالة. لسه عاملها من ساعة.',
        en: '❌ Cannot delete this message. It may be too old.',
    },

    // ── Settings ──────────────────────────────────────────────────────────
    settingsHeader: {
        ar: '*⚙️ إعدادات البوت*',
        en: '*⚙️ BOT SETTINGS*',
    },
    featureOn: {
        ar: 'مُفعّل ✅',
        en: 'ON ✅',
    },
    featureOff: {
        ar: 'متوقف ❌',
        en: 'OFF ❌',
    },

    // ── Sticker / Media commands ─────────────────────────────────────────
    stickerProcessing: {
        ar: '⏳ بنحول لملصق... استنى شوية.',
        en: '⏳ Converting to sticker... Please wait.',
    },
    stickerDone: {
        ar: '✅ تم تحويل لملصق بنجاح! ✂️',
        en: '✅ Sticker created successfully! ✂️',
    },
    stickerError: {
        ar: '❌ حصل مشكلة في صناعة الملصق. جرب تاني.',
        en: '❌ Failed to create sticker! Try again later.',
    },
    noMediaReply: {
        ar: '❌ لازم ترد على صورة أو فيديو الأول!',
        en: '❌ Please reply to an image/video with .sticker, or send an image/video with .sticker as the caption.',
    },
    cropProcessing: {
        ar: '⏳ بنقص الصورة... استنى شوية.',
        en: '⏳ Cropping image... Please wait.',
    },
    cropDone: {
        ar: '✅ تم قص الملصق بنجاح! ✂️',
        en: '✅ Sticker cropped successfully! ✂️',
    },
    cropError: {
        ar: '❌ حصل مشكلة في القص. جرب بصورة تانية.',
        en: '❌ Failed to crop sticker! Try with a different image.',
    },
    cropNoMedia: {
        ar: '❌ لازم ترد على صورة/فيديو/ملصق أو تبعت كابشن .crop',
        en: '❌ Please reply to an image/video/sticker with .crop, or send media with .crop as caption.',
    },
    removebgProcessing: {
        ar: '⏳ بنشيل الخلفية... استنى شوية.',
        en: '⏳ Removing background... Please wait.',
    },
    removebgDone: {
        ar: '✨ تم شيل الخلفية بنجاح!',
        en: '✨ Background removed successfully!',
    },
    removebgError: {
        ar: '❌ مش قادر أشيل الخلفية. جرب تاني.',
        en: '❌ Failed to remove background.',
    },
    reminiProcessing: {
        ar: '⏳ بنحسن الصورة بالذكاء الاصطناعي... استنى.',
        en: '⏳ Enhancing image with AI... Please wait.',
    },
    reminiDone: {
        ar: '✨ تم تحسين الصورة بنجاح!',
        en: '✨ Image enhanced successfully!',
    },
    reminiError: {
        ar: '❌ مش قادر أحسن الصورة. جرب تاني.',
        en: '❌ Failed to enhance image. Try again.',
    },
    blurDone: {
        ar: '✅ تم ضبابية الصورة بنجاح! 🌫️',
        en: '✅ Image blurred successfully! 🌫️',
    },
    blurError: {
        ar: '❌ مش قادر أضبغي الصورة. جرب تاني.',
        en: '❌ Failed to blur image. Please try again later.',
    },
    blurNoImage: {
        ar: '❌ لازم ترد على صورة أو تبعت صورة مع كابشن .blur',
        en: '❌ Please reply to an image or send an image with caption .blur',
    },

    // ── Downloader commands ───────────────────────────────────────────────
    downloadProcessing: {
        ar: '⏳ بنحمل... استنى شوية.',
        en: '⏳ Downloading... Please wait.',
    },
    downloadDone: {
        ar: '✅ تم التحميل بنجاح!',
        en: '✅ Downloaded successfully!',
    },
    downloadError: {
        ar: '❌ حصل مشكلة في التحميل. جرب تاني.',
        en: '❌ Download failed. Please try again.',
    },
    noUrl: {
        ar: '❌ حط لينك الأول!',
        en: '❌ Please provide a link.',
    },
    invalidUrl: {
        ar: '❌ اللينك ده مش صحيح!',
        en: '❌ That is not a valid link.',
    },
    instagramDone: {
        ar: '✅ تم تحميل الانستجرام بنجاح!',
        en: '✅ Instagram media downloaded successfully!',
    },
    instagramError: {
        ar: '❌ مش قادر أحمل من الانستجرام. اللينك مش شغال أو البوست خاص.',
        en: '❌ Failed to fetch media from Instagram. The post might be private or the link is invalid.',
    },
    spotifyDone: {
        ar: '🎵 تم تحميل الاغنية من سبوتيفاي بنجاح!',
        en: '🎵 Spotify audio downloaded successfully!',
    },
    spotifyError: {
        ar: '❌ مش قادر أحمل من سبوتيفاي. جرب بحث تاني.',
        en: '❌ Failed to fetch Spotify audio. Try another query.',
    },
    facebookDone: {
        ar: '✅ تم تحميل فيديو الفيسبوك بنجاح!',
        en: '✅ Facebook video downloaded successfully!',
    },
    facebookError: {
        ar: '❌ مش قادر أحمل من الفيسبوك. اللينك مش شغال.',
        en: '❌ Failed to download from Facebook. The link might be invalid.',
    },
    noDownloadableMedia: {
        ar: '❌ مفيش ميديا قابلة للتحميل في اللينك ده.',
        en: '❌ No downloadable media found at this link.',
    },

    // ── AI commands ───────────────────────────────────────────────────────
    aiProcessing: {
        ar: '🤖 البوت بيفكر... استنى شوية.',
        en: '🤖 AI is thinking... Please wait.',
    },
    aiError: {
        ar: '❌ حصل مشكلة في الذكاء الاصطناعي. جرب تاني.',
        en: '❌ Failed to get AI response. Please try again later.',
    },
    noQuestion: {
        ar: '❌ اكتب سؤال بعد الأمر!\nمثال: .gpt اكتب كود HTML',
        en: '❌ Please provide a question after the command!\nExample: .gpt write a basic html code',
    },
    imagineProcessing: {
        ar: '🎨 بنرسم الصورة... استنى شوية.',
        en: '🎨 Generating your image... Please wait.',
    },
    imagineDone: {
        ar: (prompt) => `🎨 الصورة اترسمت بنجاح للوصف: "${prompt}"`,
        en: (prompt) => `🎨 Generated image for prompt: "${prompt}"`,
    },
    imagineError: {
        ar: '❌ مش قادر أرسم الصورة. جرب تاني.',
        en: '❌ Failed to generate image. Please try again later.',
    },
    imagineNoPrompt: {
        ar: '❌ اكتب وصف للصورة!\nمثال: .imagine غروب شمس فوق الجبال',
        en: '❌ Please provide a prompt for the image generation.\nExample: .imagine a beautiful sunset over mountains',
    },

    // ── Game commands ─────────────────────────────────────────────────────
    tictactoeStarted: {
        ar: (player) => `🎮 *مباراة إكس أو بدأت!*\n\nمستنى *@${player}* يلعب...`,
        en: (player) => `🎮 *TicTacToe Game Started!*\n\nWaiting for @${player} to play...`,
    },
    tictactoeWaiting: {
        ar: (room) => `⏳ *مستني خصم*\nاكتب *.ttt ${room}* عشان تدخل!`,
        en: (room) => `⏳ *Waiting for opponent*\nType *.ttt ${room}* to join!`,
    },
    tictactoeWin: {
        ar: (winner) => `🎉 *@${winner}* كسب الماتش!`,
        en: (winner) => `🎉 @${winner} wins the game!`,
    },
    tictactoeDraw: {
        ar: '🤝 الماتش انتهت بالتعادل!',
        en: '🤝 Game ended in a draw!',
    },
    tictactoeInvalid: {
        ar: '❌ الحركة مش صحيحة! المكان ده مشغول.',
        en: '❌ Invalid move! That position is already taken.',
    },
    tictactoeNotYourTurn: {
        ar: '❌ مش دورك!',
        en: '❌ Not your turn!',
    },
    tictactoeSurrender: {
        ar: (loser, winner) => `🏳️ *@${loser}* استسلم! *@${winner}* كسب!`,
        en: (loser, winner) => `🏳️ @${loser} has surrendered! @${winner} wins the game!`,
    },
    tictactoeInGame: {
        ar: '❌ لسه في ماتش شغالة. اكتب *surrender* عشان تنسحب.',
        en: '❌ You are still in a game. Type *surrender* to quit.',
    },
    triviaQuestion: {
        ar: (q, opts) => `🧠 *وقت الأسئلة!*\n\nالسؤال: ${q}\nالخيارات:\n${opts}`,
        en: (q, opts) => `🧠 *Trivia Time!*\n\nQuestion: ${q}\nOptions:\n${opts}`,
    },
    triviaCorrect: {
        ar: (answer) => `✅ صح! الإجابة هي ${answer}`,
        en: (answer) => `✅ Correct! The answer is ${answer}`,
    },
    triviaWrong: {
        ar: (answer) => `❌ غلط! الإجابة الصح كانت ${answer}`,
        en: (answer) => `❌ Wrong! The correct answer was ${answer}`,
    },
    triviaInProgress: {
        ar: '⚠️ في سؤال شغال فعلاً!',
        en: '⚠️ A trivia game is already in progress!',
    },
    triviaNoGame: {
        ar: '❌ مفيش سؤال شغال دلوقتي.',
        en: '❌ No trivia game is in progress.',
    },
    triviaError: {
        ar: '❌ حصل مشكلة في جيب السؤال. جرب تاني.',
        en: '❌ Error fetching trivia question. Try again later.',
    },
    truthDone: {
        ar: '🎯 *حقيقة:*',
        en: '🎯 *Truth:*',
    },
    dareDone: {
        ar: '😈 *تحدي:*',
        en: '😈 *Dare:*',
    },
    truthDareError: {
        ar: '❌ مش قادر أجيب حقيقة أو تحدي. جرب تاني.',
        en: '❌ Failed to get truth/dare. Please try again later!',
    },
    shipResult: {
        ar: (u1, u2) => `${u1} ❤️ ${u2}\nمبروك 💖🍻`,
        en: (u1, u2) => `${u1} ❤️ ${u2}\nCongratulations 💖🍻`,
    },
    shipError: {
        ar: '❌ مش قادر أعمل شيب! متأكد إنك في جروب؟',
        en: '❌ Failed to ship! Make sure this is a group.',
    },

    // ── Fun commands ──────────────────────────────────────────────────────
    complimentDone: {
        ar: (user, compliment) => `يا @${user}, ${compliment} 😊`,
        en: (user, compliment) => `Hey @${user}, ${compliment}`,
    },
    complimentNoUser: {
        ar: '❌ لازم تعمل منشن لحد أو ترد على رسالته عشان تمدحه!',
        en: '❌ Please mention someone or reply to their message to compliment them!',
    },
    insultDone: {
        ar: (user, insult) => `يا @${user}, ${insult} 😂`,
        en: (user, insult) => `Hey @${user}, ${insult}`,
    },
    insultNoUser: {
        ar: '❌ لازم تعمل منشن لحد أو ترد على رسالته عشان تسبه!',
        en: '❌ Please mention someone or reply to their message to insult them!',
    },
    flirtDone: {
        ar: '💕',
        en: '💕',
    },
    flirtError: {
        ar: '❌ مش قادر أجيب رسالة غزل. جرب تاني!',
        en: '❌ Failed to get flirt message. Please try again later!',
    },
    jokeDone: {
        ar: '😂 *نكتة:*',
        en: '😂 *Joke:*',
    },
    jokeError: {
        ar: '❌ مش قادر أجيب نكتة دلوقتي.',
        en: '❌ Sorry, I could not fetch a joke right now.',
    },
    quoteDone: {
        ar: '📜 *اقتباس:*',
        en: '📜 *Quote:*',
    },
    quoteError: {
        ar: '❌ مش قادر أجيب اقتباس. جرب تاني!',
        en: '❌ Failed to get quote. Please try again later!',
    },
    factDone: {
        ar: '💡 *معلومة:*',
        en: '💡 *Fact:*',
    },
    factError: {
        ar: '❌ مش قادر أجيب معلومة دلوقتي.',
        en: '❌ Sorry, I could not fetch a fact right now.',
    },
    weatherDone: {
        ar: (city, desc, temp) => `╭━━━〔 🌤️ 𝑾𝑬𝑨𝑻𝑯𝑬𝑹 〕━━━╮
┃ 📍 المدينة: ${city}
┃ 🌡️ الحرارة: ${temp}°C
┃ 🌤️ الحالة: ${desc}
╰━━━━━━━━━━━━━━━━╯`,
        en: (city, desc, temp) => `╭━━━〔 🌤️ 𝑾𝑬𝑨𝑻𝑯𝑬𝑹 〕━━━╮
┃ 📍 City: ${city}
┃ 🌡️ Temperature: ${temp}°C
┃ 🌤️ Condition: ${desc}
╰━━━━━━━━━━━━━━━━╯`,
    },
    weatherError: {
        ar: '❌ مش قادر أجيب الطقس دلوقتي. تأكد إنك كتبت اسم المدينة صح.',
        en: '❌ Sorry, I could not fetch the weather right now.',
    },
    newsDone: {
        ar: '📰 *آخر الأخبار:*',
        en: '📰 *Latest News:*',
    },
    newsError: {
        ar: '❌ مش قادر أجيب الأخبار دلوقتي.',
        en: '❌ Sorry, I could not fetch news right now.',
    },

    // ── Settings ──────────────────────────────────────────────────────────
    settingsTitle: {
        ar: '*⚙️ إعدادات البوت*',
        en: '*⚙️ BOT SETTINGS*',
    },
    settingsLang: {
        ar: (lang) => `📍 اللغة: ${lang === 'ar' ? 'العربي 🇪🇬' : 'English 🇬🇧'}`,
        en: (lang) => `📍 Language: ${lang === 'ar' ? 'العربي 🇪🇬' : 'English 🇬🇧'}`,
    },
    settingsMode: {
        ar: (isPublic) => `• الوضع: ${isPublic ? 'عام' : 'خاص'}`,
        en: (isPublic) => `• Mode: ${isPublic ? 'Public' : 'Private'}`,
    },
    settingsAutoread: {
        ar: (enabled) => `• القراءة التلقائية: ${enabled ? 'مُفعّل ✅' : 'متوقف ❌'}`,
        en: (enabled) => `• Autoread: ${enabled ? 'ON ✅' : 'OFF ❌'}`,
    },
    settingsAutotyping: {
        ar: (enabled) => `• الكتابة التلقائية: ${enabled ? 'مُفعّل ✅' : 'متوقف ❌'}`,
        en: (enabled) => `• Autotyping: ${enabled ? 'ON ✅' : 'OFF ❌'}`,
    },
    settingsAntilink: {
        ar: (enabled, action) => enabled ? `• منع اللينكات: مُفعّل (الإجراء: ${action || 'حذف'})` : '• منع اللينكات: متوقف',
        en: (enabled, action) => enabled ? `• Antilink: ON (action: ${action || 'delete'})` : '• Antilink: OFF',
    },
    settingsWelcome: {
        ar: (enabled) => `• الترحيب: ${enabled ? 'مُفعّل ✅' : 'متوقف ❌'}`,
        en: (enabled) => `• Welcome: ${enabled ? 'ON ✅' : 'OFF ❌'}`,
    },
    settingsChatbot: {
        ar: (enabled) => `• الشات بوت: ${enabled ? 'مُفعّل ✅' : 'متوقف ❌'}`,
        en: (enabled) => `• Chatbot: ${enabled ? 'ON ✅' : 'OFF ❌'}`,
    },
    settingsAntitag: {
        ar: (enabled, action) => enabled ? `• منع المنشن: مُفعّل (الإجراء: ${action || 'حذف'})` : '• منع المنشن: متوقف',
        en: (enabled, action) => enabled ? `• Antitag: ON (action: ${action || 'delete'})` : '• Antitag: OFF',
    },
    settingsNoGroup: {
        ar: '⚠️ الإعدادات الخاصة بالجروب هتظهر بس لما تستخدم الأمر جوه الجروب.',
        en: 'Note: Per-group settings will be shown when used inside a group.',
    },
    settingsError: {
        ar: '❌ حصل مشكلة في قراءة الإعدادات.',
        en: '❌ Failed to read settings.',
    },

    // ── Clearsession ──────────────────────────────────────────────────────
    sessionCleared: {
        ar: (count) => `✅ تم تنظيف ملفات الجلسة بنجاح!\n\n📊 الإحصائيات:\n• إجمالي الملفات: ${count}`,
        en: (count) => `✅ Session files cleared successfully!\n\n📊 Statistics:\n• Total files cleared: ${count}`,
    },
    sessionStats: {
        ar: '🔍 بنحسن ملفات الجلسة للأداء الأحسن...',
        en: '🔍 Optimizing session files for better performance...',
    },
    sessionNoDir: {
        ar: '❌ مجلد الجلسة مش موجود!',
        en: '❌ Session directory not found!',
    },
    sessionError: {
        ar: '❌ حصل مشكلة في تنظيف ملفات الجلسة!',
        en: '❌ Failed to clear session files!',
    },

    // ── IGS (Instagram Sticker) ───────────────────────────────────────────
    igsProcessing: {
        ar: '⏳ بنحول الانستجرام لملصق... استنى شوية.',
        en: '⏳ Converting Instagram media to sticker... Please wait.',
    },
    igsDone: {
        ar: '✅ تم تحويل الانستجرام لملصق بنجاح!',
        en: '✅ Instagram sticker created successfully!',
    },
    igsError: {
        ar: '❌ مش قادر أحول لملصق من اللينك ده.',
        en: '❌ Failed to create sticker from Instagram link.',
    },
    igsNoUrl: {
        ar: '❌ ابعت لينك بوست أو ريلز انستجرام.\nالاستخدام:\n.igs <url>\n.igsc <url>',
        en: '❌ Send an Instagram post/reel link.\nUsage:\n.igs <url>\n.igsc <url>',
    },
    igsNoMedia: {
        ar: '❌ مفيش ميديا في اللينك ده.',
        en: '❌ No media found at the provided link.',
    },

    // ── Owner commands ────────────────────────────────────────────────────
    settingsShown: {
        ar: '✅ تم عرض الإعدادات.',
        en: '✅ Settings displayed.',
    },
    modeUsage: {
        ar: '📌 *استخدام:*\n.mode public – وضع عام\n.mode private – وضع خاص',
        en: '📌 *Usage:*\n.mode public – Public mode\n.mode private – Private mode',
    },
    sudoAdd: {
        ar: (jid) => `✅ تم إضافة سودو: ${jid}`,
        en: (jid) => `✅ Added sudo: ${jid}`,
    },
    sudoRemove: {
        ar: (jid) => `✅ تم إزالة سودو: ${jid}`,
        en: (jid) => `✅ Removed sudo: ${jid}`,
    },
    sudoList: {
        ar: (list) => `📋 *قائمة المستخدمين السودو:*\n${list}`,
        en: (list) => `📋 *Sudo users:*\n${list}`,
    },
    sudoEmpty: {
        ar: '📋 مفيش مستخدمين سودو.',
        en: 'No sudo users set.',
    },
    sudoUsage: {
        ar: '📌 *الاستخدام:*\n.sudo add <@user|number>\n.sudo del <@user|number>\n.sudo list',
        en: '📌 *Usage:*\n.sudo add <@user|number>\n.sudo del <@user|number>\n.sudo list',
    },
    setppDone: {
        ar: '✅ تم تغيير صورة البوت بنجاح!',
        en: '✅ Successfully updated bot profile picture!',
    },
    setppNoImage: {
        ar: '⚠️ لازم ترد على صورة مع الأمر .setpp!',
        en: '⚠️ Please reply to an image with the .setpp command!',
    },
    setppError: {
        ar: '❌ حصل مشكلة في تغيير الصورة!',
        en: '❌ Failed to update profile picture!',
    },
    updateDone: {
        ar: '✅ تم التحديث بنجاح! بإعادة التشغيل...',
        en: '✅ Update done. Restarting…',
    },
    updateProcessing: {
        ar: '🔄 بنحدث البوت... استنى شوية.',
        en: '🔄 Updating the bot, please wait…',
    },
    updateError: {
        ar: (err) => `❌ التحديث فشل:\n${err}`,
        en: (err) => `❌ Update failed:\n${err}`,
    },
    updateAlreadyLatest: {
        ar: (rev) => `✅ البوت محدث لأخر إصدار: ${rev}`,
        en: (rev) => `✅ Already up to date: ${rev}`,
    },

    // ── General info ──────────────────────────────────────────────────────
    noCmdFound: {
        ar: '❌ الأمر ده مش موجود! تابع .اوامر عشان تشوف كل الأوامر.',
        en: '❌ Command not found! Use .help to see all commands.',
    },
    error: {
        ar: '❌ حصل غلطة. جرب تاني.',
        en: '❌ An error occurred. Please try again.',
    },
    rateLimited: {
        ar: '⏰ عمليات كتير. استنى ثواني وحاول تاني.',
        en: '⏰ Rate limit exceeded. Please try again in a few seconds.',
    },
    networkError: {
        ar: '🌐 مشكلة في النت. شيك على الاتصال بتاعك.',
        en: '🌐 Network error. Please check your connection.',
    },
    serverError: {
        ar: '🔧 السيرفر مش شغال. جرب تاني بعدين.',
        en: '🔧 Server error. Please try again later.',
    },
    timeout: {
        ar: '⏰ الطلب اخد وقت طويل. جرب تاني.',
        en: '⏰ Request timeout. Please try again.',
    },

    // ── Meme command ──────────────────────────────────────────────────────
    memeDone: {
        ar: '> خد ميم cheeseems! 🐕',
        en: '> Here\'s your cheems meme! 🐕',
    },
    memeError: {
        ar: '❌ مش قادر أجيب ميم. جرب تاني بعدين.',
        en: '❌ Failed to fetch meme. Please try again later.',
    },
    memeButtonAnother: {
        ar: '🎭 ميم تاني',
        en: '🎭 Another Meme',
    },
    memeButtonJoke: {
        ar: '😄 نكتة',
        en: '😄 Joke',
    },

    // ── Delete command ────────────────────────────────────────────────────
    deleteUsage: {
        ar: '❌ اكتب عدد الرسائل اللي عايز تمسحها.\n\nالاستخدام:\n• `.del 5` – مسح آخر 5 رسايل من الجروب\n• `.del 3 @user` – مسح آخر 3 رسايل من @user\n• `.del 2` (رد على رسالة) – مسح آخر 2 رسايل من اللي اتحطت عليه',
        en: '❌ Please specify the number of messages to delete.\n\nUsage:\n• `.del 5` - Delete last 5 messages from group\n• `.del 3 @user` - Delete last 3 messages from @user\n• `.del 2` (reply to message) - Delete last 2 messages from replied user',
    },
    deleteNoMessages: {
        ar: '❌ مفيش رسايل حديثة في الجروب عشان تمسحها.',
        en: '❌ No recent messages found in the group to delete.',
    },
    deleteNoUserMessages: {
        ar: '❌ مفيش رسايل حديثة للمستخدم ده.',
        en: '❌ No recent messages found for the target user.',
    },
    deleteFailed: {
        ar: '❌ حصل مشكلة في مسح الرسايل.',
        en: '❌ Failed to delete messages.',
    },

    // ── Clear command ─────────────────────────────────────────────────────
    clearProcessing: {
        ar: '⏳ بنمسح رسايل البوت...',
        en: '⏳ Clearing bot messages...',
    },
    clearError: {
        ar: '❌ حصل مشكلة في مسح الرسايل.',
        en: '❌ An error occurred while clearing messages.',
    },

    // ── Test command ──────────────────────────────────────────────────────
    testTitle: {
        ar: '🔬 *تقرير فحص النظام* 🔬',
        en: '🔬 *System Test Report* 🔬',
    },
    testMasterBot: {
        ar: 'الاتصال الرئيسي (Master Bot)',
        en: 'Master Bot Connection',
    },
    testMasterBotFail: {
        ar: 'البوت مش متصل!',
        en: 'Bot is not connected!',
    },
    testMasterBotDetail: {
        ar: (id, name) => `الرقم: ${id}\nالاسم: ${name || 'غير محدد'}`,
        en: (id, name) => `Number: ${id}\nName: ${name || 'N/A'}`,
    },
    testSubBots: {
        ar: 'البوتات الفرعية (Jadibot)',
        en: 'Sub-bots (Jadibot)',
    },
    testSubBotsEmpty: {
        ar: (max) => `مفيش بوتات فرعية مسجلة\nالحد الأقصى: ${max}/10`,
        en: (max) => `No sub-bots registered\nMax: ${max}/10`,
    },
    testSubBotsDetail: {
        ar: (total, connected) => `الإجمالي: ${total}\nمتصل: ${connected} | غير متصل: ${total - connected}`,
        en: (total, connected) => `Total: ${total}\nConnected: ${connected} | Disconnected: ${total - connected}`,
    },
    testSystemResources: {
        ar: 'موارد النظام (System)',
        en: 'System Resources',
    },
    testSystemDetail: {
        ar: (rss, heap, total, free, uptime) => `RAM البوت: ${rss} MB\nHeap: ${heap} MB\nإجمالي RAM السيرفر: ${total} GB\nRAM متاح: ${free} GB\nمدة التشغيل: ${uptime}`,
        en: (rss, heap, total, free, uptime) => `Bot RAM: ${rss} MB\nHeap: ${heap} MB\nServer Total RAM: ${total} GB\nAvailable RAM: ${free} GB\nUptime: ${uptime}`,
    },
    testSystemHigh: {
        ar: '⚠️ مرتفع',
        en: '⚠️ High',
    },
    testSystemNormal: {
        ar: '✅ طبيعي',
        en: '✅ Normal',
    },
    testFileSystem: {
        ar: 'نظام الملفات (File System)',
        en: 'File System',
    },
    testFileSystemPartial: {
        ar: '⚠️ بعض الملفات مفقودة',
        en: '⚠️ Some files missing',
    },
    testFileSystemSuccess: {
        ar: '✅ ناجح',
        en: '✅ Passed',
    },
    testFileSystemSession: {
        ar: 'جلسة الماستر (Session)',
        en: 'Master Session',
    },
    testSessionNotFound: {
        ar: '⚠️ غير موجودة',
        en: '⚠️ Not found',
    },
    testSessionNotFoundDetail: {
        ar: 'مجلد session/ مش موجود. لازم تنصيب البوت.',
        en: 'session/ directory not found. Bot setup required.',
    },
    testSessionIncomplete: {
        ar: '⚠️ غير مكتملة',
        en: '⚠️ Incomplete',
    },
    testSessionIncompleteDetail: {
        ar: 'ملف creds.json مش موجود. لازم تنصيب البوت.',
        en: 'creds.json not found. Bot setup required.',
    },
    testSessionValid: {
        ar: '✅ سليمة',
        en: '✅ Valid',
    },
    testSessionValidDetail: {
        ar: 'ملف creds.json موجود وصالح.',
        en: 'creds.json exists and is valid.',
    },
    testSessionCorrupted: {
        ar: '❌ تالفة',
        en: '❌ Corrupted',
    },
    testSessionCorruptedDetail: {
        ar: 'ملف creds.json موجود بس مش صالح. احذفه ونصّب من الأول.',
        en: 'creds.json exists but is invalid. Delete it and set up again.',
    },
    testModules: {
        ar: 'المكتبات (Dependencies)',
        en: 'Dependencies',
    },
    testModulesMissing: {
        ar: '❌ بعض المكتبات مفقودة',
        en: '❌ Some modules missing',
    },
    testNetwork: {
        ar: 'إعدادات الشبكة (APIs)',
        en: 'Network Settings (APIs)',
    },
    testNetworkDetail: {
        ar: (apis, keys) => `APIs محملة: ${apis ? '✅' : '❌'}\nمفاتيح API: ${keys ? '✅' : '❌'}`,
        en: (apis, keys) => `APIs loaded: ${apis ? '✅' : '❌'}\nAPI Keys: ${keys ? '✅' : '❌'}`,
    },
    testNetworkReady: {
        ar: '✅ جاهز',
        en: '✅ Ready',
    },
    testNetworkPartial: {
        ar: '⚠️ ناقص',
        en: '⚠️ Partial',
    },
    testSummary: {
        ar: '📊 *الملخص:*',
        en: '📊 *Summary:*',
    },
    testPassed: {
        ar: (passed, total) => `✅ ناجح: ${passed}/${total}`,
        en: (passed, total) => `✅ Passed: ${passed}/${total}`,
    },
    testWarnings: {
        ar: (w) => `⚠️ تحذيرات: ${w}`,
        en: (w) => `⚠️ Warnings: ${w}`,
    },
    testFailed: {
        ar: (f) => `❌ فاشل: ${f}`,
        en: (f) => `❌ Failed: ${f}`,
    },
    testTime: {
        ar: (ms) => `⏱️ الوقت: ${ms}ms`,
        en: (ms) => `⏱️ Time: ${ms}ms`,
    },
    testAllGood: {
        ar: '🟢 *النظام جاهز 100%!* كل حاجة شغالة تمام.',
        en: '🟢 *System is 100% ready!* Everything is working fine.',
    },
    testMostlyGood: {
        ar: '🟡 *النظام يعمل بشكل جيد.* فيه بعض التحذيرات بس.',
        en: '🟡 *System is working well.* There are some warnings though.',
    },
    testHasIssues: {
        ar: '🔴 *في مشاكل!* اضطر تتحقق من الأشياء اللي فشلت.',
        en: '🔴 *There are issues!* Please check the failed items.',
    },
    testDeveloper: {
        ar: (dev) => `المطور: *${dev}*`,
        en: (dev) => `Developer: *${dev}*`,
    },
    testVersion: {
        ar: (v) => `الإصدار: *v${v}*`,
        en: (v) => `Version: *v${v}*`,
    },
    testError: {
        ar: (e) => `❌ حصل خطأ في الفحص: ${e}`,
        en: (e) => `❌ Test error: ${e}`,
    },
    testStatusSuccess: {
        ar: '✅ ناجح',
        en: '✅ Passed',
    },
    testStatusFail: {
        ar: '❌ فاشل',
        en: '❌ Failed',
    },
    testStatusPartial: {
        ar: '⚠️ جزئي',
        en: '⚠️ Partial',
    },
    testStatusEmpty: {
        ar: '⚪ فارغ',
        en: '⚪ Empty',
    },

    // ── Group info error ──────────────────────────────────────────────────
    groupInfoError: {
        ar: '❌ حصل مشكلة في جلب معلومات المجموعة!',
        en: '❌ Failed to get group info!',
    },

    // ── Alive error ───────────────────────────────────────────────────────
    aliveError: {
        ar: '🤖 البوت شغال ومتصل!',
        en: '🤖 Bot is active and online!',
    },
    aliveFeatures: {
        ar: '• إدارة المجموعات\n• حماية من اللينكات\n• أوامر ممتعة 🎮\n• تحميل وذكاء اصطناعي 🤖\n• وأكتر! 🚀',
        en: '• Group Management\n• Antilink Protection\n• Fun Commands 🎮\n• Downloader & AI 🤖\n• And more! 🚀',
    },
    aliveMenuHint: {
        ar: 'اكتب *.اوامر* عشان تشوف كل الأوامر',
        en: 'Type *.menu* for full command list',
    },

    // ── New keys for main.js bilingual migration ────────────────────────────
    weatherNoCity: {
        ar: '❌ اكتب اسم المدينة!\nمثال: .طقس مصر',
        en: '❌ Please specify a city!\nExample: .weather London',
    },
    modeUsage: {
        ar: '📌 *استخدام الأمر:*\n.mode public – عام (للجميع)\n.mode private – خاص (للمالك بس)',
        en: '📌 *Usage:*\n.mode public – Allow everyone\n.mode private – Owner only',
    },
    guessLetter: {
        ar: '❌ اكتب حرف!\nمثال: .guess ا',
        en: '❌ Please guess a letter!\nExample: .guess a',
    },
    tttInvalidMove: {
        ar: '❌ الحركة مش صحيحة! اختار رقم من 1 لـ 9.',
        en: '❌ Invalid move! Choose a number from 1 to 9.',
    },
    triviaProvideAnswer: {
        ar: '❌ اكتب الإجابة!\nمثال: .answer cairo',
        en: '❌ Please provide an answer!\nExample: .answer cairo',
    },
    pmBlocked: {
        ar: '❌ الرسائل الخاصة مقفولة. كلمني في الجروب.',
        en: '❌ Private messages are blocked. Contact me in groups.',
    },
    muteInvalidDuration: {
        ar: '❌ اكتب رقم صحيح للدقائق أو استخدم .mute بدون رقم عشان الكتم الفوري.',
        en: '❌ Please provide a valid number of minutes or use .mute with no number to mute immediately.',
    },
    modeStatusInfo: {
        ar: (isPublic) => `📍 الوضع الحالي: *${isPublic ? 'عام' : 'خاص'}*\n\n${msg('modeUsage')}`,
        en: (isPublic) => `📍 Current mode: *${isPublic ? 'public' : 'private'}*\n\n${msg('modeUsage')}`,
    },
}

// ---------------------------------------------------------------------------
// Core language functions
// ---------------------------------------------------------------------------

/**
 * Read current language from disk. Falls back to "ar".
 * @returns {"ar"|"en"}
 */
function getLang() {
    try {
        const raw = fs.readFileSync(LANG_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data.lang === 'en' || data.lang === 'ar') return data.lang;
    } catch (_) {
        // file missing or corrupt → create with default
        _ensureFile();
    }
    return 'ar';
}

/**
 * Set the bot language.
 * @param {"ar"|"en"} lang
 * @returns {boolean} true if saved successfully
 */
function setLang(lang) {
    const normalized = lang === 'en' ? 'en' : 'ar';
    try {
        _ensureDir();
        fs.writeFileSync(LANG_FILE, JSON.stringify({ lang: normalized }, null, 2));
        return true;
    } catch (err) {
        console.error('[lang] Error saving language:', err);
        return false;
    }
}

/**
 * Resolve an alias (Arabic or English) to the canonical base command.
 * Supports flexible matching:
 *   - Exact: `.منشنالكل` → `.tagall`
 *   - Spaced: `.منشن الكل` → `.tagall`  (spaces stripped)
 *   - Underscore: `.رفع_ادمن` → `.promote`  (underscores stripped)
 *   - Mixed: `.رفع ادمن` → `.promote`   (spaces stripped)
 *   - With args: `.gpt سلام` → `.gpt سلام` (args preserved)
 *
 * @param {string} cmd – e.g. ".طرد" → ".kick", ".help" → ".help"
 * @returns {string}
 */
function getCommandAlias(cmd) {
    if (!cmd || !cmd.startsWith('.')) return cmd;

    // 1. Exact match on full string
    if (ARABIC_ALIASES[cmd]) return ARABIC_ALIASES[cmd];

    // 2. Split command part from arguments
    const spaceIdx = cmd.indexOf(' ');
    const cmdPart = spaceIdx > 0 ? cmd.substring(0, spaceIdx) : cmd;
    const args = spaceIdx > 0 ? cmd.substring(spaceIdx) : '';

    // 3. Exact match on command part
    if (ARABIC_ALIASES[cmdPart]) {
        return ARABIC_ALIASES[cmdPart] + args;
    }

    // 4. Strip all spaces, underscores, dashes
    const normalized = cmdPart.replace(/[\s_\-]/g, '');
    if (ARABIC_ALIASES[normalized]) {
        return ARABIC_ALIASES[normalized] + args;
    }

    // 5. Replace spaces with underscores (alias may have _)
    const spacedToUnderscore = cmdPart.replace(/\s+/g, '_');
    if (ARABIC_ALIASES[spacedToUnderscore]) {
        return ARABIC_ALIASES[spacedToUnderscore] + args;
    }

    // 6. No match
    return cmd;
}

/**
 * Return a translated message for the given key.
 * Supports both static strings and functions (for parameterised messages).
 *
 * @param {string} key – key inside LANG_MESSAGES
 * @param  {...any} args – forwarded if the value is a function
 * @returns {string}
 */
function msg(key, ...args) {
    const entry = LANG_MESSAGES[key];
    if (!entry) return `[missing: ${key}]`;

    const lang = getLang();
    const value = entry[lang] || entry.ar;

    return typeof value === 'function' ? value(...args) : value;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _ensureDir() {
    const dir = path.dirname(LANG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function _ensureFile() {
    _ensureDir();
    if (!fs.existsSync(LANG_FILE)) {
        fs.writeFileSync(LANG_FILE, JSON.stringify({ lang: 'ar' }, null, 2));
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    getLang,
    setLang,
    getCommandAlias,
    msg,
    LANG_MESSAGES,
    ARABIC_ALIASES,
};
