const axios = require('axios');
const mensagens = require('./mensagens');
const API = require('./api');

/**
 * Envia aviso de opção inválida no menu principal
 */
async function enviarAvisoMenuPrincipal(sock, jid) {
    try {
        return await sock.sendMessage(jid, { text: mensagens.avisoInvalido });
    } catch (error) {
        console.error('Erro ao enviar aviso do menu principal:', error);
    }
}

/**
 * Envia o menu principal para o usuário
 */

async function enviarMenuPrincipal(sock, jid) {
    try {
        return await sock.sendMessage(jid, {
            text: mensagens.menuPrincipal
        });
    } catch (error) {
        console.error('Erro ao enviar menu principal:', error);
    }
}

/**
 * Envia o submenu de teste
 */
async function enviarSubmenuTeste(sock, jid, aparelho) {
    try {
        await sock.sendMessage(jid, { text: mensagens.submenuTeste });
        return { fase: 'submenu_teste', aparelho };
    } catch (error) {
        console.error('Erro ao enviar submenu teste:', error);
    }
}


/**
 * Envia mensagem de erro padrão
 */
async function enviarMensagemErro(sock, jid) {
    try {
        return await sock.sendMessage(jid, { 
            text: '❌ Opção inválida. Digite "Menu" para voltar ao início.' 
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem de erro:', error);
    }
}

/**
 * Handler do menu principal
 */
async function handleMenuPrincipal(sock, jid, comando, atendimentos) {
    // Inicializa o objeto do cliente se não existir
    if (!atendimentos[jid]) {
        atendimentos[jid] = {
            ativo: true,
            fase: 'menu_principal',
            aparelho: null,
            ultimaInteracao: new Date(),
            ultimoTeste: null // armazena data do último teste
        };
    }

    const hoje = new Date();
    const ultimoTeste = atendimentos[jid].ultimoTeste;
    const diffDias = ultimoTeste ? Math.floor((hoje - new Date(ultimoTeste)) / (1000 * 60 * 60 * 24)) : null;

    switch (comando) {
        case '1':
            // Checa limite de 30 dias
            if (ultimoTeste && diffDias < 30) {
                return await sock.sendMessage(jid, {
                    text: `❌ Você já gerou um teste nos últimos 30 dias.\n💡 Que tal assinar um plano?\n📦 Plano Mensal Apenas 20$/Mês 🔥`
                });
            }

            // Marca a data do teste
            atendimentos[jid].ultimoTeste = hoje;

            // Continua pro submenu de aparelhos
            atendimentos[jid].fase = 'submenu_aparelho';
            return await sock.sendMessage(jid, { text: mensagens.submenuAparelho });

        case '2':
    atendimentos[jid].ativo = false; // desativa o bot pra esse usuário
    return await sock.sendMessage(jid, { 
        text: '💬 Tire suas dúvidas com um atendente.\n💡 Digite "Menu" para voltar ao início.' 
    });
        case '3':
            atendimentos[jid].ativo = false;
            return await sock.sendMessage(jid, { 
                text: '👨‍💻 Um atendente humano irá ajudá-lo em breve.\n💡 Digite "Menu" para voltar ao início.' 
            });
        default:
            // Opção inválida: envia aviso e menu juntos
            await enviarAvisoMenuPrincipal(sock, jid);
            return await enviarMenuPrincipal(sock, jid);
    }
}


/**
 * Handler do submenu de aparelhos
 */
async function handleSubmenuAparelho(sock, jid, comando, atendimentos) {
    switch (comando) {
        case '1': // Smart TV
            atendimentos[jid].fase = 'submenu_smarttv';
            return await sock.sendMessage(jid, { text: mensagens.submenuSmartTV });
        case '2': // TV Box
            const tvboxResult = await enviarSubmenuTeste(sock, jid, 'TVBOX');
            Object.assign(atendimentos[jid], tvboxResult);
            return;
        case '3': // Celular
            atendimentos[jid].fase = 'submenu_celular';
            return await sock.sendMessage(jid, { text: mensagens.submenuCelular });
        default:
            return await enviarMensagemErro(sock, jid);
    }
}

/**
 * Handler do submenu Smart TV
 */
async function handleSubmenuSmartTV(sock, jid, comando, atendimentos) {
    if (comando === '1') {
        const smarttvResult = await enviarSubmenuTeste(sock, jid, 'SMARTTV');
        Object.assign(atendimentos[jid], smarttvResult);
        return;
    } else if (comando === '2') {
        atendimentos[jid].ativo = false;
        return await sock.sendMessage(jid, { 
            text: '👨‍💻 Um atendente humano irá ajudá-lo em breve.\n💡 Digite "Menu" para voltar ao início.' 
        });
    }
    return await enviarMensagemErro(sock, jid);
}

/**
 * Handler do submenu celular
 */
async function handleSubmenuCelular(sock, jid, comando, atendimentos) {
    if (comando === '1') { // Android
        const androidResult = await enviarSubmenuTeste(sock, jid, 'ANDROID');
        Object.assign(atendimentos[jid], androidResult);
        return;
    } else if (comando === '2') { // iOS
        const iosResult = await enviarSubmenuTeste(sock, jid, 'IOS');
        Object.assign(atendimentos[jid], iosResult);
        return;
    }
    return await enviarMensagemErro(sock, jid);
}

/**
 * Handler do submenu de teste
 */
async function handleSubmenuTeste(sock, jid, comando, atendimentos) {
    const tipo = comando === '1' ? 'COM_ADULTO' : comando === '2' ? 'SEM_ADULTO' : null;
    if (!tipo) return await enviarMensagemErro(sock, jid);

    const aparelho = atendimentos[jid].aparelho;
    const apiURL = aparelho === 'SMARTTV' ? API.SMARTTV[tipo] : API.ANDROID_TVBOX[tipo];

    try {
        console.log(`📡 Fazendo requisição para API: ${aparelho} - ${tipo}`);
        const response = await axios.post(apiURL, {}, { timeout: 10000 });
        
        await sock.sendMessage(jid, { text: response.data });
        atendimentos[jid].fase = 'menu_principal'; // Volta ao menu principal
        
        console.log(`✅ Teste enviado com sucesso para ${jid}`);
    } catch (error) {
        console.error('❌ Erro ao buscar dados da API:', error.message);
        await sock.sendMessage(jid, { 
            text: '❌ Erro ao buscar os dados do teste. Tente novamente em alguns instantes.' 
        });
    }
}

module.exports = {
    enviarMenuPrincipal,
    enviarSubmenuTeste,
    enviarMensagemErro,
    handleMenuPrincipal,
    handleSubmenuAparelho,
    handleSubmenuSmartTV,
    handleSubmenuCelular,
    handleSubmenuTeste
};
