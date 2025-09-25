// Middleware de segurança: limita spam, bloqueia flood e valida comandos
const userCommandTimestamps = {};
const blockedUsers = {};

// Greenlist dinâmica: números liberados podem ser alterados sem mudar o código
let greenlist = [
    '556298577568@s.whatsapp.net' // Seu número liberado
];

// Função pra adicionar novo número à greenlist
function addGreen(user) {
    if (!greenlist.includes(user)) {
        greenlist.push(user);
        return true; // adicionado
    }
    return false; // já estava liberado
}

// Função pra checar se é greenlist
function isGreen(user) {
    return greenlist.includes(user);
}

module.exports = { userCommandTimestamps, blockedUsers, greenlist, addGreen, isGreen };
