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

// Rotas
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

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
    });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

// Inicia o servidor
server.listen(PORT, () => {
    console.log('🌐 Servidor rodando em http://localhost:' + PORT);
    console.log('🔄 Para resetar a sessão: http://localhost:' + PORT + '/reset?token=' + RESET_TOKEN);
    console.log('📊 Status da API: http://localhost:' + PORT + '/status');
});

// Inicia o bot
startBot(io);
