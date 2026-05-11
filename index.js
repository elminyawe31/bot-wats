/**
 * ELMINYAWE Bot - A WhatsApp Bot
 * Copyright (c) 2024 Yaseen ELMINYAWE
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 *
 * Credits:
 * - Baileys Library by @whiskeysockets (v7 latest)
 * - Pair Code implementation inspired by TechGod143 & DGXEON
 * - Developer: Yaseen ELMINYAWE
 */

// ═══════════════════════════════════════════════════════════════════════
//  1. FIX ENOSPC on hosted panels — redirect /tmp to local directory
// ═══════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const localTemp = path.join(__dirname, 'temp');
if (!fs.existsSync(localTemp)) fs.mkdirSync(localTemp, { recursive: true });
process.env.TMPDIR = localTemp;
process.env.TEMP = localTemp;
process.env.TMP = localTemp;

// ═══════════════════════════════════════════════════════════════════════
//  2. AUTO SYSTEM CHECK on startup
// ═══════════════════════════════════════════════════════════════════════
const os = require('os');

console.log('\n');
console.log('╔══════════════════════════════════════════════╗');
console.log('║  🤖 ELMINYAWE Bot — System Check            ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// Check Node.js version
const nodeVersion = process.version;
const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
console.log(`${nodeOk ? '✅' : '❌'} Node.js: ${nodeVersion} ${nodeOk ? '(Required 18+)' : '(⚠️ Needs update to 18+)'}`);

// Check system resources
const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
console.log(`✅ RAM: ${freeMemGB} GB available / ${totalMemGB} GB total`);

// Check essential directories
const dirs = ['session', 'sessions', 'data', 'temp'];
for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`⚙️ Created directory: ${dir}/`);
    } else {
        console.log(`✅ Directory: ${dir}/`);
    }
}

// Check essential data files
const dataFiles = ['data/messageCount.json', 'data/banned.json', 'data/botLang.json', 'data/jadibot.json', 'data/owner.json'];
for (const file of dataFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, '{}', 'utf-8');
        console.log(`⚙️ Created file: ${file}`);
    } else {
        console.log(`✅ File: ${file}`);
    }
}

// Check if master session exists
const masterCreds = path.join(process.cwd(), 'session', 'creds.json');
const isFirstRun = !fs.existsSync(masterCreds);
if (isFirstRun) {
    console.log('');
    console.log('🆕 First run detected — Will generate Pairing Code after connection...');
} else {
    console.log('');
    console.log('✅ Master session found — Connecting...');
}

console.log('');
console.log('══════════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════════════════════════════════
//  3. MODULE IMPORTS
// ═══════════════════════════════════════════════════════════════════════
require('./settings')
const { Boom } = require('@hapi/boom')
const chalk = require('chalk')
const FileType = require('file-type')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// ═══════════════════════════════════════════════════════════════════════
//  4. LIGHTWEIGHT STORE SETUP
// ═══════════════════════════════════════════════════════════════════════
const store = require('./lib/lightweight_store')

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// ═══════════════════════════════════════════════════════════════════════
//  5. GLOBAL VARIABLES & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

// Set global.phoneNumber from settings.ownerNumber
let phoneNumber = settings.ownerNumber
global.phoneNumber = settings.ownerNumber

let ownerData = JSON.parse(fs.readFileSync('./data/owner.json'))
let owner = Array.isArray(ownerData) ? ownerData[0] : (typeof ownerData === 'object' ? (ownerData.number || ownerData.owner || settings.ownerNumber) : String(ownerData))

global.botname = "Yaseen ELMINYAWE"
global.themeemoji = "•"
const usePairingCode = true; // Always use pairing code (no QR)
const useMobile = process.argv.includes("--mobile")

// Browser descriptor for anti-ban
const BROWSER_DESCRIPTOR = ["Ubuntu", "Chrome", "20.0.04"]

// ── Retry counter ────────────────────────────────────────────────────
let connectionRetryCount = 0;
const MAX_RETRIES = 10;

// ── Pairing code request state ──────────────────────────────────────
let pairingCodeRequested = false;
let pairingCodeRetries = 0;
const MAX_PAIRING_RETRIES = 3;

// ── 401 retry counter ──────────────────────────────────────────────
let unauthorizedRetryCount = 0;
const MAX_UNAUTHORIZED_RETRIES = 3;

// ═══════════════════════════════════════════════════════════════════════
//  6. MEMORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

// Garbage collection every 60 seconds
setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Garbage collection completed')
    }
}, 60_000)

// Configurable RAM threshold (MB) for auto-restart
const RAM_RESTART_THRESHOLD = settings.ramRestartThreshold || 400;

// RAM monitoring — restart if > 400MB
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > RAM_RESTART_THRESHOLD) {
        console.log(`⚠️ RAM usage too high (>${RAM_RESTART_THRESHOLD}MB, actual: ${used.toFixed(1)}MB), restarting bot...`)
        process.exit(1)
    }
}, 30_000)

// Periodic RAM usage logging (every 5 minutes)
setInterval(() => {
    const mem = process.memoryUsage();
    const usedMB = (mem.rss / 1024 / 1024).toFixed(1);
    const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
    console.log(`📊 Memory: RSS=${usedMB}MB, Heap=${heapMB}/${heapTotalMB}MB`);
}, 5 * 60 * 1000)

// Cleanup old temp files every 3 hours (remove files older than 1 hour)
setInterval(() => {
    const tempDirs = [path.join(__dirname, 'temp'), path.join(__dirname, 'tmp')];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const dir of tempDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            const files = fs.readdirSync(dir);
            let cleaned = 0;
            for (const file of files) {
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.mtimeMs < oneHourAgo) {
                        fs.unlinkSync(filePath);
                        cleaned++;
                    }
                } catch {}
            }
            if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} old temp files from ${path.basename(dir)}/`);
        } catch {}
    }
}, 3 * 60 * 60 * 1000)

// ═══════════════════════════════════════════════════════════════════════
//  7. READLINE (for interactive phone number input)
// ═══════════════════════════════════════════════════════════════════════
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber)
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  8. validatePhoneNumber() — bilingual Arabic/English error messages
// ═══════════════════════════════════════════════════════════════════════
/**
 * Validate and display phone number info using awesome-phonenumber.
 * Returns cleaned number if valid, null otherwise.
 */
function validatePhoneNumber(rawNumber) {
    // Clean: keep only digits
    const cleaned = String(rawNumber).replace(/[^0-9]/g, '');

    if (cleaned.length < 10) {
        console.log(chalk.red(`❌ رقم قصير جداً: "${cleaned}" (${cleaned.length} digits) — لازم 10 أرقام على الأقل`));
        console.log(chalk.red(`   Number too short: "${cleaned}" (${cleaned.length} digits) — need at least 10`));
        return null;
    }

    if (cleaned.length > 16) {
        console.log(chalk.red(`❌ رقم طويل جداً: "${cleaned}" (${cleaned.length} digits) — الحد الأقصى 16 رقم`));
        return null;
    }

    const pn = PhoneNumber('+' + cleaned);
    const isValid = pn.isValid();

    console.log(chalk.cyan(''));
    console.log(chalk.cyan('━━━ Phone Number Validation ━━━'));
    console.log(chalk.cyan(`  Raw input:  "${rawNumber}"`));
    console.log(chalk.cyan(`  Cleaned:    "${cleaned}"`));
    console.log(chalk.cyan(`  With +:     "+${cleaned}"`));

    try {
        const regionCode = pn.getRegionCode();
        const countryName = pn.regionNames?.[regionCode] || regionCode;
        const international = pn.getNumber('international') || `+${cleaned}`;
        const national = pn.getNumber('national') || cleaned;

        console.log(chalk.cyan(`  Country:    ${countryName} (${regionCode})`));
        console.log(chalk.cyan(`  Intl format: ${international}`));
        console.log(chalk.cyan(`  National:    ${national}`));
        console.log(chalk.cyan(`  Valid:       ${isValid ? '✅ YES' : '❌ NO'}`));
    } catch (e) {
        console.log(chalk.yellow(`  Country:    (could not determine)`));
        console.log(chalk.cyan(`  Valid:       ${isValid ? '✅ YES (per awesome-phonenumber)' : '⚠️ UNKNOWN'}`));
    }

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan(''));

    if (!isValid) {
        console.log(chalk.red('❌ الرقم غير صالح أو مش مسجل على واتساب!'));
        console.log(chalk.red('   Invalid number or not registered on WhatsApp!'));
        console.log('');
        console.log(chalk.yellow('📌 تأكد إن الرقم في settings.js صح:'));
        console.log(chalk.yellow('   Make sure the number in settings.js is correct:'));
        console.log(chalk.yellow('   Examples:'));
        console.log(chalk.yellow('   🇪🇬 Egypt:   "201012345678"'));
        console.log(chalk.yellow('   🇸🇦 KSA:     "966501234567"'));
        console.log(chalk.yellow('   🇦🇪 UAE:     "971501234567"'));
        console.log(chalk.yellow('   🇲🇦 Morocco: "212601234567"'));
        console.log(chalk.yellow('   🇮🇶 Iraq:    "9647701234567"'));
        console.log(chalk.yellow('   🇯🇴 Jordan:  "962790123456"'));
        console.log(chalk.yellow('   🇩🇿 Algeria: "213550123456"'));
        console.log(chalk.yellow('   🇹🇳 Tunisia: "21620123456"'));
        console.log(chalk.yellow('   🇱🇧 Lebanon: "96171123456"'));
        console.log(chalk.yellow('   🇾🇪 Yemen:   "967711234567"'));
        console.log(chalk.yellow('   🇸🇩 Sudan:   "249901234567"'));
        console.log(chalk.yellow(''));
        console.log(chalk.yellow('⚠️ WITHOUT + or spaces! Just the country code + number.'));
        return null;
    }

    return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════
//  9. requestPairingWithRetry() — decorative pairing code box display
// ═══════════════════════════════════════════════════════════════════════
/**
 * Request pairing code with retry logic.
 * Called AFTER the WebSocket connection is established (inside 'connecting' event).
 */
async function requestPairingWithRetry(sock, botPhoneNumber, keepAliveInterval) {
    // Validate the phone number
    const validatedNumber = validatePhoneNumber(botPhoneNumber);
    if (!validatedNumber) {
        console.log(chalk.red('❌ Could not validate phone number. Please fix settings.js'));
        return false;
    }

    const finalNumber = validatedNumber;

    console.log(chalk.green(`📱 Pairing code will be generated for: +${finalNumber}`));
    console.log(chalk.yellow('⏳ WebSocket connected! Requesting pairing code now...'));
    console.log('');

    // Wait for the connection to fully stabilize
    // This is CRITICAL — Baileys needs time to complete the WebSocket handshake
    console.log(chalk.dim('   ⏳ Waiting 5 seconds for connection to fully stabilize...'));
    await delay(5000);

    for (let attempt = 1; attempt <= MAX_PAIRING_RETRIES; attempt++) {
        try {
            console.log(chalk.cyan(`   📤 Attempt ${attempt}/${MAX_PAIRING_RETRIES}: Sending pairing request for +${finalNumber}...`));

            let code = await sock.requestPairingCode(finalNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;

            console.log('');
            console.log(chalk.green('╔════════════════════════════════════════════════════╗'));
            console.log(chalk.green('║     🔑  ELMINYAWE BOT — PAIRING CODE  🔑          ║'));
            console.log(chalk.green('╠════════════════════════════════════════════════════╣'));
            console.log(chalk.green('║                                                      ║'));
            console.log(chalk.green('║  Number: ') + chalk.white(`+${finalNumber}`) + chalk.green('                              ║'));
            console.log(chalk.green('║  Code:   ') + chalk.black.bgGreen(`  ${code}  `) + chalk.green('                              ║'));
            console.log(chalk.green('║                                                      ║'));
            console.log(chalk.green('╠════════════════════════════════════════════════════╣'));
            console.log(chalk.green('║  📱 Open WhatsApp on the phone with number:         ║'));
            console.log(chalk.green('║     ') + chalk.white.bold(`+${finalNumber}`));
            console.log(chalk.green('║                                                      ║'));
            console.log(chalk.green('║  ⚙️  Go to Settings > Linked Devices                ║'));
            console.log(chalk.green('║  ➕  Tap "Link a Device"                             ║'));
            console.log(chalk.green('║  🔤  Enter the code (WITHOUT dashes):               ║'));
            console.log(chalk.green('║     ') + chalk.yellow.bold(code.replace(/-/g, '')));
            console.log(chalk.green('║                                                      ║'));
            console.log(chalk.green('║  ⚠️  IMPORTANT:                                     ║'));
            console.log(chalk.green('║  • The code expires in ~60 seconds!                  ║'));
            console.log(chalk.green('║  • Enter it on the SAME phone as the number above   ║'));
            console.log(chalk.green('║  • Do NOT stop the server!                          ║'));
            console.log(chalk.green('║                                                      ║'));
            console.log(chalk.green('║  ❌ If you get "couldn\'t link device":              ║'));
            console.log(chalk.green('║  → The phone number doesn\'t match!                  ║'));
            console.log(chalk.green('║  → Edit settings.js and fix ownerNumber             ║'));
            console.log(chalk.green('║  → Delete session/ folder and restart               ║'));
            console.log(chalk.green('╚════════════════════════════════════════════════════╝'));
            console.log('');
            pairingCodeRequested = true;
            return true;
        } catch (error) {
            const statusCode = error?.output?.statusCode;
            const errorMsg = error?.message || 'Unknown error';
            console.error(chalk.red(`   ❌ Attempt ${attempt} failed: ${errorMsg}` + (statusCode ? ` (Code: ${statusCode})` : '')));

            if (statusCode === 428) {
                console.error(chalk.yellow('   ⚠️ 428 = Connection not ready. Will retry after longer delay...'));
            } else if (statusCode === 515) {
                console.error(chalk.red('   ❌ 515 = Too many linked devices. Remove a device from WhatsApp first.'));
                return false;
            } else if (statusCode === 409) {
                console.error(chalk.red('   ❌ 409 = Conflict. A connection already exists. Try again later.'));
                return false;
            } else if (statusCode === 401) {
                console.error(chalk.red('   ❌ 401 = Unauthorized. The number might be banned or invalid.'));
                return false;
            } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT')) {
                console.error(chalk.yellow('   ⚠️ Network error. Check your internet connection.'));
            }

            if (attempt < MAX_PAIRING_RETRIES) {
                const waitTime = attempt * 8000; // 8s, 16s
                console.log(chalk.yellow(`   ⏳ Retrying in ${waitTime/1000}s...`));
                await delay(waitTime);
            }
        }
    }

    console.error(chalk.red('   ❌ All pairing code attempts failed.'));
    console.error(chalk.red(''));
    console.error(chalk.red('   Possible solutions:'));
    console.error(chalk.red('   1. Check that ownerNumber in settings.js is EXACTLY your WhatsApp number'));
    console.error(chalk.red('   2. Format: country_code + number, NO + or spaces (e.g., "201012345678")'));
    console.error(chalk.red('   3. Delete the session/ folder and restart'));
    console.error(chalk.red('   4. Make sure you have a stable internet connection'));
    console.error(chalk.red('   5. Try again in a few minutes'));
    console.error(chalk.red('   6. Remove extra linked devices from WhatsApp Settings'));
    return false;
}

// ═══════════════════════════════════════════════════════════════════════
//  10. MAIN BOT FUNCTION — startXeonBotInc()
// ═══════════════════════════════════════════════════════════════════════
async function startXeonBotInc() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        console.log(chalk.dim(`   📦 Baileys version: ${version} (latest: ${isLatest})`));

        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        // ── isFirstRun re-detection: check creds.json existence on each call ──
        const currentIsFirstRun = !fs.existsSync(path.join(process.cwd(), 'session', 'creds.json'));

        // ── Keepalive timer: prevents Katabump/server timeout during pairing ──
        let keepAliveCount = 0;
        const keepAliveInterval = setInterval(() => {
            keepAliveCount++;
            process.stdout.write(`.`);
            if (keepAliveCount % 10 === 0) {
                console.log('');
                console.log(chalk.dim(`⏳ Keepalive active — waiting... (${Math.floor(keepAliveCount * 15 / 60)}min elapsed)`));
            }
        }, 15000);

        // ══════════════════════════════════════════════════════════════════
        //  BAILEYS SOCKET CREATION (Baileys socket with ELMINYAWE options)
        // ══════════════════════════════════════════════════════════════════
        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: BROWSER_DESCRIPTOR,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 120000,
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 5000,
            maxMsgRetryCount: 5,
            connectionTimeoutMs: 60_000,
        })

        // Save credentials when they update (with process.nextTick for safety)
        XeonBotInc.ev.on('creds.update', (creds) => {
            process.nextTick(() => saveCreds(creds));
        })

        store.bind(XeonBotInc.ev)

        // ══════════════════════════════════════════════════════════════════
        //  EVENT HANDLERS ()
        // ══════════════════════════════════════════════════════════════════

        // ── messages.upsert ────────────────────────────────────────────
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                // Fix ephemeralMessage wrapper without mutating original
                let msg = mek.message;
                if (Object.keys(msg)[0] === 'ephemeralMessage') {
                    msg = msg.ephemeralMessage.message;
                    chatUpdate.messages[0] = { ...mek, message: msg };
                }
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear()
                }

                try {
                    await handleMessages(XeonBotInc, chatUpdate, true)
                } catch (err) {
                    console.error("[Messages] Error in handleMessages:", err)
                    if (mek.key && mek.key.remoteJid) {
                        await XeonBotInc.sendMessage(mek.key.remoteJid, {
                            text: '❌ An error occurred while processing your message.',
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363193862622642@newsletter',
                                    newsletterName: 'ELMINYAWE',
                                    serverMessageId: -1
                                }
                            }
                        }).catch(console.error);
                    }
                }
            } catch (err) {
                console.error("[Messages] Error in messages.upsert:", err)
            }
        })

        // ── decodeJid ─────────────────────────────────────────────────
        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        // ── contacts.update ────────────────────────────────────────────
        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        // ── getName ────────────────────────────────────────────────────
        XeonBotInc.getName = (jid, withoutContact = false) => {
            id = XeonBotInc.decodeJid(jid)
            withoutContact = XeonBotInc.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
                XeonBotInc.user :
                (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        XeonBotInc.public = true
        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

        // ══════════════════════════════════════════════════════════════════
        //  🔑 PAIRING CODE — EVENT-DRIVEN APPROACH
        //  Wait for the 'connecting' event (WebSocket UP) before requesting
        //  the pairing code. This prevents 428 errors.
        // ══════════════════════════════════════════════════════════════════

        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s

            // ── Step 1: WebSocket connected → Request pairing code ─────────
            if (connection === 'connecting') {
                console.log(chalk.yellow('🔄 WebSocket connected to WhatsApp servers!'));

                // If first run and we need a pairing code, request it NOW
                if (usePairingCode && !pairingCodeRequested && !XeonBotInc.authState.creds.registered) {
                    if (useMobile) {
                        console.error(chalk.red('❌ Cannot use pairing code with mobile api'));
                        clearInterval(keepAliveInterval);
                        process.exit(1);
                    }

                    const botPhoneNumber = String(global.phoneNumber).replace(/[^0-9]/g, '');
                    const success = await requestPairingWithRetry(XeonBotInc, botPhoneNumber, keepAliveInterval);

                    if (!success) {
                        console.error(chalk.red('❌ Could not get pairing code. The bot will try to reconnect...'));
                    }
                } else if (XeonBotInc.authState.creds.registered) {
                    console.log(chalk.green('✅ Session exists — authenticating...'));
                    clearInterval(keepAliveInterval);
                }
            }

            // ── Step 2: Connection OPEN — ELMINYAWE branding ─────────────
            if (connection == "open") {
                connectionRetryCount = 0;
                pairingCodeRequested = false;
                unauthorizedRetryCount = 0;
                clearInterval(keepAliveInterval);
                console.log('');

                console.log(chalk.magenta(`🌿 Connected successfully!`));
                console.log(chalk.yellow(`   User: ` + JSON.stringify(XeonBotInc.user, null, 2)));

                try {
                    const { initJadibot, setHandleMessages, setHandleGroupParticipantUpdate, getJadibotList, startJadibot } = require('./lib/jadibot');
                    initJadibot(XeonBotInc);
                    // Register handleMessages so sub-bots can process commands
                    setHandleMessages(handleMessages);
                    // Register handleGroupParticipantUpdate so sub-bots handle group events (welcome/goodbye)
                    setHandleGroupParticipantUpdate(handleGroupParticipantUpdate);
                    console.log('[Jadibot] ✅ All handlers registered for sub-bots (messages + group events).');

                    // ── AUTO-RECONNECT saved sub-bots ───────────────────────
                    try {
                        const savedBots = getJadibotList();
                        const botsToReconnect = savedBots.filter(b =>
                            (b.status === 'connected' || b.status === 'disconnected') &&
                            b.number && b.number.length >= 10
                        );

                        if (botsToReconnect.length > 0) {
                            console.log(`[Jadibot] 🔄 Found ${botsToReconnect.length} saved sub-bot(s). Auto-reconnecting...`);

                            for (let i = 0; i < botsToReconnect.length; i++) {
                                const bot = botsToReconnect[i];
                                const sessionPath = path.join(process.cwd(), 'sessions', bot.number);
                                const credsPath = path.join(sessionPath, 'creds.json');

                                // Only reconnect if session files exist
                                if (fs.existsSync(credsPath)) {
                                    try {
                                        console.log(`[Jadibot] 🔄 Reconnecting sub-bot ${i + 1}/${botsToReconnect.length}: ${bot.number}...`);
                                        await delay(3000); // Stagger reconnections by 3s to avoid rate limits
                                        await startJadibot(bot.number, bot.chatId);
                                        console.log(`[Jadibot] ✅ Reconnect initiated for ${bot.number}`);
                                    } catch (err) {
                                        console.error(`[Jadibot] ❌ Failed to reconnect ${bot.number}: ${err.message}`);
                                    }
                                } else {
                                    console.log(`[Jadibot] ⚠️ Skipping ${bot.number} — no session files found at ${sessionPath}`);
                                }
                            }

                            console.log(`[Jadibot] ✅ Auto-reconnect complete for ${botsToReconnect.length} sub-bot(s).`);
                        } else {
                            console.log('[Jadibot] ℹ️ No saved sub-bots to auto-reconnect.');
                        }
                    } catch (autoErr) {
                        console.error('[Jadibot] Auto-reconnect error:', autoErr.message);
                    }
                } catch (e) {
                    console.error('[Jadibot] Failed to initialize:', e.message);
                }

                // ── Set global bot start time for uptime ────────────────
                if (!global.botStartTime) {
                    global.botStartTime = Date.now();
                }

                // ── Startup message to bot's own chat ──────────────────
                try {
                    const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                    await XeonBotInc.sendMessage(botNumber, {
                        text: `🤖 تم توصيل الروبوت بنجاح\n\n⏰ وقت: ${new Date().toLocaleString()}\n✅ الحالة: متصل وجاهز!\n\n✅ تأكد من الانضمام إلى القناة أدناه\nhttps://whatsapp.com/channel/0029Va8zF8cDuMRi7HAK1D1y`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363193862622642@newsletter',
                                newsletterName: 'ELMINYAWE',
                                serverMessageId: -1
                            }
                        }
                    });
                    console.log('[Connection] Startup message sent to bot chat.');
                } catch (error) {
                    console.error('[Connection] Error sending startup message:', error.message)
                }

                // ── Send session files on first connection ──────────────
                try {
                    const { sendSessionFiles } = require('./lib/jadibot');
                    const masterSessionPath = path.join(process.cwd(), 'session');
                    const botNumberClean = XeonBotInc.user.id.split(':')[0];
                    if (fs.existsSync(path.join(masterSessionPath, 'creds.json'))) {
                        console.log('[Connection] Sending master session files...');
                        await delay(3000);
                        await sendSessionFiles(XeonBotInc, masterSessionPath, botNumberClean);
                        console.log('[Connection] Master session files sent successfully.');
                    }
                } catch (sessionErr) {
                    console.error('[Connection] Error sending session files:', sessionErr.message);
                }

                // ── ELMINYAWE console banner ───────────────────────────
                await delay(1999)
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ Yaseen ELMINYAWE ]`)}\n\n`))
                console.log(chalk.cyan(`< ================================================== >`))
                console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: Developer Yaseen ELMINYAWE`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: ELMINYAWE`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: The developer Yaseen ELMINYAWE`))
                console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot connected successfully! ✅`))
                console.log(chalk.blue(`Bot Version: ${settings.version}`))
            }

            // ── Step 3: Connection CLOSED — Smart retry logic ────────────
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const errorMsg = lastDisconnect?.error?.message || 'Unknown error'

                const isLoggedOut = statusCode === DisconnectReason.loggedOut
                const isUnauthorized = statusCode === 401

                console.log(chalk.red(`\n══════════════════════════════════════════════`));
                console.log(chalk.red(`Connection closed!`));
                console.log(chalk.red(`  Status Code: ${statusCode || 'N/A'}`));
                console.log(chalk.red(`  Error: ${errorMsg}`));
                console.log(chalk.red(`  isFirstRun: ${currentIsFirstRun}`));
                console.log(chalk.red(`  Retry count: ${connectionRetryCount}/${MAX_RETRIES}`));
                console.log(chalk.red(`══════════════════════════════════════════════\n`));

                if (isLoggedOut || isUnauthorized) {
                    if (!currentIsFirstRun) {
                        // IMPORTANT: Do NOT delete session files on 401 immediately!
                        // app-state-sync files are required for authentication.
                        // We retry 3 times WITHOUT deleting, then clear and auto-restart.
                        if (isLoggedOut) {
                            console.log(chalk.yellow('[Session] Actual logout detected — session expired or revoked.'));
                            try {
                                const sessionDir = './session';
                                if (fs.existsSync(sessionDir)) {
                                    fs.rmSync(sessionDir, { recursive: true, force: true });
                                    fs.mkdirSync(sessionDir, { recursive: true });
                                }
                                console.log(chalk.yellow('[Session] Session folder cleared. Please re-authenticate.'));
                            } catch (error) {
                                console.error('[Session] Error clearing session:', error)
                            }
                            clearInterval(keepAliveInterval);
                            console.log(chalk.red('[Session] Please re-scan QR or re-enter pairing code after restart.'));
                            return;
                        }

                        // ── Smart 401 handling ──────────────────────────
                        // Retry 3 times WITHOUT deleting files.
                        // After 3 failed attempts, clear all files and auto-restart.
                        if (isUnauthorized) {
                            unauthorizedRetryCount++;

                            if (unauthorizedRetryCount < MAX_UNAUTHORIZED_RETRIES) {
                                console.log(chalk.yellow(`[Session] 401 Unauthorized — retrying WITHOUT deleting session files...`));
                                console.log(chalk.yellow(`[Session] Keeping all session files intact (app-state-sync, etc.)`));
                                console.log(chalk.yellow(`[Session] Attempt ${unauthorizedRetryCount}/${MAX_UNAUTHORIZED_RETRIES}`));
                                clearInterval(keepAliveInterval);

                                if (connectionRetryCount < MAX_RETRIES) {
                                    connectionRetryCount++;
                                    const retryDelay = Math.min(5000 * Math.pow(1.5, connectionRetryCount), 60_000);
                                    console.log(chalk.yellow(`[Session] Reconnecting in ${retryDelay/1000}s... (${connectionRetryCount}/${MAX_RETRIES})`));
                                    await delay(retryDelay);
                                    startXeonBotInc();
                                }
                                return;
                            } else {
                                // Max 401 retries reached — clear all files and auto-restart
                                console.log(chalk.red(`[Session] 401 Unauthorized — max retries (${MAX_UNAUTHORIZED_RETRIES}) reached.`));
                                console.log(chalk.red(`[Session] Clearing ALL session files and auto-restarting...`));
                                console.log(chalk.red(`[Session] This will trigger a fresh pairing code on restart.`));
                                try {
                                    const sessionDir = './session';
                                    if (fs.existsSync(sessionDir)) {
                                        fs.rmSync(sessionDir, { recursive: true, force: true });
                                        fs.mkdirSync(sessionDir, { recursive: true });
                                    }
                                    console.log(chalk.yellow('[Session] ✅ Session folder cleared successfully.'));
                                } catch (error) {
                                    console.error('[Session] Error clearing session:', error)
                                }
                                clearInterval(keepAliveInterval);
                                // Auto-restart the process — the fresh startXeonBotInc call
                                // will detect isFirstRun=true and generate a new pairing code
                                console.log(chalk.green('[Session] Auto-restarting bot for fresh pairing...'));
                                await delay(3000);
                                startXeonBotInc();
                                return;
                            }
                        }
                    } else {
                        console.log(chalk.yellow('[Session] First run — pairing failed. Session preserved.'));
                        console.log(chalk.yellow('[Session] TIP: Check that ownerNumber in settings.js matches your WhatsApp number!'));
                    }
                }

                // ── RETRY ──
                connectionRetryCount++;
                pairingCodeRequested = false;

                const shouldRetry = !isLoggedOut || currentIsFirstRun;
                if (shouldRetry && connectionRetryCount <= MAX_RETRIES) {
                    const retryDelay = Math.min(1000 * Math.pow(2, connectionRetryCount), 60_000); // exponential backoff, max 60s
                    console.log(chalk.yellow(`[Connection] Retry ${connectionRetryCount}/${MAX_RETRIES} in ${retryDelay/1000}s...`));
                    await delay(retryDelay)
                    startXeonBotInc()
                } else if (connectionRetryCount > MAX_RETRIES) {
                    console.log(chalk.red(`[Connection] Max retries reached. Stopping.`));
                    console.log(chalk.red(`Possible solutions:`));
                    console.log(chalk.red(`  1. Delete session/ folder: rm -rf session/`));
                    console.log(chalk.red(`  2. Check internet connection`));
                    console.log(chalk.red(`  3. Make sure number ${global.phoneNumber} is correct in settings.js`));
                    console.log(chalk.red(`  4. The number must be: country_code + phone, NO + or spaces`));
                    console.log(chalk.red(`  5. Remove extra linked devices from WhatsApp`));
                    console.log(chalk.red(`  6. Wait a few minutes and try again`));
                    clearInterval(keepAliveInterval);
                } else {
                    clearInterval(keepAliveInterval);
                }
            }
        })

        // ══════════════════════════════════════════════════════════════════
        //  ANTICALL HANDLER ()
        // ══════════════════════════════════════════════════════════════════
        const antiCallNotified = new Set();

        XeonBotInc.ev.on('call', async (calls) => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall');
                const state = readAnticallState();
                if (!state.enabled) return;
                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;
                    try {
                        try {
                            if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                                await XeonBotInc.rejectCall(call.id, callerJid);
                            } else if (typeof XeonBotInc.sendCallOfferAck === 'function' && call.id) {
                                await XeonBotInc.sendCallOfferAck(call.id, callerJid, 'reject');
                            }
                        } catch {}

                        if (!antiCallNotified.has(callerJid)) {
                            antiCallNotified.add(callerJid);
                            setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                            console.log(`[Anticall] Blocked call from ${callerJid}`);
                            await XeonBotInc.sendMessage(callerJid, {
                                text: '📵 Anticall is enabled. Your call was rejected and you will be blocked.',
                                contextInfo: {
                                    forwardingScore: 1,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: '120363193862622642@newsletter',
                                        newsletterName: 'ELMINYAWE',
                                        serverMessageId: -1
                                    }
                                }
                            });
                        }
                    } catch {}
                    setTimeout(async () => {
                        try { await XeonBotInc.updateBlockStatus(callerJid, 'block'); } catch {}
                    }, 800);
                }
            } catch (e) {}
        });

        // ══════════════════════════════════════════════════════════════════
        //  GROUP PARTICIPANTS UPDATE
        // ══════════════════════════════════════════════════════════════════
        XeonBotInc.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(XeonBotInc, update);
        });

        // ══════════════════════════════════════════════════════════════════
        //  STATUS EVENT HANDLERS
        // ══════════════════════════════════════════════════════════════════
        XeonBotInc.ev.on('messages.upsert', async (m) => {
            if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, m);
            }
        });

        XeonBotInc.ev.on('status.update', async (status) => {
            await handleStatus(XeonBotInc, status);
        });

        XeonBotInc.ev.on('messages.reaction', async (status) => {
            await handleStatus(XeonBotInc, status);
        });

        return XeonBotInc
    } catch (error) {
        console.error('[Startup] Error in startXeonBotInc:', error)
        if (connectionRetryCount < MAX_RETRIES) {
            connectionRetryCount++;
            pairingCodeRequested = false;
            console.log(chalk.yellow(`[Startup] Retrying in 5s... (${connectionRetryCount}/${MAX_RETRIES})`));
            await delay(5000)
            startXeonBotInc()
        } else {
            console.error(chalk.red('[Startup] Max retries reached. Cannot start bot.'));
            process.exit(1);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  11. SIGINT / SIGTERM HANDLERS — graceful shutdown
// ═══════════════════════════════════════════════════════════════════════
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    try {
        const { stopAllJadibots } = require('./lib/jadibot')
        await stopAllJadibots()
    } catch (e) {}
    process.exit(0)
})

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    try {
        const { stopAllJadibots } = require('./lib/jadibot')
        await stopAllJadibots()
    } catch (e) {}
    process.exit(0)
})

// ═══════════════════════════════════════════════════════════════════════
//  12. UNCAUGHT EXCEPTION / UNHANDLED REJECTION
// ═══════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
    console.error('[Error] Uncaught Exception:', err)
    // Log memory context for debugging
    try {
        const mem = process.memoryUsage();
        console.error(`[Error] Memory at crash: RSS=${(mem.rss/1024/1024).toFixed(1)}MB, Heap=${(mem.heapUsed/1024/1024).toFixed(1)}MB`)
    } catch {}
    // Attempt recovery: force GC and continue
    if (global.gc) {
        try { global.gc(); } catch {}
    }
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Error] Unhandled Rejection:', reason)
    // Log memory context for debugging
    try {
        const mem = process.memoryUsage();
        console.error(`[Error] Memory at rejection: RSS=${(mem.rss/1024/1024).toFixed(1)}MB, Heap=${(mem.heapUsed/1024/1024).toFixed(1)}MB`)
    } catch {}
})

// ═══════════════════════════════════════════════════════════════════════
//  13. HOT RELOAD via fs.watchFile
// ═══════════════════════════════════════════════════════════════════════
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`[Hot Reload] File updated: ${__filename}`))
    delete require.cache[file]
    require(file)
})

// ═══════════════════════════════════════════════════════════════════════
//  14. START THE BOT
// ═══════════════════════════════════════════════════════════════════════
startXeonBotInc().catch(error => {
    console.error('[Fatal] Startup failed:', error)
    process.exit(1)
})
