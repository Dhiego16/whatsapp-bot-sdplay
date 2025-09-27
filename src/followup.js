// src/followup.js - Sistema de follow-up para testes - CORRIGIDO
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
        this.iniciarLimpezaAutomatica(); // ✅ NOVO: Previne memory leak
        console.log('⏰ Sistema de follow-up iniciado');
    }

    // ✅ NOVO: Limpa dados antigos automaticamente (previne memory leak)
    iniciarLimpezaAutomatica() {
        // Limpa testes muito antigos a cada 6 horas
        cron.schedule('0 */6 * * *', () => {
            this.limparTestesAntigos();
        }, {
            timezone: "America/Sao_Paulo"
        });
    }

    // ✅ NOVO: Remove testes com mais de 48h (evita memory leak no Render)
    limparTestesAntigos() {
        const agora = new Date();
        const limite48h = 48 * 60 * 60 * 1000; // 48 horas
        let removidos = 0;

        this.testsAtivos.forEach((teste, jid) => {
            const idade = agora - teste.criadoEm;
            if (idade > limite48h) {
                this.testsAtivos.delete(jid);
                removidos++;
            }
        });

        if (removidos > 0) {
            console.log(`🗑️ Limpeza automática: ${removidos} testes antigos removidos`);
            console.log(`📊 Testes ativos restantes: ${this.testsAtivos.size}`);
        }
    }

    // Registra um novo teste
    registrarTeste(jid, tipo, aparelho) {
        const agora = new Date();
        
        // ✅ Diferentes durações por aparelho
        let duracaoHoras;
        if (aparelho === 'SMARTTV' || aparelho === 'IOS') {
            duracaoHoras = 6; // Smart TV e iOS = 6 horas
        } else {
            duracaoHoras = 4; // Android/TV Box = 4 horas
        }
        
        const expiraEm = new Date(agora.getTime() + (duracaoHoras * 60 * 60 * 1000));
        const avisoEm = new Date(agora.getTime() + ((duracaoHoras - 0.5) * 60 * 60 * 1000)); // 30min antes

        // ✅ CORRIGIDO: Remove teste anterior se existir (evita duplicação)
        if (this.testsAtivos.has(jid)) {
            console.log(`⚠️ Removendo teste anterior de ${jid}`);
            this.testsAtivos.delete(jid);
        }

        this.testsAtivos.set(jid, {
            criadoEm: agora,
            expiraEm,
            avisoEm,
            tipo,
            aparelho,
            duracaoHoras,
            avisoEnviado: false,
            finalizado: false,
            followUpEnviado: false // ✅ NOVO: Controla follow-up adicional
        });

        console.log(`📝 Teste registrado para ${jid} - ${aparelho} (${duracaoHoras}h) - Expira: ${expiraEm.toLocaleString('pt-BR')}`);
        
        // ✅ CORRIGIDO: Só agenda se não estiver no Render free (evita problemas de sleep)
        if (process.env.NODE_ENV !== 'production') {
            this.agendarAvisos(jid);
        }
    }

    // Agenda avisos para um teste específico
    agendarAvisos(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste) return;

        const agora = new Date();
        const tempoParaAviso = teste.avisoEm.getTime() - agora.getTime();
        const tempoParaExpiracao = teste.expiraEm.getTime() - agora.getTime();

        // Só agenda se for no futuro
        if (tempoParaAviso > 0) {
            setTimeout(async () => {
                await this.enviarAvisoExpiracao(jid);
            }, tempoParaAviso);
        }

        if (tempoParaExpiracao > 0) {
            setTimeout(async () => {
                await this.enviarMensagemFinal(jid);
            }, tempoParaExpiracao);
        }
    }

    // Envia aviso de que o teste vai expirar em 30min
    async enviarAvisoExpiracao(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste || teste.avisoEnviado || teste.finalizado) return;

        try {
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
            console.error(`❌ Erro ao enviar aviso para ${jid}:`, error.message);
        }
    }

    // Envia mensagem quando o teste expira
    async enviarMensagemFinal(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste || teste.finalizado) return;

        try {
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

            // ✅ CORRIGIDO: Agenda follow-up adicional para 2h depois
            setTimeout(() => {
                this.enviarFollowUpAdicional(jid);
            }, 2 * 60 * 60 * 1000); // 2 horas

        } catch (error) {
            console.error(`❌ Erro ao enviar mensagem final para ${jid}:`, error.message);
        }
    }

    // Follow-up adicional depois de 2 horas (se não comprou)
    async enviarFollowUpAdicional(jid) {
        const teste = this.testsAtivos.get(jid);
        if (!teste || !teste.finalizado || teste.followUpEnviado) return;

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
            teste.followUpEnviado = true;
            console.log(`📞 Follow-up adicional enviado para ${jid}`);

            // ✅ Remove da memória após follow-up final
            setTimeout(() => {
                this.testsAtivos.delete(jid);
                console.log(`🗑️ Teste removido da lista: ${jid}`);
            }, 60 * 60 * 1000); // Remove após 1 hora

        } catch (error) {
            console.error(`❌ Erro no follow-up adicional para ${jid}:`, error.message);
        }
    }

    // ✅ MELHORADO: Inicia monitoramento (funciona melhor no Render)
    iniciarMonitoramento() {
        if (this.inicializado) return;

        // ✅ CORRIGIDO: Verifica avisos a cada 30 minutos (mais confiável que setTimeout)
        cron.schedule('*/30 * * * *', () => {
            this.verificarAvisosPendentes();
        }, {
            timezone: "America/Sao_Paulo"
        });

        this.inicializado = true;
        console.log('✅ Monitoramento de follow-up ativado (verifica a cada 30min)');
    }

    // ✅ MELHORADO: Verifica avisos pendentes (backup confiável para o Render)
    verificarAvisosPendentes() {
        const agora = new Date();
        let verificados = 0;
        
        this.testsAtivos.forEach(async (teste, jid) => {
            verificados++;
            
            // Se passou da hora do aviso e não foi enviado
            if (agora >= teste.avisoEm && !teste.avisoEnviado && !teste.finalizado) {
                await this.enviarAvisoExpiracao(jid);
            }
            
            // Se passou da hora de expirar e não foi finalizado
            if (agora >= teste.expiraEm && !teste.finalizado) {
                await this.enviarMensagemFinal(jid);
            }

            // Follow-up adicional após 2h da expiração
            const duasHorasAposExpiracao = new Date(teste.expiraEm.getTime() + (2 * 60 * 60 * 1000));
            if (agora >= duasHorasAposExpiracao && teste.finalizado && !teste.followUpEnviado) {
                await this.enviarFollowUpAdicional(jid);
            }
        });

        if (verificados > 0) {
            console.log(`🔍 Verificação follow-up: ${verificados} testes checados`);
        }
    }

    // Finaliza um teste manualmente (quando cliente compra)
    finalizarTeste(jid, motivo = 'comprou') {
        const teste = this.testsAtivos.get(jid);
        if (teste) {
            teste.finalizado = true;
            teste.followUpEnviado = true; // ✅ NOVO: Evita follow-up se comprou
            console.log(`✅ Teste finalizado para ${jid} - Motivo: ${motivo}`);
            
            // Remove da memória após 5 minutos
            setTimeout(() => {
                this.testsAtivos.delete(jid);
                console.log(`🗑️ Teste removido (cliente comprou): ${jid}`);
            }, 5 * 60 * 1000);
        }
    }

    // ✅ MELHORADO: Estatísticas dos testes
    getEstatisticas() {
        const total = this.testsAtivos.size;
        let ativos = 0;
        let expirados = 0;
        let avisosEnviados = 0;
        let followUpsEnviados = 0;

        this.testsAtivos.forEach(teste => {
            if (!teste.finalizado && new Date() < teste.expiraEm) ativos++;
            if (teste.finalizado) expirados++;
            if (teste.avisoEnviado) avisosEnviados++;
            if (teste.followUpEnviado) followUpsEnviados++;
        });

        return {
            totalTestes: total,
            testesAtivos: ativos,
            testesExpirados: expirados,
            avisosEnviados: avisosEnviados,
            followUpsEnviados: followUpsEnviados,
            memoryUsage: `${total} testes na memória`
        };
    }

    // ✅ MELHORADO: Listar testes ativos (para admin)
    listarTestesAtivos() {
        if (this.testsAtivos.size === 0) {
            return '📝 Nenhum teste ativo no momento.';
        }

        let lista = `⏰ **TESTES ATIVOS** (${this.testsAtivos.size}):\n\n`;
        
        this.testsAtivos.forEach((teste, jid) => {
            const agora = new Date();
            const tempoRestante = Math.ceil((teste.expiraEm - agora) / (1000 * 60)); // minutos
            
            let status;
            if (teste.finalizado) status = '🏁';
            else if (agora >= teste.expiraEm) status = '⏰';
            else if (teste.avisoEnviado) status = '⚠️';
            else status = '🟢';
            
            const duracao = teste.duracaoHoras === 6 ? '6h' : '4h';
            const numeroLimpo = jid.split('@')[0];
            
            lista += `${status} ${numeroLimpo}\n`;
            lista += `   ⏱️ ${tempoRestante > 0 ? `${tempoRestante}min restantes` : 'Expirado'}\n`;
            lista += `   📱 ${teste.aparelho} (${duracao}) | ${teste.tipo}\n`;
            lista += `   🕐 Criado: ${teste.criadoEm.toLocaleTimeString('pt-BR')}\n\n`;
        });

        return lista;
    }
}

module.exports = FollowUpSystem;
