const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { startBot, getSock } = require('./bot');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const AUTH_DIR = './auth_test';
const RESET_TOKEN = process.env.RESET_TOKEN || '123456';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// ✅ NOVO: Keep alive para Render (CRÍTICO)
app.get('/keep-alive', (req, res) => {
    const sock = getSock();
    const status = sock ? 'connected' : 'disconnected';
    
    res.json({ 
        status: 'alive', 
        whatsapp: status,
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: Math.floor(process.uptime()) + 's'
    });
});

// ✅ NOVO: Health check detalhado
app.get('/health', (req, res) => {
    const { getFollowUpSystem } = require('./bot');
    const followUpSystem = getFollowUpSystem();
    
    const stats = followUpSystem ? followUpSystem.getEstatisticas() : null;
    
    res.json({
        server: 'ok',
        whatsapp: getSock() ? 'connected' : 'disconnected',
        followUp: stats,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// Rotas existentes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/status', (req, res) => {
    const sock = getSock();
    res.json({
        status: sock ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.get('/reset', (req, res) => {
    const token = req.query.token;
    
    if (token !== RESET_TOKEN) {
        return res.status(403).json({ 
            error: 'Acesso negado. Token inválido.' 
        });
    }

    try {
        const sock = getSock();
        if (sock) {
            sock.logout().catch(err => console.log('Erro ao fazer logout:', err));
        }

        setTimeout(() => {
            if (fs.existsSync(AUTH_DIR)) {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                console.log('✅ Sessão removida com sucesso');
                res.json({ 
                    success: true, 
                    message: 'Sessão removida. Reinicie o bot.' 
                });
            } else {
                res.json({ 
                    success: true, 
                    message: 'Nenhuma sessão existente.' 
                });
            }
        }, 1000);
    } catch (error) {
        console.error('Erro ao resetar sessão:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

// ✅ CRÍTICO: Auto ping para evitar sleep do Render
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    
    // Ping a cada 10 minutos para manter ativo
    setInterval(async () => {
        try {
            const response = await fetch(`${RENDER_URL}/keep-alive`);
            const data = await response.json();
            console.log(`🔄 Keep-alive ping: ${data.status} - WhatsApp: ${data.whatsapp}`);
        } catch (error) {
            console.error('❌ Erro no keep-alive:', error.message);
        }
    }, 10 * 60 * 1000); // 10 minutos
    
    console.log(`🚀 Keep-alive configurado para: ${RENDER_URL}`);
}

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
    });
});

// ✅ MELHORADO: Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error.message);
    // Não encerra o processo no Render
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

// ✅ MELHORADO: Log de inicialização
server.listen(PORT, () => {
    console.log('🌐 Servidor rodando em http://localhost:' + PORT);
    console.log('🔄 Reset: http://localhost:' + PORT + '/reset?token=' + RESET_TOKEN);
    console.log('📊 Health: http://localhost:' + PORT + '/health');
    console.log('💓 Keep-alive: http://localhost:' + PORT + '/keep-alive');
    
    if (process.env.RENDER_EXTERNAL_URL) {
        console.log('🚀 Render URL:', process.env.RENDER_EXTERNAL_URL);
    }
});

// Inicia o bot
startBot(io);
