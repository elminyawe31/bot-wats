const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╔═══════════════════╗
   *🤖 ${settings.botName || 'ELMINYAWE'}*  
   Version: *${settings.version || '4.0.0'}*
   by ${settings.botOwner || 'Yaseen ELMINYAWE'}
   YT : ${global.ytch}
╚═══════════════════╝

━━━ *القائمة العربية | Arabic Menu* ━━━

╔═══════════════════╗
🌐 *أوامر عامة | General Commands*:
║ ➤ .help أو .menu
║ ➤ .ping
║ ➤ .alive
║ ➤ .tts <نص>
║ ➤ .owner
║ ➤ .joke | .quote | .fact
║ ➤ .weather <مدينة>
║ ➤ .news
║ ➤ .attp <نص>
║ ➤ .lyrics <اسم أغنية>
║ ➤ .8ball <سؤال>
║ ➤ .groupinfo
║ ➤ .staff أو .admins 
║ ➤ .vv
║ ➤ .trt <نص> <لغة>
║ ➤ .ss <رابط>
║ ➤ .jid | .url
╚═══════════════════╝ 

╔═══════════════════╗
👮‍♂️ *أوامر الأدمن | Admin Commands*:
║ ➤ .ban @user | .promote @user
║ ➤ .demote @user | .kick @user
║ ➤ .mute <دقائق> | .unmute
║ ➤ .delete أو .del
║ ➤ .warnings @user | .warn @user
║ ➤ .antilink | .antibadword
║ ➤ .clear | .tag <رسالة>
║ ➤ .tagall | .tagnotadmin
║ ➤ .hidetag <رسالة>
║ ➤ .chatbot | .resetlink
║ ➤ .antitag <تشغيل/إيقاف>
║ ➤ .welcome <تشغيل/إيقاف>
║ ➤ .goodbye <تشغيل/إيقاف>
║ ➤ .setgdesc | .setgname
║ ➤ .setgpp (رد على صورة)
╚═══════════════════╝

╔═══════════════════╗
🔒 *أوامر المالك | Owner Commands*:
║ ➤ .mode <public/private>
║ ➤ .clearsession | .antidelete
║ ➤ .cleartmp | .update | .settings
║ ➤ .setpp <رد على صورة>
║ ➤ .autoreact | .autostatus
║ ➤ .autotyping | .autoread
║ ➤ .anticall | .pmblocker
║ ➤ .setmention <رد على رسالة>
║ ➤ .mention <تشغيل/إيقاف>
╚═══════════════════╝

━━━ *قائمة الأوامر الكاملة | Full Command List* ━━━

╔═══════════════════╗
🎨 *Image/Sticker Commands*:
║ ➤ .blur .simage .sticker
║ ➤ .removebg .remini .crop
║ ➤ .tgsticker .meme
║ ➤ .take <packname> 
║ ➤ .emojimix <emj1>+<emj2>
║ ➤ .igs .igsc <رابط>
╚═══════════════════╝  

╔═══════════════════╗
🖼️ *Pies Commands*:
║ ➤ .pies <country> .china 
║ ➤ .indonesia .japan .korea .hijab
╚═══════════════════╝

╔═══════════════════╗
🎮 *Game Commands*:
║ ➤ .tictactoe .hangman .guess
║ ➤ .trivia .answer .truth .dare
╚═══════════════════╝

╔═══════════════════╗
🤖 *ChatGPT*:
║ ➤ .gpt
╚═══════════════════╝

╔═══════════════════╗
🎯 *Fun Commands*:
║ ➤ .compliment .insult .flirt 
║ ➤ .shayari .goodnight .roseday
║ ➤ .character .wasted .ship
║ ➤ .simp .stupid
╚═══════════════════╝

╔═══════════════════╗
🔤 *Textmaker*:
║ ➤ .metallic .ice .snow .impressive
║ ➤ .matrix .light .neon .devil
║ ➤ .purple .thunder .leaves .1917
║ ➤ .arena .hacker .sand .blackpink
║ ➤ .glitch .fire
╚═══════════════════╝

╔═══════════════════╗
📥 *Downloader*:
║ ➤ .play .song .spotify
║ ➤ .instagram .facebook .tiktok
║ ➤ .video .ytmp4
╚═══════════════════╝

╔═══════════════════╗
🧩 *MISC*:
║ ➤ .heart .horny .circle .lgbt
║ ➤ .lolice .its-so-stupid
║ ➤ .namecard .oogway .tweet
║ ➤ .ytcomment .comrade .gay
║ ➤ .glass .jail .passed .triggered
╚═══════════════════╝

╔═══════════════════╗
🖼️ *ANIME*:
║ ➤ .nom .poke .cry .kiss
║ ➤ .pat .hug .wink .facepalm 
╚═══════════════════╝

╔═══════════════════╗
💻 *Github Commands:*
║ ➤ .git .github .sc .script .repo
╚═══════════════════╝

📢 *Telegram:* https://t.me/twsfd
📢 *WhatsApp:* https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363193862622642@newsletter',
                        newsletterName: 'ELMINYAWE Bot',
                        serverMessageId: -1
                    }
                }
            },{ quoted: message });
        } else {
            console.error('Bot image not found at:', imagePath);
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363193862622642@newsletter',
                        newsletterName: 'ELMINYAWE Bot',
                        serverMessageId: -1
                    } 
                }
            });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;
