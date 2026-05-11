/**
 * AI Command Handler — ChatGPT via OpenRouter
 * Uses OpenRouter API with ChatGPT model
 *
 * Commands:
 *   .gpt <question>  — Ask ChatGPT
 *
 * Developer: Yaseen ELMINYAWE
 */

const axios = require('axios');

const OPENROUTER_API_KEY = 'Add-API-OPENROUTER-Brooo';
const CHATGPT_MODEL = 'openai/gpt-oss-120b:free';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Conversation memory per chat (last 10 messages for context)
const conversationMemory = new Map();
const MAX_MEMORY = 10;

/**
 * Get or create conversation history for a chat
 */
function getConversation(chatId) {
    if (!conversationMemory.has(chatId)) {
        conversationMemory.set(chatId, []);
    }
    return conversationMemory.get(chatId);
}

/**
 * Add a message to conversation history
 */
function addToHistory(chatId, role, content) {
    const history = getConversation(chatId);
    history.push({ role, content });
    // Keep only last MAX_MEMORY messages
    if (history.length > MAX_MEMORY) {
        history.shift();
    }
}

async function aiCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: '🤖 *ChatGPT*\n\nاستخدم الأمر كالتالي:\n.gpt <سؤال>\n\n*مثال:* .gpt اكتب كود HTML بسيط',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true
                }
            }, { quoted: message });
        }

        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: '🤖 *ChatGPT*\n\nيرجى كتابة سؤال بعد الأمر\n\n*مثال:* .gpt ما هو الذكاء الاصطناعي؟',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true
                }
            }, { quoted: message });
        }

        if (command !== '.gpt') return;

        // Show processing reaction
        await sock.sendMessage(chatId, {
            react: { text: '🤖', key: message.key }
        });

        // Build conversation messages
        const history = getConversation(chatId);
        const messages = [
            {
                role: 'system',
                content: 'أنت مساعد ذكي يُدعى ChatGPT. أجب بوضوح ودقة. إذا كان السؤال بالعربية أجب بالعربية، وإذا كان بالإنجليزية أجب بالإنجليزية. كن مفيداً وموجزاً.'
            },
            ...history,
            { role: 'user', content: query }
        ];

        try {
            const response = await axios.post(API_URL, {
                model: CHATGPT_MODEL,
                messages: messages,
                max_tokens: 2048,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://elminyawe-bot.vercel.app',
                    'X-Title': 'ELMINYAWE Bot'
                },
                timeout: 45000
            });

            const answer = response.data?.choices?.[0]?.message?.content;

            if (!answer) {
                throw new Error('No response from ChatGPT');
            }

            // Save to conversation memory
            addToHistory(chatId, 'user', query);
            addToHistory(chatId, 'assistant', answer);

            // Send the response
            await sock.sendMessage(chatId, {
                text: `🤖 *ChatGPT*\n\n${answer}`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true
                }
            }, { quoted: message });

        } catch (apiError) {
            console.error('[ChatGPT] API Error:', apiError.message);

            const errMsg = apiError.response?.data?.error?.message || apiError.message;

            if (errMsg.includes('rate limit') || errMsg.includes('429')) {
                await sock.sendMessage(chatId, {
                    text: '⏳ *تم تجاوز حد الطلبات*\n\nانتظر قليلاً ثم حاول مرة أخرى.',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true
                    }
                }, { quoted: message });
            } else if (errMsg.includes('token') || errMsg.includes('auth')) {
                await sock.sendMessage(chatId, {
                    text: '❌ *خطأ في المصادقة*\n\nحدث خطأ في الاتصال بـ ChatGPT. يرجى المحاولة لاحقاً.',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true
                    }
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ *خطأ في ChatGPT*\n\nلم يتم الحصول على إجابة. حاول مرة أخرى لاحقاً.',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true
                    }
                }, { quoted: message });
            }
        }

    } catch (error) {
        console.error('[AI Command] Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *حدث خطأ غير متوقع*\n\nحاول مرة أخرى لاحقاً.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true
            }
        }, { quoted: message });
    }
}

module.exports = aiCommand;
