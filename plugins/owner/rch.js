const settings = require('../../settings');
const axios = require('axios');
const crypto = require('crypto');
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/di2a9lenz/image/upload/v1786909227/omegatech_ai_media/upload-1786909226872.jpg';

async function sendVipReaction(channelUrl, emoji) {
  const apiUrl = `https://api.omegatech.app/api/Fun/Rch?action=react&url=${encodeURIComponent(channelUrl)}&emoji=${encodeURIComponent(emoji)}`;
  const { data } = await axios.get(apiUrl, { timeout: 120000 });
  if (!data.success) throw new Error('Reaction failed');
  return data.data;
}

async function sendRichResponse(conn, chatId, data, channelUrl, emoji, taggedUsers = []) {
  try {
    const messageSecret = crypto.randomBytes(32).toString('base64');
    const stanzaId = crypto.randomBytes(16).toString('hex').toUpperCase();
    const responseId = crypto.randomUUID();

    const time = data.time || '0ms';
    const message = data.message || 'Reaction queued';
    const taskId = data.task_id || 'N/A';
    const emojis = data.emojis || emoji;
    const vipKey = data.vip_key || 'N/A';
    const vipPackage = data.vip_package || 'VIP';
    const usageToday = data.usage_today || 0;
    const limit = data.limit || 50;
    const pointsRemaining = data.points_remaining || 0;

    let imageMessage;
    try {
      const imgResp = await axios.get(CLOUDINARY_IMAGE, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imgResp.data);
      const media = await prepareWAMessageMedia({ image: buffer }, { upload: conn.waUploadToServer });
      imageMessage = media.imageMessage;
    } catch (e) {}

    const responseData = {
      "response_id": responseId,
      "sections": [
        {
          "view_model": {
            "primitive": {
              "title": "VIP Reaction Sent!",
              "brand": "NEXORA MD",
              "price": "Success",
              "product_url": "https://wa.me/254755660053",
              "image": { "url": CLOUDINARY_IMAGE, "mime_type": "image/jpeg" },
              "additional_images": [],
              "__typename": "GenAIProductItemCardPrimitive"
            },
            "__typename": "GenAISingleLayoutViewModel"
          },
          "__typename": "GenAIUnifiedResponseSection"
        },
        {
          "view_model": {
            "primitive": {
              "text": `Reaction Queued Successfully!\n\nTarget: ${channelUrl}\nEmoji: ${emojis}\nTime: ${time}\nStatus: ${message}\nTask ID: ${taskId}\n\nVIP Details:\nKey: ${vipKey}\nPackage: ${vipPackage}\nUsage: ${usageToday}/${limit} today\nPoints: ${pointsRemaining.toLocaleString()}\n\nNote: Reactions are added to a queue and may take a few seconds to appear.`,
              "inline_entities": [],
              "__typename": "GenAIMarkdownTextUXPrimitive"
            },
            "__typename": "GenAISingleLayoutViewModel"
          },
          "__typename": "GenAIUnifiedResponseSection"
        },
        {
          "view_model": {
            "primitives": [
              {
                "__typename": "GenAI3PExtWidgetPrimitive",
                "header": {
                  "__typename": "GenAI3PExtWidgetStandardHeader",
                  "title": "NEXORA VIP"
                },
                "body": {
                  "__typename": "GenAI3PExtCalendarEventList",
                  "sections": [],
                  "ctas": [
                    {
                      "__typename": "GenAI3PExtWidgetCTA",
                      "label": "React Again",
                      "state": "PENDING",
                      "kind": "OTHER",
                      "tool_call_id": "00",
                      "toast": {
                        "__typename": "GenAI3PExtWidgetToast",
                        "label": "Send Another Reaction"
                      }
                    },
                    {
                      "__typename": "GenAI3PExtWidgetCTA",
                      "label": "Menu",
                      "state": "PENDING",
                      "kind": "OTHER",
                      "tool_call_id": "01",
                      "toast": {
                        "__typename": "GenAI3PExtWidgetToast",
                        "label": "Show Menu"
                      }
                    },
                    {
                      "__typename": "GenAI3PExtWidgetCTA",
                      "label": "Channel",
                      "state": "PENDING",
                      "kind": "OTHER",
                      "tool_call_id": "02",
                      "toast": {
                        "__typename": "GenAI3PExtWidgetToast",
                        "label": "Join Channel"
                      }
                    }
                  ]
                }
              },
              {
                "prompt_text": "NEXORA MD",
                "prompt_type": "SUGGESTED_PROMPT",
                "__typename": "GenAIFollowUpSuggestionPillPrimitive"
              },
              {
                "title": "NEXORA MD Bot",
                "brand": "Rodgers",
                "price": "v2.0",
                "sale_price": "Free",
                "product_url": "https://wa.me/254755660053",
                "image": { "url": CLOUDINARY_IMAGE },
                "additional_images": [{}],
                "__typename": "GenAIProductItemCardPrimitive"
              }
            ],
            "__typename": "GenAIHScrollLayoutViewModel"
          },
          "__typename": "GenAIUnifiedResponseSection"
        },
        {
          "view_model": {
            "primitive": {
              "text": `Join Our Channel:\n${settings.channelLink || 'https://whatsapp.com/channel/0029VbCwZHACXC3PNHgtMT31'}`,
              "inline_entities": [
                {
                  "key": "CI_0",
                  "metadata": {
                    "reference_id": 1,
                    "reference_url": settings.channelLink || 'https://whatsapp.com/channel/0029VbCwZHACXC3PNHgtMT31',
                    "reference_title": settings.channelName || 'NEXORA MD',
                    "reference_display_name": "Join Channel",
                    "sources": [],
                    "__typename": "GenAISearchCitationItem"
                  }
                }
              ],
              "__typename": "GenAIMarkdownTextUXPrimitive"
            },
            "__typename": "GenAISingleLayoutViewModel"
          },
          "__typename": "GenAIUnifiedResponseSection"
        }
      ]
    };

    if (imageMessage) {
      responseData.sections[0].view_model.primitive.image = imageMessage;
    }

    await conn.relayMessage(
      chatId,
      {
        senderKeyDistributionMessage: {
          groupId: settings.channelId || "120363425020013890@g.us",
          axolotlSenderKeyDistributionMessage: Buffer.from("Mwi6ieeLBxAHGiD/fbbPrF6NXxievrFYIENndR2KJc/bUm+NZ8Ihva8dGCIhBYacW+mUtF7tWBfr+yb2z1WQoIYpEj/chPPWWQm3j5El", "base64")
        },
        messageContextInfo: {
          messageSecret,
          botMetadata: {
            messageDisclaimerText: "VIP Reaction",
            botResponseId: responseId
          }
        },
        botForwardedMessage: {
          message: {
            richResponseMessage: {
              messageType: 1,
              unifiedResponse: {
                data: Buffer.from(JSON.stringify(responseData)).toString('base64')
              },
              contextInfo: {
                stanzaId,
                participant: conn.user.id.split(':')[0] + '@s.whatsapp.net',
                quotedMessage: {
                  extendedTextMessage: {
                    text: "VIP Reaction",
                    previewType: 0,
                    inviteLinkGroupTypeV2: 0
                  }
                },
                forwardingScore: 1,
                isForwarded: true,
                expiration: 7776000,
                forwardedAiBotMessageInfo: {
                  botJid: "867051314767696@bot"
                },
                forwardOrigin: 4,
                mentionedJid: taggedUsers,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: settings.channelId || '120363411498601038@newsletter',
                  serverMessageId: 250,
                  newsletterName: settings.channelName || 'NEXORA MD'
                }
              }
            }
          }
        }
      },
      {}
    );
    return true;
  } catch (e) {
    console.error('[RCH] Rich response error:', e);
    return false;
  }
}

module.exports = {
  name: 'rch',
  aliases: ['vipreact', 'react'],
  category: 'owner',
  description: 'Send VIP reactions to WhatsApp channel posts',
  usage: '.rch <channel_url> <emoji>',
  ownerOnly: true,
  react: '😁',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const text = args.join(' ');

      if (!text) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `VIP Reaction Bot\n\n` +
            `Send VIP reactions to WhatsApp channel posts.\n\n` +
            `Usage:\n` +
            `.rch <channel_url> <emoji>\n\n` +
            `Example:\n` +
            `.rch https://whatsapp.com/channel/xxx/123 😁\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
      if (!urlMatch) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a valid WhatsApp channel post URL.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const channelUrl = urlMatch[0];
      const rest = text.replace(channelUrl, '').trim();

      const emojiMatch = rest.match(/([\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u2600-\u26FF]|[\u2700-\u27BF])/u);

      let emoji = '😁';
      if (emojiMatch) {
        emoji = emojiMatch[0];
      } else if (rest) {
        emoji = rest.split(/\s+/)[0] || '😁';
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Sending VIP reaction...\n\nTarget: ${channelUrl}\nEmoji: ${emoji}\n\nThis may take 10-15 seconds...\n\n${settings.footer}`
      }, { quoted: mek });

      const result = await sendVipReaction(channelUrl, emoji);
      await sendRichResponse(conn, chatId, result, channelUrl, emoji, [mek.key.participant || mek.key.remoteJid]);
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      console.error('[RCH] Error:', e);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      await conn.sendMessage(chatId, {
        text: `Failed to send VIP reaction.\n\nError: ${e.message || 'Unknown error'}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};