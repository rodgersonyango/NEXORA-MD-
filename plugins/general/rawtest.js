module.exports = {
  name: 'rawtest',
  category: 'general',
  async execute(conn, mek, args, chatId) {
    const send = global.rawSendMessage || conn.sendMessage.bind(conn);
    await send(chatId, { text: 'Raw test message' });
  }
};