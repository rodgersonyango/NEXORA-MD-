const CHANNEL_MESSAGE_ID = 250;

function wrapSend(baseSend, settings) {
  return async function(jid, content, options = {}) {
    try {
      const isTextOnly = content && typeof content === 'object' && content.text && content.text.trim().length > 0;
      
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
        isTextOnly;

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
      } else if (content && typeof content === 'object') {
        if (!content.react && !content.delete && !content.protocolMessage) {
          content.contextInfo = {
            ...(content.contextInfo || {}),
            forwardingScore: 999,
            isForwarded: true
          };
          delete content.withChannel;
        }
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