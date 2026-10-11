/**
 * NEXORA MD - Global Channel Branding
 * Adds the forwarded tag to every content message
 * Skips reactions, deletes, edits, polls, and chatbot_exempt messages
 */

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