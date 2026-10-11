/**
 * NEXORA MD - Global Channel Branding
 * Adds the forwarded tag to every content message
 * Adds the "View Channel" button only to messages flagged with withChannel: true
 * Skips reactions, deletes, edits, polls, and chatbot_exempt messages
 */

const CHANNEL_MESSAGE_ID = 250; // from https://whatsapp.com/channel/0029VbCwZHACXC3PNHgtMT31/250

function wrapSend(baseSend, settings) {
  return async function(jid, content, options = {}) {
    try {
      const shouldWrap =
        content &&
        typeof content === 'object' &&
        !content.react &&
        !content.delete &&
        !content.protocolMessage &&
        !content.poll &&
        !content.pollCreationMessage &&
        !content.pollUpdateMessage &&
        !content.chatbot_exempt &&
        (content.text || content.image || content.video ||
         content.audio || content.document || content.caption);

      if (shouldWrap) {
        content.contextInfo = {
          ...(content.contextInfo || {}),
          forwardingScore: 999,
          isForwarded: true
        };

        if (content.withChannel === true) {
          content.contextInfo.forwardedNewsletterMessageInfo = {
            newsletterJid: settings.channelId,
            newsletterName: settings.channelName || 'NEXORA MD',
            serverMessageId: CHANNEL_MESSAGE_ID
          };
        }

        delete content.withChannel;
      }
    } catch (e) {
      console.log('[CHANNEL] Wrap failed:', e.message);
    }

    return baseSend(jid, content, options);
  };
}

function enableChannelBranding(sock, settings) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    console.log('[CHANNEL] Invalid socket, skipping branding');
    return;
  }

  const base = sock.sendMessage.bind(sock);
  sock.sendMessage = wrapSend(base, settings);

  console.log('[CHANNEL] Branding enabled');
}

module.exports = { enableChannelBranding, wrapSend };