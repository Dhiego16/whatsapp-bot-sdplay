// Middleware de segurança aprimorado
const userCommandTimestamps = {};
const blockedUsers = {};
const blockedHistory = {};

const COMMAND_LIMIT_PER_MIN = 5;       // Máx comandos por minuto
const BLOCK_TIME_MS = 5 * 60 * 1000;  // 5 minutos de bloqueio

function securityMiddleware(jid, comando, faseAtual = 'menu_principal') {
    const now = Date.now();

    // Bloqueio ativo?
    if (blockedUsers[jid] && blockedUsers[jid] > now) {
        return {
            allowed: false,
            message: '🚫 Você está bloqueado temporariamente por excesso de comandos. Tente novamente mais tarde.'
        };
    }

    // Inicializa histórico
    userCommandTimestamps[jid] = userCommandTimestamps[jid] || [];

    // Remove timestamps antigos (+1 min)
    userCommandTimestamps[jid] = userCommandTimestamps[jid].filter(ts => now - ts.time < 60 * 1000);

    // Bloqueio por comando repetido
    if (userCommandTimestamps[jid].slice(-3).every(c => c.comando === comando)) {
        return {
            allowed: false,
            message: '⚠️ Você está repetindo o mesmo comando. Espere um pouco.'
        };
    }

    // Adiciona o comando atual
    userCommandTimestamps[jid].push({ comando, time: now, fase: faseAtual });

    // Limites por fase
    const limits = {
        menu_principal: 5,
        submenu_teste: 3,
        submenu_aparelho: 4
    };
    const limit = limits[faseAtual] || COMMAND_LIMIT_PER_MIN;

    if (userCommandTimestamps[jid].length > limit) {
        blockedUsers[jid] = now + BLOCK_TIME_MS;

        // Histórico de bloqueios
        blockedHistory[jid] = blockedHistory[jid] || [];
        blockedHistory[jid].push({ time: now, fase: faseAtual, comando });

        userCommandTimestamps[jid] = [];
        return {
            allowed: false,
            message: '⚠️ Você fez muitos comandos em pouco tempo. Bloqueado por 5 minutos.'
        };
    }

    // Validação simples do comando
    if (!comando || !/^[a-zA-Z0-9]/.test(comando)) {
        return {
            allowed: false,
            message: '❌ Comando inválido.'
        };
    }

    return { allowed: true };
}

// Limpeza automática de timestamps antigos
setInterval(() => {
    const now = Date.now();
    Object.keys(userCommandTimestamps).forEach(jid => {
        userCommandTimestamps[jid] = userCommandTimestamps[jid].filter(ts => now - ts.time < 60 * 1000);
    });
}, 30000);

module.exports = securityMiddleware;
