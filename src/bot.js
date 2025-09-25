const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const securityMiddleware = require('./security');
const handlers = require('./menus');
const { enviarMenuPrincipal } = require('./menus');

const SESSIONS_DIR = path.join(__dirname, '../auth_test');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const atendimentos = {};

let sockInstance = null;

function getSock() {
    return sockInstance;
}

async function startBot(io) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage ||
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = { viewOnceMessage: { message: { messageContextInfo: {}, ...message } } };
                }
                return message;
            }
        });
    }
} 

        sockInstance = sock;

        sock.ev.on('creds.update', saveCreds);

const atendimentos = {};

let sockInstance = null;

function getSock() {
    return sockInstance;
}

async function startBot(io) {
    try {
        const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith('session-') && f.endsWith('.json'));
        const sessionFile = sessionFiles.length > 0 ? path.join(SESSIONS_DIR, sessionFiles[0]) : path.join(SESSIONS_DIR, `session-${Date.now()}.json`);
        const { state, saveState } = useSingleFileAuthState(sessionFile);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage ||
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = { viewOnceMessage: { message: { messageContextInfo: {}, ...message } } };
                }
                return message;
            }
        });

        sockInstance = sock;

        sock.ev.on('creds.update', saveState);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                io.emit('qr', qr);
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                console.log('⚠️ Conexão fechada, reconectando:', shouldReconnect);
                
                if (shouldReconnect) {
                    setTimeout(() => startBot(io), 3000); // Aguarda 3s antes de reconectar
                } else {
                    console.log('❌ Você foi deslogado.');
                    io.emit('disconnected');
                }
            } else if (connection === 'open') {
                console.log('✅ Bot conectado com sucesso!');
                io.emit('connected');
            }
        });

        // Handler principal de mensagens
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const jid = msg.key.remoteJid;
            if (jid.endsWith('@g.us')) return;
            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const comando = texto.toLowerCase().trim();

            // --- SEGURANÇA ---
            const secCheck = securityMiddleware(jid, comando);
            if (!secCheck.allowed) {
                await sock.sendMessage(jid, { text: secCheck.message });
                return;
            }

            console.log(`📨 Mensagem recebida de ${jid}: ${comando}`);

            // Inicializa estado do cliente se não existir
            if (!atendimentos[jid]) {
                atendimentos[jid] = { 
                    ativo: true, 
                    fase: 'menu_principal',
                    aparelho: null,
                    ultimaInteracao: new Date()
                };
                // Primeira mensagem: envia menu direto, sem aviso de erro
                return await enviarMenuPrincipal(sock, jid);
            }

            // Atualiza última interação
            atendimentos[jid].ultimaInteracao = new Date();

            // Comando especial para reativar o bot
            if (!atendimentos[jid].ativo && comando === 'menu') {
                atendimentos[jid].ativo = true;
                atendimentos[jid].fase = 'menu_principal';
                return await enviarMenuPrincipal(sock, jid);
            }

            // Se o bot está desativado para este usuário, não responde
            if (!atendimentos[jid].ativo) return;

            // Comando especial para voltar ao menu principal
            if (comando === 'menu') {
                atendimentos[jid].fase = 'menu_principal';
                return await enviarMenuPrincipal(sock, jid);
            }

            // Executa o handler apropriado baseado na fase atual
            const fase = atendimentos[jid].fase;
            if (handlers[fase]) {
                try {
                    await handlers[fase](sock, jid, comando, atendimentos);
                } catch (error) {
                    console.error(`❌ Erro no handler ${fase}:`, error);
                    await sock.sendMessage(jid, { 
                        text: '❌ Ocorreu um erro. Digite "Menu" para recomeçar.' 
                    });
                }
            } else {
                console.warn(`⚠️ Handler não encontrado para fase: ${fase}`);
                await enviarMenuPrincipal(sock, jid);
            }
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar bot:', error);
        setTimeout(() => startBot(io), 5000); // Tenta novamente em 5s
    }
}

/**
 * Função para limpar sessões antigas (opcional)
 */
function limparSessoesAntigas() {
    const LIMITE_DIAS = 15;
    const agora = new Date();
    const arquivos = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith('session-') && f.endsWith('.json'));
    arquivos.forEach(arquivo => {
        const caminho = path.join(SESSIONS_DIR, arquivo);
        const stats = fs.statSync(caminho);
        const diffDias = Math.floor((agora - stats.mtime) / (1000 * 60 * 60 * 24));
        if (diffDias > LIMITE_DIAS) {
            fs.unlinkSync(caminho);
            console.log(`🧹 Sessão antiga removida: ${arquivo}`);
        }
    });
}

// Exporta funções
module.exports = {
    startBot,
    getSock,
    limparSessoesAntigas,
    atendimentos,
};
