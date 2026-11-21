const settings = require('../../settings');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../../lib/logger');

// 🩺 USE THE FFMPEG YOU ALREADY HAVE INSTALLED
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

async function generateTTS(text) {
    try {
        const ttsUrl = `https://translate.google.com/translate_tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text.substring(0, 200))}`;
        const audio = await axios.get(ttsUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return audio.data ? Buffer.from(audio.data) : null;
    } catch (err) {
        logger.error(`[TTS] ${err.message}`);
        return null;
    }
}

async function combineAudioBuffers(audioBuffers) {
    return new Promise((resolve) => {
        if (audioBuffers.length === 0) return resolve(null);
        
        const tempDir = path.join(process.cwd(), 'data', 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const inputFiles = audioBuffers.map((buf, i) => {
            const file = path.join(tempDir, `audio_${Date.now()}_${i}.mp3`);
            fs.writeFileSync(file, buf);
            return file;
        });
        
        const concatFile = path.join(tempDir, `concat_${Date.now()}.txt`);
        const concatContent = inputFiles.map(f => `file '${f}'`).join('\n');
        fs.writeFileSync(concatFile, concatContent);
        
        const args = [
            '-hide_banner', '-loglevel', 'error',
            '-f', 'concat', '-safe', '0', '-i', concatFile,
            '-c', 'copy', '-f', 'mp3', 'pipe:1'
        ];
        
        const ff = spawn(ffmpegPath, args);
        const chunks = [];
        
        ff.stdout.on('data', c => chunks.push(c));
        ff.on('error', () => {
            inputFiles.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
            try { fs.unlinkSync(concatFile); } catch (_) {}
            resolve(null);
        });
        ff.on('close', code => {
            inputFiles.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
            try { fs.unlinkSync(concatFile); } catch (_) {}
            if (code !== 0 || chunks.length === 0) return resolve(null);
            resolve(Buffer.concat(chunks));
        });
        ff.stdin.on('error', () => {});
        ff.stdin.end();
    });
}

function transcodeMp3ToOpus(mp3Buffer) {
    return new Promise((resolve) => {
        const args = [
            '-hide_banner', '-loglevel', 'error',
            '-i', 'pipe:0', '-vn',
            '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '1',
            '-f', 'ogg', 'pipe:1'
        ];
        const ff = spawn(ffmpegPath, args);
        const chunks = [];
        ff.stdout.on('data', c => chunks.push(c));
        ff.on('error', () => resolve(null));
        ff.on('close', code => {
            if (code !== 0 || chunks.length === 0) return resolve(null);
            resolve(Buffer.concat(chunks));
        });
        ff.stdin.on('error', () => {});
        ff.stdin.end(mp3Buffer);
    });
}

async function downloadAudio(url) {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!res.data || res.data.length < 512) return null;
        return Buffer.from(res.data);
    } catch (err) {
        logger.error(`[Audio Download] ${err.message}`);
        return null;
    }
}

module.exports = {
    name: 'dictionary',
    aliases: ['dict', 'define', 'meaning'],
    category: 'tools',
    description: 'Get word definitions and phonetics with audio',
    usage: '.dictionary <word>',
    react: '📖',

    async execute(conn, mek, args, chatId) {
        const word = args[0]?.trim().toLowerCase();
        
        if (!word) {
            return conn.sendMessage(chatId, { 
                text: `╭─❍ *DICTIONARY*\n│\n│ ⚉ *Usage:* ${settings.prefix}dictionary <word>\n│\n│ ✪ *Examples:*\n│ ${settings.prefix}dictionary hello\n│ ${settings.prefix}dictionary love\n│\n│ 📖 *Free Dictionary API*\n╰──────────────────\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '📖', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📖 *Searching for "${word}"...*` }, { quoted: mek });

        try {
            const res = await axios.get(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
                { timeout: 10000, headers: { 'Accept': 'application/json' } }
            );

            const data = res.data?.[0];
            if (!data) {
                await conn.sendMessage(chatId, { react: { text: '❔', key: mek.key } });
                return conn.sendMessage(chatId, { text: `❔ No definition found for "${word}".` }, { quoted: mek });
            }

            const phonetics = data.phonetics?.map(p => p.text).filter(Boolean).join(', ') || 'N/A';
            const audioUrl = data.phonetics?.find(p => p.audio)?.audio || '';

            const meaning = data.meanings?.[0];
            const partOfSpeech = meaning?.partOfSpeech || 'N/A';
            const definition = meaning?.definitions?.[0]?.definition || 'No definition';
            const example = meaning?.definitions?.[0]?.example || 'No example';
            const synonyms = meaning?.synonyms?.slice(0, 5).join(', ') || 'None';
            const antonyms = meaning?.antonyms?.slice(0, 5).join(', ') || 'None';

            let responseText = `╭─❍ *DICTIONARY*\n│\n`;
            responseText += `│ 📖 *Word:* ${data.word}\n`;
            responseText += `│ 🔊 *Phonetic:* ${phonetics}\n`;
            responseText += `│ 📝 *Type:* ${partOfSpeech}\n│\n`;
            responseText += `│ 📚 *Definition:*\n│ ${definition}\n│\n`;
            responseText += `│ 💬 *Example:*\n│ ${example}\n│\n`;
            responseText += `│ 🟢 *Synonyms:*\n│ ${synonyms}\n│\n`;
            responseText += `│ 🔴 *Antonyms:*\n│ ${antonyms}\n│\n`;
            responseText += `╰──────────────────\n\n${settings.footer}`;

            await conn.sendMessage(chatId, { text: responseText }, { quoted: mek });

            // Generate voice pronunciation
            if (audioUrl) {
                try {
                    const pronunciationAudio = await downloadAudio(audioUrl);
                    if (pronunciationAudio && pronunciationAudio.length > 0) {
                        const audioBuffers = [pronunciationAudio];
                        
                        const definitionTTS = await generateTTS(`Definition: ${definition}`);
                        if (definitionTTS) audioBuffers.push(definitionTTS);
                        
                        let finalAudio = audioBuffers.length > 1 
                            ? await combineAudioBuffers(audioBuffers)
                            : pronunciationAudio;
                        
                        if (!finalAudio) finalAudio = pronunciationAudio;
                        
                        const opus = await transcodeMp3ToOpus(finalAudio);
                        
                        if (opus && opus.length > 0) {
                            await conn.sendMessage(chatId, {
                                audio: opus,
                                mimetype: 'audio/ogg; codecs=opus',
                                fileName: `${data.word}_definition.ogg`,
                                ptt: true // Voice note
                            }, { quoted: mek });
                        } else {
                            await conn.sendMessage(chatId, {
                                audio: finalAudio,
                                mimetype: 'audio/mpeg',
                                fileName: `${data.word}_definition.mp3`,
                                ptt: false
                            }, { quoted: mek });
                        }
                    }
                } catch (audioErr) {
                    logger.error(`[Audio Composition] ${audioErr.message}`);
                }
            }

            await conn.sendMessage(chatId, { react: { text: '✨', key: mek.key } });

        } catch (error) {
            logger.error(`[DICTIONARY] ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❔', key: mek.key } });
            await conn.sendMessage(chatId, { text: `❔ Failed to fetch definition. Please try again.` }, { quoted: mek });
        }
    }
};