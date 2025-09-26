// src/followup.js - Sistema de follow-up para testes
const cron = require('node-cron');

class FollowUpSystem {
    constructor() {
        this.testsAtivos = new Map(); // jid -> dados do teste
        this.sock = null;
        this.inicializado = false;
    }

    // Inicializa o sistema
    init(sock) {
        this.sock = sock;
        this.iniciarMonitoramento();
        console.log('⏰ Sistema de follow-up iniciado');
    }

    // Registra um novo teste
    registrarTeste(jid, tipo, aparelho) {
        const agora = new Date();
        
        // ✅ CORREÇÃO: Diferentes durações por aparelho
        let duracaoHoras;
        if (aparelho === 'SMARTTV' || aparelho === 'IOS') {
            duracaoHoras = 6; // Smart TV e iOS = 6 horas
        } else {
            duracaoHoras = 4; // Android/TV Box = 4 horas
        }
        
        const expiraEm = new Date(agora.getTime() + (duracaoHoras * 60 * 60 * 1000));
        const avisoEm = new Date(agora.getTime() + ((duracaoHoras - 0.5) * 60 * 60 * 1000)); // 30min antes

        this.testsAtivos.set(jid, {
            criadoEm: agora,
            expiraEm,
            avisoEm,
            tipo,
            aparelho,
            duracaoHoras, // Armazena a duração para referência
            avisoEnviado: false,
            finalizado: false
        });

        console.log(`📝 Teste registrado para ${jid} - ${aparelho} (${duracaoHoras}h) - Expira em: ${expiraEm.toLocaleString('pt-BR')}`);
        
        // Agenda o aviso de expiração
        this.agendarAvisos(jid);
    }

    // Agenda avisos para um teste específico
    agendarAvisos(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste) return;

        // Aviso 30 minutos antes de expirar
        setTimeout(async () => {
            await this.enviarAvisoExpiracao(jid);
        }, teste.avisoEm.getTime() - Date.now());

        // Mensagem final quando expira
        setTimeout(async () => {
            await this.enviarMensagemFinal(jid);
        }, teste.expiraEm.getTime() - Date.now());
    }

    // Envia aviso de que o teste vai expirar em 30min
    async enviarAvisoExpiracao(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste || teste.avisoEnviado || teste.finalizado) return;

        try {
            // ✅ Mensagem personalizada por duração
            const tempoTeste = teste.duracaoHoras === 6 ? '6 horas' : '4 horas';
            
            const mensagem = `⏰ **ATENÇÃO: SEU TESTE ESTÁ EXPIRANDO!** ⏰

🕐 **Restam apenas 30 minutos** do seu teste SD PLAY de ${tempoTeste}!

💡 **Gostou da qualidade?** Não perca tempo!

🔥 **OFERTA ESPECIAL** (só hoje):
📦 **MENSAL**: R$ 20 ~~R$ 25~~ 
📦 **TRIMESTRAL**: R$ 50 ~~R$ 60~~ (MAIS POPULAR)
📦 **ANUAL**: R$ 150 ~~R$ 180~~ (MELHOR DESCONTO)

✨ **Ativação imediata após pagamento!**

📞 **Chama no PV** para ativar agora!

⚠️ Não deixe para depois - garante seu entretenimento!`;

            await this.sock.sendMessage(jid, { text: mensagem });
            
            teste.avisoEnviado = true;
            console.log(`⏰ Aviso de expiração enviado para ${jid} (${tempoTeste})`);

        } catch (error) {
            console.error(`❌ Erro ao enviar aviso para ${jid}:`, error);
        }
    }

    // Envia mensagem quando o teste expira
    async enviarMensagemFinal(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste || teste.finalizado) return;

        try {
            // ✅ Mensagem personalizada por duração
            const tempoTeste = teste.duracaoHoras === 6 ? '6 horas' : '4 horas';
            
            const mensagem = `⏰ **SEU TESTE EXPIROU!** 

😔 Que pena! Seu teste de ${tempoTeste} chegou ao fim...

💭 **Mas relaxa!** Foi só uma pequena amostra do que temos:

🚀 **NO PLANO COMPLETO você tem:**
• +15.000 canais HD/4K
• Filmes em 1ª linha (lançamentos)
• Todas as séries Netflix, Prime, Disney+  
• Futebol AO VIVO (Brasileirão, Champions)
• Sem travamentos, qualidade premium

💸 **ÚLTIMAS HORAS** - Desconto especial:
📦 **3 MESES**: R$ 50 (era R$ 60)
📦 **1 ANO**: R$ 150 (era R$ 180)

⚡ **Ativação em 5 minutos via PIX**

💬 **Quer continuar assistindo?** 

_Não perca essa oferta! Válida só hoje_ ⏰`;

            await this.sock.sendMessage(jid, { text: mensagem });
            
            teste.finalizado = true;
            console.log(`🏁 Mensagem final enviada para ${jid} (${tempoTeste})`);

            // Remove da lista após 24h
            setTimeout(() => {
                this.testsAtivos.delete(jid);
                console.log(`🗑️ Teste removido da lista: ${jid}`);
            }, 24 * 60 * 60 * 1000);

        } catch (error) {
            console.error(`❌ Erro ao enviar mensagem final para ${jid}:`, error);
        }
    }

    // Follow-up adicional depois de 2 horas (se não comprou)
    async enviarFollowUpAdicional(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste || !teste.finalizado) return;

        try {
            const mensagem = `👋 **Oi! Tudo bem?**

Vimos que você testou nosso IPTV hoje. O que achou da qualidade?

🤔 **Alguma dúvida sobre os planos?**
📞 Chama no PV que esclarecemos tudo!

🎁 **BÔNUS:** Se ativar hoje, ganha:
• 3 dias extras GRÁTIS
• Suporte VIP prioritário
• Lista PREMIUM de canais adultos

💰 **Menor preço do mercado:** R$ 20/mês apenas!

_Responde aí, vamos conversar!_ 😊`;

            await this.sock.sendMessage(jid, { text: mensagem });
            console.log(`📞 Follow-up adicional enviado para ${jid}`);

        } catch (error) {
            console.error(`❌ Erro no follow-up adicional para ${jid}:`, error);
        }
    }

    // Inicia monitoramento automático (verifica a cada hora)
    iniciarMonitoramento() {
        if (this.inicializado) return;

        // Verifica a cada hora se há avisos pendentes
        cron.schedule('0 * * * *', () => {
            this.verificarAvisosPendentes();
        }, {
            timezone: "America/Sao_Paulo"
        });

        // Follow-up adicional - verifica de 2 em 2 horas
        cron.schedule('0 */2 * * *', () => {
            this.enviarFollowUpsAdicionais();
        }, {
            timezone: "America/Sao_Paulo"
        });

        this.inicializado = true;
        console.log('✅ Monitoramento de follow-up ativado');
    }

    // Verifica avisos pendentes (backup caso setTimeout falhe)
    verificarAvisosPendentes() {
        const agora = new Date();
        
        this.testsAtivos.forEach(async (teste, jid) => {
            // Se passou da hora do aviso e não foi enviado
            if (agora >= teste.avisoEm && !teste.avisoEnviado && !teste.finalizado) {
                await this.enviarAvisoExpiracao(jid);
            }
            
            // Se passou da hora de expirar e não foi finalizado
            if (agora >= teste.expiraEm && !teste.finalizado) {
                await this.enviarMensagemFinal(jid);
            }
        });
    }

    // Envia follow-ups adicionais (2h após expirar)
    enviarFollowUpsAdicionais() {
        const agora = new Date();
        const duasHorasAtras = new Date(agora.getTime() - (2 * 60 * 60 * 1000));
        
        this.testsAtivos.forEach(async (teste, jid) => {
            // Se finalizou há 2 horas, envia follow-up adicional
            if (teste.finalizado && teste.expiraEm <= duasHorasAtras) {
                await this.enviarFollowUpAdicional(jid);
                // Remove após enviar follow-up final
                setTimeout(() => {
                    this.testsAtivos.delete(jid);
                }, 60000);
            }
        });
    }

    // Finaliza um teste manualmente (quando cliente compra)
    finalizarTeste(jid, motivo = 'comprou') {
        const teste = this.testsAtivos.get(jid);
        if (teste) {
            teste.finalizado = true;
            console.log(`✅ Teste finalizado para ${jid} - Motivo: ${motivo}`);
        }
    }

    // Estatísticas dos testes
    getEstatisticas() {
        const total = this.testsAtivos.size;
        let ativos = 0;
        let expirados = 0;
        let avisosEnviados = 0;

        this.testsAtivos.forEach(teste => {
            if (!teste.finalizado) ativos++;
            if (teste.finalizado) expirados++;
            if (teste.avisoEnviado) avisosEnviados++;
        });

        return {
            totalTestes: total,
            testesAtivos: ativos,
            testesExpirados: expirados,
            avisosEnviados: avisosEnviados
        };
    }

    // Listar testes ativos (para admin)
    listarTestesAtivos() {
        if (this.testsAtivos.size === 0) {
            return '📝 Nenhum teste ativo no momento.';
        }

        let lista = `⏰ **TESTES ATIVOS** (${this.testsAtivos.size}):\n\n`;
        
        this.testsAtivos.forEach(teste => {
            const tempoRestante = Math.ceil((teste.expiraEm - new Date()) / (1000 * 60)); // minutos
            const status = teste.finalizado ? '🏁' : teste.avisoEnviado ? '⚠️' : '🟢';
            const duracao = teste.duracaoHoras === 6 ? '6h' : '4h';
            
            lista += `${status} ${jid.split('@')[0]}\n`;
            lista += `   ⏱️ ${tempoRestante > 0 ? `${tempoRestante}min restantes` : 'Expirado'}\n`;
            lista += `   📱 ${teste.aparelho} (${duracao}) | ${teste.tipo}\n\n`;
        });

        return lista;
    }
}

module.exports = FollowUpSystem;
