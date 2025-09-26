// src/admin.js - Sistema de comandos administrativos
const MarketingAutomatico = require('./marketing');

class AdminSystem {
    constructor() {
        this.adminNumbers = [
            '556298577568@s.whatsapp.net', // ⚠️ SUBSTITUA pelo seu número
            // Adicione outros números admin se precisar
        ];
        this.marketing = null;
    }

    // Inicializa com o socket do WhatsApp
    init(sock) {
        this.marketing = new MarketingAutomatico(sock);
        this.marketing.iniciar();
        console.log('🔧 Sistema administrativo iniciado');
    }

    // Verifica se é admin
    isAdmin(jid) {
        return this.adminNumbers.includes(jid);
    }

    // Processa comandos administrativos
    async processarComando(sock, jid, texto) {
        if (!this.isAdmin(jid)) return false;

        const comando = texto.toLowerCase().trim();
        const args = comando.split(' ');

        try {
            switch (args[0]) {
                case '/add':
                    return await this.adicionarGrupo(sock, jid, args);
                
                case '/remove':
                    return await this.removerGrupo(sock, jid, args);
                
                case '/list':
                    return await this.listarGrupos(sock, jid);
                
                case '/stats':
                    return await this.mostrarStats(sock, jid);
                
                case '/test':
                    return await this.testarEnvio(sock, jid, args);
                
                case '/toggle':
                    return await this.toggleGrupo(sock, jid, args);
                
                case '/help':
                    return await this.mostrarAjuda(sock, jid);
                
                case '/send':
                    return await this.enviarAgora(sock, jid);
                
                case '/groups':
                    return await this.listarTodosGrupos(sock, jid);
                
                case '/auto':
                    return await this.autoAddGrupos(sock, jid);
                
                case '/tests':
                    return await this.listarTestesAtivos(sock, jid);
                
                case '/finish':
                    return await this.finalizarTeste(sock, jid, args);
                
                default:
                    return false;
            }
        } catch (error) {
            console.error('Erro no comando admin:', error);
            await sock.sendMessage(jid, { 
                text: '❌ Erro ao executar comando. Tente novamente.' 
            });
            return true;
        }
    }

    // Adicionar grupo
    async adicionarGrupo(sock, jid, args) {
        if (args.length < 2) {
            await sock.sendMessage(jid, { 
                text: '❌ Uso: /add [ID_DO_GRUPO] [NOME_OPCIONAL]' 
            });
            return true;
        }

        const grupoId = args[1];
        const nomeGrupo = args.slice(2).join(' ') || grupoId;
        
        const sucesso = this.marketing.adicionarGrupo(grupoId, nomeGrupo);
        
        const resposta = sucesso 
            ? `✅ Grupo "${nomeGrupo}" adicionado com sucesso!`
            : `❌ Grupo já existe na lista.`;
            
        await sock.sendMessage(jid, { text: resposta });
        return true;
    }

    // Remover grupo  
    async removerGrupo(sock, jid, args) {
        if (args.length < 2) {
            await sock.sendMessage(jid, { 
                text: '❌ Uso: /remove [ID_DO_GRUPO]' 
            });
            return true;
        }

        const grupoId = args[1];
        const sucesso = this.marketing.removerGrupo(grupoId);
        
        const resposta = sucesso 
            ? `✅ Grupo removido com sucesso!`
            : `❌ Grupo não encontrado.`;
            
        await sock.sendMessage(jid, { text: resposta });
        return true;
    }

    // Listar grupos cadastrados para marketing
    async listarGrupos(sock, jid) {
        const lista = this.marketing.listarGrupos();
        await sock.sendMessage(jid, { text: lista });
        return true;
    }

    // Listar todos os grupos que o bot tem acesso
    async listarTodosGrupos(sock, jid) {
        await sock.sendMessage(jid, { 
            text: '🔍 Buscando todos os grupos... Aguarde.' 
        });
        
        const grupos = await this.descobrirGrupos(sock);
        
        if (grupos.length === 0) {
            await sock.sendMessage(jid, { 
                text: '❌ Nenhum grupo encontrado. O bot precisa estar em grupos primeiro.' 
            });
            return true;
        }
        
        let texto = `📋 **TODOS OS GRUPOS DISPONÍVEIS** (${grupos.length})\n\n`;
        
        for (let i = 0; i < grupos.length; i++) {
            const grupo = grupos[i];
            texto += `${i + 1}. **${grupo.nome}**\n`;
            texto += `   🆔 \`${grupo.id}\`\n`;
            texto += `   👥 ${grupo.participantes} membros\n\n`;
            
            // Divide em mensagens menores para não dar erro (a cada 8 grupos)
            if ((i + 1) % 8 === 0 || i === grupos.length - 1) {
                await sock.sendMessage(jid, { text: texto });
                texto = '';
                
                // Aguarda um pouco entre mensagens
                if (i < grupos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    texto = `📋 **CONTINUAÇÃO** (${i + 2}-${Math.min(i + 9, grupos.length)}):\n\n`;
                }
            }
        }
        
        await sock.sendMessage(jid, { 
            text: '💡 **Para adicionar:** `/add [ID] [NOME]`\n💡 **Adicionar todos:** `/auto`' 
        });
        
        return true;
    }

    // Listar testes ativos
    async listarTestesAtivos(sock, jid) {
        const { getFollowUpSystem } = require('./bot');
        const followUpSystem = getFollowUpSystem();
        
        if (!followUpSystem) {
            await sock.sendMessage(jid, { 
                text: '❌ Sistema de follow-up não inicializado.' 
            });
            return true;
        }

        const lista = followUpSystem.listarTestesAtivos();
        const stats = followUpSystem.getEstatisticas();
        
        const texto = `${lista}\n📊 **RESUMO:**\n• Total: ${stats.totalTestes}\n• Ativos: ${stats.testesAtivos}\n• Avisos enviados: ${stats.avisosEnviados}`;
        
        await sock.sendMessage(jid, { text: texto });
        return true;
    }

    // Finalizar teste manualmente
    async finalizarTeste(sock, jid, args) {
        if (args.length < 2) {
            await sock.sendMessage(jid, { 
                text: '❌ Uso: /finish [NÚMERO] - Ex: /finish 5511999999999' 
            });
            return true;
        }

        const numeroCliente = args[1] + '@s.whatsapp.net';
        const { getFollowUpSystem } = require('./bot');
        const followUpSystem = getFollowUpSystem();
        
        if (!followUpSystem) {
            await sock.sendMessage(jid, { 
                text: '❌ Sistema de follow-up não inicializado.' 
            });
            return true;
        }

        followUpSystem.finalizarTeste(numeroCliente, 'admin_manual');
        
        await sock.sendMessage(jid, { 
            text: `✅ Teste finalizado para ${args[1]}` 
        });
        return true;
    }

    // Mostrar estatísticas
    async mostrarStats(sock, jid) {
        const stats = this.marketing.getEstatisticas();
        
        const texto = `📊 **ESTATÍSTICAS DE MARKETING**

📋 Total de grupos: ${stats.totalGrupos}
✅ Grupos ativos: ${stats.gruposAtivos}
📤 Mensagens enviadas: ${stats.totalMensagens}
⏰ Próximo envio: ${stats.proximoEnvio}

🕘 **Horários configurados:**
• 09:00 - Manhã (qualidade)
• 15:30 - Tarde (economia) 
• 20:45 - Noite (entretenimento)`;

        await sock.sendMessage(jid, { text: texto });
        return true;
    }

    // Testar envio
    async testarEnvio(sock, jid, args) {
        if (args.length < 2) {
            await sock.sendMessage(jid, { 
                text: '❌ Uso: /test [ID_DO_GRUPO]' 
            });
            return true;
        }

        const grupoId = args[1];
        const sucesso = await this.marketing.enviarParaGrupo(grupoId);
        
        const resposta = sucesso 
            ? `✅ Teste enviado com sucesso!`
            : `❌ Erro no envio. Verifique se o grupo existe e está ativo.`;
            
        await sock.sendMessage(jid, { text: resposta });
        return true;
    }

    // Ativar/desativar grupo
    async toggleGrupo(sock, jid, args) {
        if (args.length < 2) {
            await sock.sendMessage(jid, { 
                text: '❌ Uso: /toggle [ID_DO_GRUPO]' 
            });
            return true;
        }

        const grupoId = args[1];
        const novoStatus = this.marketing.toggleGrupo(grupoId);
        
        let resposta;
        if (novoStatus === null) {
            resposta = '❌ Grupo não encontrado.';
        } else {
            resposta = `✅ Grupo ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`;
        }
        
        await sock.sendMessage(jid, { text: resposta });
        return true;
    }

    // Enviar agora para todos
    async enviarAgora(sock, jid) {
        await sock.sendMessage(jid, { 
            text: '📤 Enviando marketing para todos os grupos... Aguarde.' 
        });
        
        await this.marketing.enviarParaTodos();
        
        await sock.sendMessage(jid, { 
            text: '✅ Marketing enviado para todos os grupos ativos!' 
        });
        return true;
    }

    // Mostrar ajuda
    async mostrarAjuda(sock, jid) {
        const ajuda = `🔧 **COMANDOS ADMINISTRATIVOS**

📋 **Gerenciar Grupos:**
• \`/add [ID] [NOME]\` - Adicionar grupo
• \`/remove [ID]\` - Remover grupo  
• \`/list\` - Listar grupos do marketing
• \`/toggle [ID]\` - Ativar/desativar grupo

🔍 **Descobrir Grupos:**
• \`/groups\` - Ver TODOS os grupos disponíveis
• \`/auto\` - Adicionar todos os grupos automaticamente

📊 **Monitoramento:**
• \`/stats\` - Ver estatísticas
• \`/test [ID]\` - Testar envio em 1 grupo

📤 **Envios:**
• \`/send\` - Enviar marketing agora
• \`/help\` - Mostrar esta ajuda

⚙️ **Sistema automático:** 3x/dia
🕘 Horários: 09:00, 15:30, 20:45`;

        await sock.sendMessage(jid, { text: ajuda });
        return true;
    }

    // Obter lista de grupos do WhatsApp automaticamente
    async descobrirGrupos(sock) {
        try {
            const grupos = await sock.groupFetchAllParticipating();
            const listaGrupos = [];
            
            Object.values(grupos).forEach(grupo => {
                listaGrupos.push({
                    id: grupo.id,
                    nome: grupo.subject,
                    participantes: grupo.participants?.length || 0
                });
            });
            
            return listaGrupos;
        } catch (error) {
            console.error('Erro ao descobrir grupos:', error);
            return [];
        }
    }

    // Auto-adicionar grupos (comando especial)
    async autoAddGrupos(sock, jid) {
        if (!this.isAdmin(jid)) return false;
        
        await sock.sendMessage(jid, { 
            text: '🔄 Descobrindo e adicionando grupos automaticamente...' 
        });
        
        const grupos = await this.descobrirGrupos(sock);
        let adicionados = 0;
        
        grupos.forEach(grupo => {
            const sucesso = this.marketing.adicionarGrupo(grupo.id, grupo.nome);
            if (sucesso) adicionados++;
        });
        
        await sock.sendMessage(jid, { 
            text: `✅ **${adicionados} grupos** adicionados automaticamente!\n\n📋 Use \`/list\` para ver todos\n🚀 Use \`/send\` para testar envio` 
        });
        
        return true;
    }
}

module.exports = AdminSystem;
