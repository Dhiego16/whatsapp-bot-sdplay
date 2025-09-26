// src/admin.js - Sistema de comandos administrativos
const MarketingAutomatico = require('./marketing');

class AdminSystem {
    constructor() {
        this.adminNumbers = [
            '5511999999999@s.whatsapp.net', // Substitua pelo seu número
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

    // Listar grupos
    async listarGrupos(sock, jid) {
        const lista = this.marketing.listarGrupos();
        await sock.sendMessage(jid, { text: lista });
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
• \`/list\` - Listar todos os grupos
• \`/toggle [ID]\` - Ativar/desativar grupo

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
        
        const grupos = await this.descobrirGrupos(sock);
        let adicionados = 0;
        
        grupos.forEach(grupo => {
            const sucesso = this.marketing.adicionarGrupo(grupo.id, grupo.nome);
            if (sucesso) adicionados++;
        });
        
        await sock.sendMessage(jid, { 
            text: `✅ ${adicionados} grupos adicionados automaticamente!\nUse /list para ver todos.` 
        });
        
        return true;
    }
}

module.exports = AdminSystem;
