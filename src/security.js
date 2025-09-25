// Middleware de segurança: limita spam, bloqueia flood e valida comandos
const userCommandTimestamps = {};
const blockedUsers = {};

const COMMAND_LIMIT_PER_MIN = 5; // número máximo de comandos por minuto
const BLOCK_TIME_MS = 5 * 60 * 1000; // 5 minutos de bloqueio

function securityMiddleware(jid, comando) {
    const now = Date.now();

    // Se o usuário está bloqueado, impede execução
    if (blockedUsers[jid] && blockedUsers[jid] > now) {
        return {
            allowed: false,
            message: '🚫 Você está bloqueado temporariamente por excesso de comandos. Tente novamente mais tarde.'
        };
    }

    // Registra timestamp dos comandos do usuário
    userCommandTimestamps[jid] = userCommandTimestamps[jid] || [];
    // Remove timestamps antigos (+ de 1 min)
    userCommandTimestamps[jid] = userCommandTimestamps[jid].filter(ts => now - ts < 60 * 1000);
    userCommandTimestamps[jid].push(now);

    // Verifica se ultrapassou o limite
    if (userCommandTimestamps[jid].length > COMMAND_LIMIT_PER_MIN) {
        blockedUsers[jid] = now + BLOCK_TIME_MS;
        userCommandTimestamps[jid] = [];
        return {
            allowed: false,
            message: '⚠️ Você fez muitos comandos em pouco tempo. Bloqueado por 5 minutos.'
        };
    }

    // Validação simples do comando (todos devem começar com letra ou número)
    if (!comando || !/^[a-zA-Z0-9]/.test(comando)) {
        return {
            allowed: false,
            message: '❌ Comando inválido.'
        };
    }

    return { allowed: true };
}

module.exports = securityMiddleware;