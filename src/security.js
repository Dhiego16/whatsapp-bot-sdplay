// Middleware de segurança: limita spam, bloqueia flood e valida comandos
const userCommandTimestamps = {};
const blockedUsers = {};

// Greenlist dinâmica: números liberados podem ser alterados sem mudar o código
let greenlist = [
    '5562998577568@s.whatsapp.net' // Seu número liberado
];

// Configurações
const COMMAND_LIMIT_PER_MIN = 5; // máximo de comandos por minuto
const BLOCK_TIME_MS = 5 * 60 * 1000; // 5 minutos de bloqueio

function securityMiddleware(jid, comando) {
    const now = Date.now();

    // Log de acesso para números da greenlist
    if (greenlist.includes(jid)) {
        console.log(`🟢 [GREENLIST] Usuário ${jid} executou o comando: ${comando}`);
        return { allowed: true };
    }

    // Bloqueio temporário
    if (blockedUsers[jid] && blockedUsers[jid] > now) {
        return {
            allowed: false,
            message: '🚫 Você está bloqueado temporariamente por excesso de comandos. Tente novamente mais tarde.'
        };
    }

    // Controle de spam
    userCommandTimestamps[jid] = userCommandTimestamps[jid] || [];
    userCommandTimestamps[jid] = userCommandTimestamps[jid].filter(ts => now - ts < 60 * 1000);
    userCommandTimestamps[jid].push(now);

    if (userCommandTimestamps[jid].length > COMMAND_LIMIT_PER_MIN) {
        blockedUsers[jid] = now + BLOCK_TIME_MS;
        userCommandTimestamps[jid] = [];
        console.log(`⚠️ Usuário ${jid} bloqueado por spam.`);
        return {
            allowed: false,
            message: '⚠️ Você fez muitos comandos em pouco tempo. Bloqueado por 5 minutos.'
        };
    }

    // Validação básica do comando
    if (!comando || !/^[a-zA-Z0-9]/.test(comando)) {
        return {
            allowed: false,
            message: '❌ Comando inválido.'
        };
    }

    return { allowed: true };
}

// Funções auxiliares para manipular a greenlist
securityMiddleware.addToGreenlist = (jid) => {
    if (!greenlist.includes(jid)) {
        greenlist.push(jid);
        console.log(`🟢 Usuário ${jid} adicionado à greenlist.`);
    }
};

securityMiddleware.removeFromGreenlist = (jid) => {
    greenlist = greenlist.filter(user => user !== jid);
    console.log(`🔴 Usuário ${jid} removido da greenlist.`);
};

securityMiddleware.getGreenlist = () => [...greenlist];

module.exports = securityMiddleware;
