/**
 * NEXORA MD - Global Channel Branding
 * Wraps sendMessage so every text/image/video message gets the forwarded tag
 * Skips messages flagged with chatbot_exempt (for AI replies)
 */

function enableChannelBranding(sock, settings) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    console.log('[CHANNEL] Invalid socket, skipping branding');
    return;
  }

  const original = sock.sendMessage.bind(sock);

  sock.sendMessage = async function(jid, content, options = {}) {
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
      }
    } catch (e) {
      console.log('[CHANNEL] Wrap failed:', e.message);
    }

    return original(jid, content, options);
  };

  console.log('[CHANNEL] Branding enabled (chatbot exempt)');
}

module.exports = { enableChannelBranding };