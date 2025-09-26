// src/marketing.js
const cron = require('node-cron');

class MarketingAutomatico {
    constructor(sock) {
        this.sock = sock;
        this.grupos = []; // Lista de grupos para divulgar
        this.mensagensMarketing = [];
        this.indiceAtual = 0;
        this.inicializado = false;
        
        this.initMensagens();
    }

    initMensagens() {
        this.mensagensMarketing = [
            {
                horario: '09:00',
                texto: `🔥 **SD PLAY - IPTV Premium** 🔥

📺 **+15.000 CANAIS** em HD/4K
🎬 **Netflix, Prime, Disney+** e mais
⚽ **Todos os jogos AO VIVO**
📱 **Funciona em qualquer aparelho**

💰 **PROMOÇÃO**:
📦 Mensal: R$ 20
📦 Trimestral: R$ 50 
📦 Anual: R$ 150

🆓 **TESTE GRÁTIS** - Chama no PV!
https://wa.me/message/PFDNAVBLMYODJ1

_Qualidade premium, preço justo_ ✨`
            },
            {
                horario: '15:30',
                texto: `💸 **CHEGA DE PAGAR CARO EM TV!** 💸

❌ TV por assinatura: R$ 150+/mês
✅ SD PLAY: R$ 20/mês apenas!

🎯 **O que você ganha:**
• Canais do mundo todo
• Filmes lançamentos
• Séries completas  
• Futebol brasileiro e europeu
• Sem fidelidade, sem taxa

🎁 **TESTE GRÁTIS** disponível!
📲 Chama no privado e comprova!
https://wa.me/message/PFDNAVBLMYODJ1

_Economia de verdade_ 💰`
            },
            {
                horario: '20:45',
                texto: `🌙 **BOA NOITE, GALERA!** 

Já pensou em ter acesso a:
🏆 **TODOS os canais Premiere**
🎭 **Globoplay, SBT+, Record+**
🌍 **Canais internacionais**
🔞 **Conteúdo adulto (opcional)**
📚 **Canais educativos para crianças**

📱 **SD PLAY** - Funciona em:
• Smart TV • Projetor • TV Box • Celular • PC 

💡 Quer testar?
📞 Só chamar no PV!
https://wa.me/message/PFDNAVBLMYODJ1

_Entretenimento completo para toda família_ 👨‍👩‍👧‍👦`
            }
        ];
    }

    adicionarGrupo(jid, nome = '') {
        const grupoExiste = this.grupos.find(g => g.jid === jid);
        if (!grupoExiste) {
            this.grupos.push({
                jid,
                nome: nome || jid,
                ativo: true,
                ultimaMsg: null,
                totalEnviadas: 0
            });
            console.log(`📢 Grupo adicionado: ${nome || jid}`);
            return true;
        }
        return false;
    }

    removerGrupo(jid) {
        const index = this.grupos.findIndex(g => g.jid === jid);
        if (index !== -1) {
            const grupo = this.grupos[index];
            this.grupos.splice(index, 1);
            console.log(`🚫 Grupo removido: ${grupo.nome}`);
            return true;
        }
        return false;
    }

    listarGrupos() {
        if (this.grupos.length === 0) {
            return '📝 Nenhum grupo cadastrado ainda.';
        }
        
        let lista = '📋 **GRUPOS CADASTRADOS:**\n\n';
        this.grupos.forEach((grupo, index) => {
            const status = grupo.ativo ? '✅' : '❌';
            lista += `${index + 1}. ${status} ${grupo.nome}\n`;
            lista += `   📊 ${grupo.totalEnviadas} msgs enviadas\n\n`;
        });
        
        return lista;
    }

    toggleGrupo(jid) {
        const grupo = this.grupos.find(g => g.jid === jid);
        if (grupo) {
            grupo.ativo = !grupo.ativo;
            console.log(`🔄 Grupo ${grupo.nome}: ${grupo.ativo ? 'ativado' : 'desativado'}`);
            return grupo.ativo;
        }
        return null;
    }

    async enviarParaTodos() {
        if (!this.sock || this.grupos.length === 0) return;

        const mensagem = this.mensagensMarketing[this.indiceAtual];
        const gruposAtivos = this.grupos.filter(g => g.ativo);
        
        console.log(`📢 Enviando marketing para ${gruposAtivos.length} grupos...`);

        for (const grupo of gruposAtivos) {
            try {
                await this.sock.sendMessage(grupo.jid, { 
                    image: { url: './promo.png' }, // imagem adicionada
                    caption: mensagem.texto
                });
                
                grupo.ultimaMsg = new Date();
                grupo.totalEnviadas++;
                
                console.log(`✅ Enviado para: ${grupo.nome}`);
                
                const delay = Math.random() * 5000 + 5000; // 5-10s
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                console.error(`❌ Erro ao enviar para ${grupo.nome}:`, error);
                
                if (error.output?.statusCode === 403) {
                    grupo.ativo = false;
                    console.log(`🚫 Grupo ${grupo.nome} desativado (sem permissão)`);
                }
            }
        }

        this.indiceAtual = (this.indiceAtual + 1) % this.mensagensMarketing.length;
    }

    async enviarParaGrupo(jid) {
        const grupo = this.grupos.find(g => g.jid === jid);
        if (!grupo || !grupo.ativo) return false;

        try {
            const mensagem = this.mensagensMarketing[0]; 
            await this.sock.sendMessage(jid, { 
                image: { url: './promo.png' }, // imagem adicionada
                caption: mensagem.texto
            });
            
            grupo.ultimaMsg = new Date();
            grupo.totalEnviadas++;
            
            console.log(`✅ Teste enviado para: ${grupo.nome}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro no teste para ${grupo.nome}:`, error);
            return false;
        }
    }

    iniciar() {
        if (this.inicializado) return;

        console.log('🚀 Iniciando marketing automático...');
        
        this.mensagensMarketing.forEach(msg => {
            cron.schedule(`0 ${msg.horario.split(':')[1]} ${msg.horario.split(':')[0]} * * *`, () => {
                this.enviarParaTodos();
            }, {
                timezone: "America/Sao_Paulo"
            });
        });

        this.inicializado = true;
        console.log('✅ Marketing automático configurado para 09:00, 15:30 e 20:45');
    }

    parar() {
        this.inicializado = false;
        console.log('🛑 Marketing automático pausado');
    }

    getEstatisticas() {
        const total = this.grupos.length;
        const ativos = this.grupos.filter(g => g.ativo).length;
        const totalMsgs = this.grupos.reduce((sum, g) => sum + g.totalEnviadas, 0);
        
        return {
            totalGrupos: total,
            gruposAtivos: ativos,
            totalMensagens: totalMsgs,
            proximoEnvio: this.mensagensMarketing[this.indiceAtual]?.horario || 'N/A'
        };
    }
}

module.exports = MarketingAutomatico;
