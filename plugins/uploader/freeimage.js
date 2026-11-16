const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const logger = require('../../lib/logger');

// 🩺 SIZE GUARD: 100MB limit
const MAX_FILE_SIZE = 100 * 1024 * 1024;

async function saveMediaToTemp(mediaMessage, type) {
    const tmpDir = path.join(process.cwd(), 'data', 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'bin';
    const filePath = path.join(tmpDir, `${crypto.randomBytes(8).toString('hex')}.${ext}`);

    const stream = await downloadContentFromMessage(mediaMessage, type);
    const writeStream = fs.createWriteStream(filePath);
    let size = 0;

    for await (const chunk of stream) {
        size += chunk.length;
        if (size > MAX_FILE_SIZE) {
            writeStream.end();
            fs.unlinkSync(filePath);
            throw new Error("File too large (max 100MB)");
        }
        writeStream.write(chunk);
    }
    
    writeStream.end();
    await new Promise(r => writeStream.on('finish', r));
    return filePath;
}

// 🩺 FIXED COOKIE HANDLING
async function uploadToFreeImage(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://freeimage.host/api/1/upload', form, {
        headers: {
            ...form.getHeaders(),
            'Cookie': (res.headers['set-cookie'] || []).join('; ') 
        },
        params: { key: '6d207e02198a847aa98d0a2a901485a5' }
    });

    return res.data?.image?.url;
}

async function uploadToPostimages(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://postimages.org/json/rr', form, {
        headers: form.getHeaders()
    });

    return res.data?.url;
}

module.exports = {
    saveMediaToTemp,
    uploadToFreeImage,
    uploadToPostimages,
    MAX_FILE_SIZE
};