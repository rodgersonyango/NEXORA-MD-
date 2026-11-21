const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const API_BASE = 'https://api.omegatech.app/api/ai/Nicevoice';
const CATEGORIES = [
  { id: 'system', label: '🎙 System' },
  { id: 'anime', label: '🌸 Anime / Genshin' },
  { id: 'character', label: '🎬 Characters' },
  { id: 'celebrity', label: '⭐ Celebrity' },
  { id: 'assistant', label: '🤖 Assistants' },
  { id: 'all', label: '📚 All voices' }
];

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/di2a9lenz/image/upload/v1786909227/omegatech_ai_media/upload-1786909226872.jpg';

// Helper: Fetch voice list
async function getVoices(tag) {
    try {
        const params = { action: 'list' };
        if (tag && tag !== 'all') params.tag = tag;
        const res = await axios.get(API_BASE, { params });
        return res.data?.data?.voices || [];
    } catch (e) {
        logger.warn(`[TTS] Fetch voices failed: ${e.message}`);
        return [];
    }
}

// Helper: Start Generation
async function startTTS(text, referenceId) {
    try {
        const res = await axios.get(API_BASE, {
            params: { action: 'generate', text: text.slice(0, 200), referenceId, wait: 'false' }
        });
        if (!res.data?.success || !res.data?.data?.taskSn) return null;
        return res.data.data;
    } catch (e) { return null; }
}

// Helper: Poll Generation
async function pollTTS(taskSn, account, token) {
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2500));
        try {
            const res = await axios.get(API_BASE, {
                params: { action: 'result', taskSn, account, token, wait: 'false' }
            });
            if (res.data?.data?.audioUrl) return res.data.data.audioUrl;
        } catch (e) {}
    }
    return null;
}

module.exports = {
    name: 'tts',
    aliases: ['voice', 'speak'],
    category: 'tools',
    description: 'Generate AI voice notes',
    usage: '.tts <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');
        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide text.\nExample: ${settings.prefix}tts Hello world` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎙️ *Loading voices...*` }, { quoted: mek });

        try {
            // 1. Fetch voices
            const voices = await getVoices();
            if (!voices.length) throw new Error("No voices available from API.");

            // 2. Pick a random voice
            const voice = voices[Math.floor(Math.random() * voices.length)];
            const referenceId = voice.referenceId || voice.slug;

            await conn.sendMessage(chatId, { text: `🎙️ *Generating with voice:* ${voice.name}\n\n_Please wait..._` }, { quoted: mek });

            // 3. Start Generation
            const task = await startTTS(text, referenceId);
            if (!task) throw new Error("Failed to start generation.");

            // 4. Poll for result
            const audioUrl = await pollTTS(task.taskSn, task.account, task.token);
            if (!audioUrl) throw new Error("Voice generation timed out.");

            // 5. Download and send
            const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(audioRes.data);

            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: false, // Sending as normal audio so it doesn't fail
                fileName: `tts_${Date.now()}.mp3`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[TTS] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { text: `❌ TTS Error: ${error.message}` }, { quoted: mek });
        }
    }
};