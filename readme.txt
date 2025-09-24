# 🤖 Bot WhatsApp SD PLAY

Bot automatizado para atendimento via WhatsApp da SD PLAY, desenvolvido com Node.js e Baileys.

## 🚀 Funcionalidades

- ✅ Atendimento automatizado 24/7
- 📱 Interface web para gerenciamento
- 🔄 Reconexão automática
- 📊 Sistema de menus interativos
- 🎯 Direcionamento por tipo de aparelho
- 🔒 Sistema de reset seguro
- 📈 Logs detalhados

## 📋 Pré-requisitos

- Node.js 16+ 
- NPM ou Yarn
- WhatsApp Business ou pessoal

## 🛠️ Instalação

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd whatsapp-bot-sdplay
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Inicie o bot:**
```bash
npm start
```

5. **Acesse o painel:**
```
http://localhost:3000
```

## 🎯 Como usar

1. **Primeira execução:**
   - Acesse `http://localhost:3000`
   - Escaneie o QR Code com seu WhatsApp
   - Aguarde a confirmação de conexão

2. **Testando o bot:**
   - Envie uma mensagem para o número conectado
   - O bot responderá automaticamente com o menu

3. **Resetar sessão:**
   - Acesse: `http://localhost:3000/reset?token=123456`
   - Ou altere o token no arquivo `.env`

## 📁 Estrutura do Projeto

```
├── src/
│   ├── api.js          # Configurações das APIs
│   ├── bot.js          # Lógica principal do bot
│   ├── menus.js        # Handlers dos menus
│   └── server.js       # Servidor Express
├── public/
│   └── index.html      # Interface web
├── auth_test/          # Dados de autenticação (auto-gerado)
└── package.json
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
RESET_TOKEN=seu_token_seguro_aqui
PORT=3000
NODE_ENV=production
```

### APIs Externas

As URLs das APIs estão configuradas em `src/api.js`. Altere conforme necessário:

```javascript
module.exports = {
    SMARTTV: {
        COM_ADULTO: 'sua-api-aqui',
        SEM_ADULTO: 'sua-api-aqui'
    },
    // ...
};
```

## 📱 Fluxo de Atendimento

1. **Menu Principal**
   - Teste Grátis
   - Dúvidas sobre planos  
   - Atendente humano

2. **Seleção de Aparelho**
   - Smart TV
   - TV Box
   - Celular (Android/iOS)

3. **Tipo de Teste**
   - Com conteúdo adulto
   - Sem conteúdo adulto

4. **Entrega do Teste**
   - Dados enviados via API
   - Retorno ao menu principal

## 🚀 Deploy

### PM2 (Recomendado)

```bash
npm install -g pm2
pm2 start src/server.js --name "sdplay-bot"
pm2 startup
pm2 save
```

### Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Monitoramento

- **Status da API:** `GET /status`
- **Logs:** Console do servidor
- **Métricas:** Via PM2 ou Docker logs

## 🛡️ Segurança

- Token obrigatório para reset
- Validação de entrada do usuário
- Timeout nas requisições de API
- Limpeza automática de sessões antigas

## 🐛 Troubleshooting

### Bot não conecta
- Verifique se o QR Code foi escaneado corretamente
- Certifique-se que o WhatsApp está ativo no celular
- Tente resetar a sessão

### Erro nas APIs
- Verifique se as URLs estão corretas
- Teste as APIs manualmente
- Verifique logs do servidor

### Performance
- Use PM2 para gerenciamento de processos
- Configure logs rotativos
- Monitore uso de memória

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@sdplay.com
- 💬 WhatsApp: (11) 99999-9999
- 🌐 Site: https://sdplay.com

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ pela equipe SD PLAY**