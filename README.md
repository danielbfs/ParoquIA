# ParoquIA - Assistente Pastoral Inteligente

ParoquIA é um sistema de gestão e automação para paróquias, integrando inteligência artificial (Gemini) com canais de comunicação como WhatsApp para facilitar o atendimento, gestão de dízimos, eventos e paroquianos.

## 🚀 Funcionalidades

- **Dashboard Pastoral:** Visão geral de transações, mensagens pendentes e próximos eventos.
- **Gestão de Mensagens:** Histórico de conversas agrupado por remetente com análise de sentimento e categoria via IA.
- **Intervenção Humana:** Possibilidade de pausar a IA para resposta manual e retomar o atendimento automatizado.
- **Treinamento Continuado:** Sistema de críticas e correções para as respostas da IA, armazenadas para futuras melhorias.
- **Financeiro:** Gestão de dízimos e doações integradas.
- **Eventos:** Calendário paroquial e agendamentos.
- **Integração WhatsApp:** Conexão via Evolution API para automação real.

## 🛠️ Tecnologias

- **Frontend:** React + Tailwind CSS + Lucide Icons + Motion
- **Backend:** Express (Node.js) + Vite Middleware
- **IA:** Google Gemini SDK (@google/genai)
- **Banco de Dados:** Firebase Firestore
- **Autenticação:** Firebase Auth (Google Login)

## 📋 Pré-requisitos

- Node.js 18 ou superior
- Conta no Firebase Console
- API Key do Google Gemini

## 🔧 Configuração

1. Clone o repositório:
```bash
git clone https://github.com/danielbfs/ParoquIA.git
cd ParoquIA
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` baseado no `.env.example`:
```env
GEMINI_API_KEY=sua_chave_aqui
VITE_EVOLUTION_API_URL=transmissao_evolution_url
VITE_EVOLUTION_API_KEY=sua_chave_api_evolution
VITE_EVOLUTION_INSTANCE_NAME=nome_da_instancia
```

4. Configure o Firebase:
Substitua o arquivo `firebase-applet-config.json` com as suas credenciais do projeto Firebase.

## 🚀 Executando o Projeto

### Desenvolvimento
```bash
npm run dev
```

### Produção (Build)
```bash
npm run build
npm start
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.
