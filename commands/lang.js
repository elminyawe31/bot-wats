/**
 * .lang / .لغة command – Switch bot language (owner only)
 *
 * Usage:
 *   .lang          → show current language
 *   .lang ar       → set Arabic
 *   .lang en       → set English
 *   .لغة           → show current language
 *   .لغة عربي      → set Arabic
 *   .لغة انجليزي   → set English
 */

const isOwnerOrSudo = require('../lib/isOwner');
const { getLang, setLang, msg } = require('../lib/lang');

// Map Arabic words to language codes
const ARABIC_LANG_MAP = {
    'عربي': 'ar',
    'مصري': 'ar',
    'عرب': 'ar',
    'arabic': 'ar',
    'انجليزي': 'en',
    'english': 'en',
    'انجليز': 'en',
};

async function langCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;

    // Owner-only check
    if (!message.key.fromMe) {
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: msg('ownerOnly'),
            }, { quoted: message });
            return;
        }
    }

    // Parse argument
    const body = (
        message.message?.conversation?.trim() ||
        message.message?.extendedTextMessage?.text?.trim() ||
        ''
    );

    // Extract everything after the command (e.g. ".lang ar" → "ar", ".لغة عربي" → "عربي")
    const arg = body.split(/\s+/).slice(1).join(' ').trim().toLowerCase();

    // No argument → show current language
    if (!arg) {
        const current = getLang();
        await sock.sendMessage(chatId, {
            text: msg('currentLang') + '\n\n' + msg('langUsage'),
        }, { quoted: message });
        return;
    }

    // Resolve language code
    let lang = null;

    if (arg === 'ar') lang = 'ar';
    else if (arg === 'en') lang = 'en';
    else if (ARABIC_LANG_MAP[arg]) lang = ARABIC_LANG_MAP[arg];

    if (!lang) {
        await sock.sendMessage(chatId, {
            text: msg('invalidLang') + '\n\n' + msg('langUsage'),
        }, { quoted: message });
        return;
    }

    // Toggle if same as current
    const current = getLang();
    if (lang === current) {
        // Toggle to the other
        lang = lang === 'ar' ? 'en' : 'ar';
    }

    // Save and respond
    setLang(lang);

    // Build response in the *new* language
    const response = lang === 'ar'
        ? '✅ تم تغيير اللغة إلى العربية 🇪🇬'
        : '✅ Language changed to English 🇬🇧';

    await sock.sendMessage(chatId, {
        text: response,
    }, { quoted: message });
}

module.exports = langCommand;
