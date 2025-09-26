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
            ultimoTeste: null
        };
    }

    const hoje = new Date();
    const ultimoTeste = atendimentos[jid].ultimoTeste;
    const diffDias = ultimoTeste ? Math.floor((hoje - new Date(ultimoTeste)) / (1000 * 60 * 60 * 24)) : null;

    switch (comando) {
        case '1':
            // Checa limite de 30 dias
            if (ultimoTeste && diffDias < 30) {
                await sock.sendMessage(jid, {
                    text: `❌ Você já gerou um teste nos últimos 30 dias.\n💡 Que tal assinar um plano?\n\n📦 **MENSAL**: R$ 20/mês\n📦 **TRIMESTRAL**: R$ 50 (3 meses)\n📦 **ANUAL**: R$ 150 (12 meses) 🔥\n\n💬 Digite "Menu" para outras opções.`
                });
                // Mantém na fase menu_principal
                return;
            }

            // Continua pro submenu de aparelhos
            atendimentos[jid].fase = 'submenu_aparelho';
            return await sock.sendMessage(jid, { text: mensagens.submenuAparelho });

        case '2':
            atendimentos[jid].ativo = false; // desativa o bot pra esse usuário
            return await sock.sendMessage(jid, { 
                text: '💬 **NOSSOS PLANOS SD PLAY** 🔥\n\n📦 **MENSAL**: R$ 20/mês\n• Todos os canais HD/4K\n• Filmes e séries atualizados\n• Suporte técnico 24h\n\n📦 **TRIMESTRAL**: R$ 50 (3 meses)\n• Economia de R$ 10\n• Todos os benefícios\n\n📦 **ANUAL**: R$ 150 (12 meses)\n• Economia de R$ 90 🤑\n• Melhor custo-benefício\n• Prioridade no suporte\n\n💡 Digite "Menu" para outras opções ou fale com atendente!' 
            });

        case '3':
            atendimentos[jid].ativo = false;
            return await sock.sendMessage(jid, { 
                text: '👨‍💻 Você será atendido por um humano em breve.\n⏱️ Tempo médio de resposta: 5 minutos\n\n💡 Digite "Menu" para voltar ao início.' 
            });

        default:
            await sock.sendMessage(jid, { text: mensagens.avisoInvalido });
            return;
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
            text: '👨‍💻 Um atendente especializado em Smart TVs irá ajudá-lo.\n⏱️ Tempo médio: 5 minutos\n\n💡 Digite "Menu" para voltar ao início.' 
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
 * Handler do submenu de teste - CORRIGIDO
 */
async function handleSubmenuTeste(sock, jid, comando, atendimentos) {
    const tipo = comando === '1' ? 'COM_ADULTO' : comando === '2' ? 'SEM_ADULTO' : null;
    if (!tipo) return await enviarMensagemErro(sock, jid);

    const aparelho = atendimentos[jid].aparelho;
    const apiURL = aparelho === 'SMARTTV' ? API.SMARTTV[tipo] : API.ANDROID_TVBOX[tipo];

    // Mostra mensagem de carregamento
    await sock.sendMessage(jid, { 
        text: '⏳ Gerando seu teste... Aguarde alguns segundos...' 
    });

    let tentativa = 0;
    let sucesso = false;

    while(tentativa < 3 && !sucesso){
        try {
            console.log(`📡 Tentativa ${tentativa + 1} - Requisição API: ${aparelho} - ${tipo}`);
            const response = await axios.post(apiURL, {}, { timeout: 15000 });
            
            // Envia o teste
            await sock.sendMessage(jid, { text: response.data });

            // ✅ CORREÇÃO PRINCIPAL: Volta ao menu principal após enviar teste
            atendimentos[jid].ultimoTeste = new Date();
            atendimentos[jid].fase = 'menu_principal'; // AQUI É A CORREÇÃO!
            atendimentos[jid].aparelho = null; // Limpa aparelho selecionado
            sucesso = true;
            
            // Envia mensagem de follow-up
            setTimeout(async () => {
                await sock.sendMessage(jid, { 
                    text: '🎉 **Teste enviado com sucesso!**\n\n💡 Gostou da qualidade? Que tal assinar um plano?\n📦 Planos a partir de R$ 20/mês\n\n📱 Digite "Menu" para ver outras opções!' 
                });
            }, 2000);
            
            console.log(`✅ Teste enviado com sucesso para ${jid}`);
            
        } catch (error) {
            tentativa++;
            console.error(`❌ Tentativa ${tentativa} falhou:`, error.message);
            
            if(tentativa === 3){
                // Volta ao menu principal mesmo em caso de erro
                atendimentos[jid].fase = 'menu_principal';
                atendimentos[jid].aparelho = null;
                
                await sock.sendMessage(jid, { 
                    text: '❌ **Erro temporário no sistema**\n\nNossos servidores estão sobrecarregados. Tente novamente em alguns minutos.\n\n💡 Digite "Menu" para tentar novamente.' 
                });
            } else {
                // Aguarda antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
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
