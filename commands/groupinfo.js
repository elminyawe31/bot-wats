async function groupInfoCommand(sock, chatId, msg) {
    try {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        
        // Get group profile picture
        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            // No image, send text only
        }

        // Get admins from participants
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin);
        const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
        
        // Get group owner
        const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || chatId.split('-')[0] + '@s.whatsapp.net';

        // Create info text
        const text = `
┌──「 *INFO GROUP* 」
▢ *♻️ID:*
   • ${groupMetadata.id}
▢ *🔖NAME* : 
• ${groupMetadata.subject}
▢ *👥Members* :
• ${participants.length}
▢ *🤿Group Owner:*
• @${owner.split('@')[0]}
▢ *🕵🏻‍♂️Admins:*
${listAdmin}

▢ *📌Description* :
   • ${groupMetadata.desc?.toString() || 'No description'}
`.trim();

        // Send the message with image and mentions (fallback to text-only if no pp)
        if (pp) {
            await sock.sendMessage(chatId, {
                image: { url: pp },
                caption: text,
                mentions: [...groupAdmins.map(v => v.id), owner]
            });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                mentions: [...groupAdmins.map(v => v.id), owner]
            });
        }

    } catch (error) {
        console.error('Error in groupinfo command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to get group info!' });
    }
}

module.exports = groupInfoCommand; 