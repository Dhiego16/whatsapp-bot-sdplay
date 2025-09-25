const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const pino = require('pino'); // pra logs limpos
const security = require('./security');
const handlers = require('./handlers');
const { enviarMenuPrincipal } = require('./menus');

const SESSIONS_DIR = path.join(__dirname, '../auth_test');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const atendimentos = {};
let sockInstance = null;

// Greenlist - só pra referência inicial
const GREENLIST = ['62998577568'];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sockInstance = sock;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            console.log(`⚠️ Conexão fechada, reconectando: true`);
            startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        console.log(`📨 Mensagem recebida de ${from}: ${text}`);

        // Se for greenlist
        if (security.isGreen(from)) {
            console.log(`🟢 [GREENLIST] Usuário ${from} executou o comando: ${text}`);
        }

        // Comando de adicionar novo número à greenlist
        if (text?.startsWith('/addlist ')) {
            // só você pode usar
            if (from !== '556298577568@s.whatsapp.net') return;

            const novoNum = text.split(' ')[1];
            const completo = `${novoNum}@s.whatsapp.net`;

            if (security.addGreen(completo)) {
                await sock.sendMessage(from, { text: `✅ Número ${novoNum} adicionado à greenlist!` });
            } else {
                await sock.sendMessage(from, { text: `⚠️ Número ${novoNum} já está liberado.` });
            }
            return;
        }

        // Aqui chama handlers de outros comandos/menu
        handlers(msg, sock);
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
