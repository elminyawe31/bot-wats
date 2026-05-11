const settings = require("../settings");

// Global bot start time (set when bot first connects)
if (!global.botStartTime) {
    global.botStartTime = Date.now();
}

/**
 * Format milliseconds to human-readable uptime string (Arabic)
 */
function formatUptime(ms) {
    if (!ms || ms < 0) return '—';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ثانية`);
    return parts.join('، ');
}

async function aliveCommand(sock, chatId, message) {
    try {
        const uptimeMs = Date.now() - global.botStartTime;
        const uptimeStr = formatUptime(uptimeMs);
        const startTime = new Date(global.botStartTime).toLocaleString();

        const message1 = `*🤖 ELMINYAWE is Active!*\n\n` +
                       `*Version:* ${settings.version}\n` +
                       `*Status:* Online\n` +
                       `*Mode:* Public\n` +
                       `*Uptime:* ${uptimeStr}\n` +
                       `*Since:* ${startTime}\n\n` +
                       `*🌟 Features:*\n` +
                       `• Group Management\n` +
                       `• Antilink Protection\n` +
                       `• AI ChatGPT\n` +
                       `• Sub-bots (Jadibot)\n` +
                       `• Fun Commands\n` +
                       `• Downloader\n` +
                       `• And more!\n\n` +
                       `Type *.menu* for full command list`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: 'Bot is alive and running!' }, { quoted: message });
    }
}

module.exports = aliveCommand;
