// bot.js
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const pino = require('pino'); // logs limpos
const security = require('./security');
const handlers = require('./handlers');
const { enviarMenuPrincipal } = require('./menus');

// Guarda o estado dos atendimentos
const atendimentos = {};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
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

            // Security: verifica greenlist
            if (!security.isGreenlisted(jid)) {
                console.log(`❌ [SECURITY] Usuário ${jid} não está na greenlist.`);
                continue;
            }

            // Inicializa atendimento se não existir
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

            // Checa fase do usuário e chama handler correto
            try {
                switch (atendimentos[jid].fase) {
                    case 'menu_principal':
                        await handlers.menu_principal(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_aparelho':
                        await handlers.submenu_aparelho(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_smarttv':
                        await handlers.submenu_smarttv(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_celular':
                        await handlers.submenu_celular(sock, jid, comando, atendimentos);
                        break;
                    case 'submenu_teste':
                        await handlers.submenu_teste(sock, jid, comando, atendimentos);
                        break;
                    default:
                        // Se fase inválida, volta ao menu principal
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

startBot();
