const settings = require('../../settings');

module.exports = {
  name: 'add2',
  aliases: ['addmember', 'add'],
  category: 'group',
  description: 'Add members to the group by phone number',
  usage: '.add2 2547XXXXXXXX, 2547YYYYYYYY',
  groupOnly: true,
  react: '➕',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      
      // 1. Check if sender is admin or owner
      const metadata = await conn.groupMetadata(chatId);
      const participants = metadata.participants;
      
      const senderParticipant = participants.find(p => p.id === sender);
      const senderIsAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';
      
      if (!senderIsAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is for Admins only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // 2. Check if bot is admin
      const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
      const botParticipant = participants.find(p => p.id === botNumber);
      const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

      if (!botIsAdmin) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `I cannot add members because I am not an Admin in this group.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // 3. Check for phone numbers
      if (!args[0]) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide the phone number(s) with country code.\n\nExample:\n.add2 254712345678\n.add2 254712345678, 254787654321\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // 4. Parse numbers
      let users = args.join(' ').replace(/[^0-9,]/g, '').split(',').map(v => v.trim()).filter(v => v.length > 5).map(v => v + '@s.whatsapp.net');

      if (users.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Invalid number format. Please use country codes without + or spaces.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      try {
        const res = await conn.groupParticipantsUpdate(chatId, users, "add");
        
        // Check results for privacy blocks
        let successCount = 0;
        let failedCount = 0;
        
        if (Array.isArray(res)) {
          res.forEach(r => {
            if (r.status === '200') successCount++;
            else failedCount++;
          });
        } else {
          successCount = users.length;
        }

        if (successCount > 0) {
          await conn.sendMessage(chatId, {
            text: `Successfully added ${successCount} member(s).\n\n${settings.footer}`
          }, { quoted: mek });
        }

        if (failedCount > 0) {
          await conn.sendMessage(chatId, {
            text: `Failed to add ${failedCount} member(s). They might have privacy settings enabled.\n\n${settings.footer}`
          }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

      } catch (e) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Failed to add members. The number(s) might be incorrect, or the users have privacy settings enabled.\n\n${settings.footer}`
        }, { quoted: mek });
      }

    } catch (error) {
      console.log('[ADD2] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};