const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const AdminSystem = require('./admin');
const FollowUpSystem = require('./followup'); // NOVA LINHA
const followUpSystem = new FollowUpSystem();

// Função para expor em outros arquivos
function getFollowUpSystem() {
    return followUpSystem;
}

module.exports = { getFollowUpSystem };
const {
    enviarMenuPrincipal,
    handleMenuPrincipal,
    handleSubmenuAparelho,
    handleSubmenuSmartTV,
    handleSubmenuCelular,
    handleSubmenuTeste
} = require('./menus');

const AUTH_DIR = './auth_test';
let sock;
const atendimentos = {};
const adminSystem = new AdminSystem();
const followUpSystem = new FollowUpSystem(); // NOVA LINHA

// Mapeamento de handlers por fase
const handlers = {
    menu_principal: handleMenuPrincipal,
    submenu_aparelho: handleSubmenuAparelho,
    submenu_smarttv: handleSubmenuSmartTV,
    submenu_celular: handleSubmenuCelular,
    submenu_teste: handleSubmenuTeste
};

/**
 * Inicializa o bot do WhatsApp
 */
async function startBot(io) {
    try {
        console.log('🚀 Iniciando bot...');
        
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' })
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 QR Code gerado. Abra o navegador para escanear.');
                io.emit('qr', qr);
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                console.log('⚠️ Conexão fechada, reconectando:', shouldReconnect);
                
                if (shouldReconnect) {
                    setTimeout(() => startBot(io), 3000);
                } else {
                    console.log('❌ Você foi deslogado.');
                    io.emit('disconnected');
                }
            } else if (connection === 'open') {
                console.log('✅ Bot conectado com sucesso!');
                
                // Inicializar sistemas
                adminSystem.init(sock);
                followUpSystem.init(sock); // NOVA LINHA

                io.emit('connected');
            }
        });

        // Handler principal de mensagens
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const jid = msg.key.remoteJid;
            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const comando = texto.toLowerCase().trim();

            // NOVA FUNCIONALIDADE: Verificar comandos administrativos primeiro
            if (texto.startsWith('/')) {
                const isAdminCommand = await adminSystem.processarComando(sock, jid, texto);
                if (isAdminCommand) return; // Se foi comando admin, para aqui
            }

            // Se é grupo, não processa (só comandos admin em grupos)
            if (jid.endsWith('@g.us')) return;

            console.log(`📨 Mensagem recebida de ${jid}: ${comando}`);

            // Inicializa estado do cliente se não existir
            if (!atendimentos[jid]) {
                atendimentos[jid] = { 
                    ativo: true, 
                    fase: 'menu_principal',
                    aparelho: null,
                    ultimaInteracao: new Date()
                };
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
        setTimeout(() => startBot(io), 5000);
    }
}

/**
 * Função para limpar sessões antigas
 */
function limparSessoesAntigas() {
    const agora = new Date();
    const tempoLimite = 30 * 60 * 1000; // 30 minutos

    Object.keys(atendimentos).forEach(jid => {
        const ultimaInteracao = atendimentos[jid].ultimaInteracao;
        if (agora - ultimaInteracao > tempoLimite) {
            delete atendimentos[jid];
            console.log(`🧹 Sessão limpa para ${jid}`);
        }
    });
}

// Limpa sessões antigas a cada 10 minutos
setInterval(limparSessoesAntigas, 10 * 60 * 1000);

module.exports = { 
    startBot, 
    getSock: () => sock,
    getAtendimentos: () => atendimentos,
    getAdminSystem: () => adminSystem,
    getFollowUpSystem: () => followUpSystem // NOVA LINHA
};
