// bot.js
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { enviarMenuPrincipal } = require('./menus');
const security = require('./security');
const handlers = require('./handlers');

let sock = null; // guarda a instância do socket

const atendimentos = {};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log('⚠️ Conexão fechada:', reason);
            startBot(); // reconecta
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }
    });

    sock.ev.on('messages.upsert', async (msgUpdate) => {
        const messages = msgUpdate.messages;
        if (!messages) return;

        for (const msg of messages) {
            if (!msg.message || !msg.key.remoteJid) continue;
            const jid = msg.key.remoteJid;
            const msgContent = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            console.log(`📨 Mensagem recebida de ${jid}: ${msgContent}`);

            if (!security.isGreenlisted(jid)) {
                console.log(`❌ [SECURITY] Usuário ${jid} não está na greenlist.`);
                continue;
            }

            if (!atendimentos[jid]) {
                atendimentos[jid] = {
                    ativo: true,
                    fase: 'menu_principal',
                    aparelho: null,
                    ultimaInteracao: new Date(),
                    ultimoTeste: null
                };
            }

            const comando = msgContent.trim();

            try {
                switch (atendimentos[jid].fase) {
                    case 'menu_principal':
                        await handlers.handleMenuPrincipal(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_aparelho':
                        await handlers.handleSubmenuAparelho(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_smarttv':
                        await handlers.handleSubmenuSmartTV(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_celular':
                        await handlers.handleSubmenuCelular(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_teste':
                        await handlers.handleSubmenuTeste(sock, jid, comando, atendimentos);
                        break;
                    default:
                        atendimentos[jid].fase = 'menu_principal';
                        await enviarMenuPrincipal(sock, jid);
                        break;
                }
            } catch (error) {
                console.error('❌ Erro no handler:', error);
                await sock.sendMessage(jid, { text: '❌ Ocorreu um erro. Digite "Menu" para voltar ao início.' });
            }
        }
    });
}

// Função para pegar o socket
function getSock() {
    return sock;
}

module.exports = { startBot, getSock };
