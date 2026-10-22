const settings = require('../../settings');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: 'url',
  aliases: ['tourl', 'upload'],
  category: 'tools',
  description: 'Convert media to a URL (hosted on Catbox)',
  usage: '.url (reply to media)',
  react: '🌐',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      // 1. Get quoted message
      const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please reply to an image, video, audio, or document to convert it into a URL.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // 2. Identify media type
      let mediaType = "";
      let mediaMessage = null;

      if (quoted.imageMessage) { mediaType = "image"; mediaMessage = quoted.imageMessage; }
      else if (quoted.videoMessage) { mediaType = "video"; mediaMessage = quoted.videoMessage; }
      else if (quoted.audioMessage) { mediaType = "audio"; mediaMessage = quoted.audioMessage; }
      else if (quoted.documentMessage) { mediaType = "document"; mediaMessage = quoted.documentMessage; }
      else {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Unsupported format. You can only convert Images, Videos, Audios, or Documents.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      const statusMsg = await conn.sendMessage(chatId, {
        text: `Downloading and uploading your file... Please wait.\n\n${settings.footer}`
      }, { quoted: mek });

      // 3. Download media
      const stream = await downloadContentFromMessage(mediaMessage, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 4. Get extension
      const mimeType = mediaMessage.mimetype || "";
      let extension = "bin";
      if (mimeType.includes("/")) {
        extension = mimeType.split("/")[1].split(";")[0];
      }

      // 5. Temp file
      const tempFilePath = path.join(__dirname, `..`, `..`, `data`, `tmp`, `temp_${Date.now()}.${extension}`);
      
      const tmpDir = path.dirname(tempFilePath);
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      fs.writeFileSync(tempFilePath, buffer);

      // 6. Upload to Catbox
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(tempFilePath));

      const response = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: { ...form.getHeaders() },
        timeout: 120000
      });

      // 7. Cleanup
      try { fs.unlinkSync(tempFilePath); } catch (e) {}

      if (response.data && response.data.startsWith("http")) {
        const successMsg =
          `MEDIA UPLOADED\n\n` +
          `Link: ${response.data.trim()}\n\n` +
          `Hosted via Catbox.moe\n\n` +
          `${settings.footer}`;

        await conn.sendMessage(chatId, { text: successMsg }, { quoted: mek });
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        
        // Try deleting the "Uploading..." status message
        try { await conn.sendMessage(chatId, { delete: statusMsg.key }); } catch (e) {}

      } else {
        throw new Error('Catbox API rejected the file upload.');
      }

    } catch (error) {
      console.log('[URL] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Failed to convert media: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};