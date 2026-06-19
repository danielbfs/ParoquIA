# Design — ParoquIA: Landing Page Pública + Configuração Externalizada

- **Data:** 2026-06-19
- **Autor:** Daniel Silva (danielbfs@gmail.com) + assistência de IA
- **Status:** Aprovado para planejamento
- **Repositório:** https://github.com/danielbfs/ParoquIA

> Este documento registra **todas as decisões de design** para a próxima evolução do
> ParoquIA, de forma autossuficiente para que qualquer IA ou desenvolvedor possa
> implementar sem precisar reconstruir o contexto. Leia também o `README.md` para a
> visão geral do produto.

---

## 1. Objetivo

Adicionar uma **landing page pública** para a paróquia e **externalizar a configuração**
de banco de dados e de IA para variáveis de ambiente, sem reescrever a camada de
persistência atual.

O sistema hoje é uma SPA React (uma única tela protegida por login). Vamos transformá-lo
em um site com **duas faces**:

1. **Pública** (`/`): landing page institucional da paróquia.
2. **Interna** (`/app`): o painel pastoral existente, atrás de login.

---

## 2. Decisões fechadas (resumo)

| Tema | Decisão |
|------|---------|
| Banco de dados | **Manter Firestore**. Apenas garantir que toda configuração venha de env (nada hardcoded). Sem multi-banco agora. |
| Provedor de IA | **Manter Gemini**, mas ler provedor/modelo/chave de env e estruturar o serviço para troca futura. |
| Imagens (logo + eventos) | **Firebase Storage**. Upload via SDK; guardar apenas a URL no Firestore. |
| Formulário de contato | **Enviar e-mail real pelo servidor via SMTP** (nodemailer + credenciais em env). |
| Calendário | **Lista de próximos eventos + grade mensal** (somente leitura, incluindo eventos recorrentes). |
| Rotas | **Adicionar `react-router-dom`**: `/` = landing pública, `/app` = painel interno. |
| Cadastro de usuários | **Somente admin** cadastra pessoas e define papéis (mantém o portão de e-mails autorizados já existente). |

---

## 3. Escopo

### Dentro do escopo
- Landing page pública responsiva com: hero (nome + imagem), contato, formulário de
  mensagem (e-mail), seção de eventos e calendário.
- Roteamento entre página pública e app interno.
- Upload de imagem da paróquia (hero) e de imagens por evento na Administração.
- Externalização de configuração de banco e de IA para env.
- Envio de e-mail via SMTP a partir do formulário público.

### Fora do escopo (explicitamente adiado)
- Suporte real a múltiplos bancos (Postgres/Mongo/etc.) — apenas estruturação leve.
- Camada de provedores de IA plugável completa (OpenAI/Claude/etc.) — apenas env.
- Autocadastro público de usuários (proibido por design).
- Exportar eventos em `.ics` / "adicionar à minha agenda".

---

## 4. Arquitetura

### 4.1 Roteamento (novo)
Adicionar `react-router-dom`. Estrutura proposta:

```
/            -> LandingPage   (pública, sem autenticação)
/app         -> AppShell      (painel atual; exige login + autorização)
/app/*       -> abas internas (dashboard, messages, finance, ...)
```

- `App.tsx` atual vira o conteúdo de `/app` (renomeado para algo como `AppShell`/`Painel`).
- A lógica de auth/autorização que hoje vive em `App.tsx` envolve apenas as rotas `/app*`.
- A landing page **não** inicializa nem depende de login.
- O botão **"Entrar"** na landing navega para `/app` (que dispara o login Google se não
  autenticado).

### 4.2 Camada de configuração (externalização)
Centralizar a leitura de env num único módulo de config por contexto:

- **Cliente** (`import.meta.env.VITE_*`): Firebase web config (já existe em
  `src/lib/firebase.ts`).
- **Servidor** (`process.env.*`): Firebase Admin, IA, SMTP.

Regra: **nenhum** valor sensível ou específico de ambiente fica hardcoded no código.
O fallback para `firebase-applet-config.json` continua existindo apenas para o ambiente
AI Studio, mas env sempre tem prioridade (comportamento atual em `firebase.ts`).

### 4.3 Camada de IA (estruturação leve)
Refatorar `src/services/geminiService.ts` (e o trecho de IA em `server.ts`) para ler:

- `AI_PROVIDER` (default: `gemini`)
- `AI_MODEL` (default: `gemini-3-flash-preview`)
- `AI_API_KEY` (fallback para `GEMINI_API_KEY` por compatibilidade)

O modelo **não** deve ficar hardcoded em string. Hoje aparece fixo
(`"gemini-3-flash-preview"`) em `geminiService.ts:33,40` e `server.ts:78,94` — passar a
ler de config. A estrutura deve isolar a chamada ao provedor numa função única para
facilitar trocar de provedor depois.

### 4.4 Armazenamento de imagens
Usar **Firebase Storage** (já há `storageBucket` na config).

- Upload no cliente (admin) via SDK `firebase/storage`.
- Guardar somente a **URL pública** no documento Firestore correspondente.
- Imagens: logo/foto da paróquia (`SystemConfig.heroImageUrl`) e imagem por evento
  (`Event.imageUrl`).

### 4.5 Envio de e-mail (formulário de contato)
Novo endpoint no servidor Express, ex.: `POST /api/contact`.

- Recebe `{ name, email, phone, message }`.
- Envia e-mail via **nodemailer** usando credenciais SMTP de env.
- Destinatário: `CONTACT_EMAIL_TO` (e-mail da paróquia).
- Retorna status para a landing exibir sucesso/erro.
- **Não** persiste no Firestore (decisão: contato vai direto por e-mail).
- Validação básica de entrada + proteção simples contra abuso (ex.: honeypot ou
  rate-limit leve) — detalhar no plano.

---

## 5. Modelo de dados (mudanças)

### `SystemConfig` (estende o tipo atual em `src/types/index.ts`)
```ts
interface SystemConfig {
  // ...campos atuais...
  heroImageUrl?: string;   // imagem/logo da paróquia exibida na landing
  address?: string;        // endereço para a seção de contato
  phone?: string;          // telefone de contato
  email?: string;          // e-mail institucional exibido
  contactEmailTo?: string; // destino do formulário (se diferente do email exibido)
}
```
> Observação: `phone`/`email`/`address` já existem no tipo `Parish`, mas a Administração
> edita `SystemConfig`. Vamos adicionar esses campos a `SystemConfig` para que sejam
> editáveis na aba **Administração → Geral**.

### `Event` (estende o tipo atual)
```ts
interface Event {
  // ...campos atuais...
  imageUrl?: string;   // imagem do evento exibida nos cards da landing
  startTime?: string;  // "HH:mm" — início (período)
  endTime?: string;    // "HH:mm" — fim (período), opcional
}
```
> `recurrenceTime` já existe para recorrentes; `startTime`/`endTime` cobrem o "período"
> de eventos pontuais exibido nos cards.

---

## 6. Componentes de frontend (novos)

```
src/pages/LandingPage.tsx        // página pública (orquestra as seções)
src/components/landing/
  Hero.tsx                       // nome + imagem + botão "Entrar"
  ContactSection.tsx             // info de contato + formulário (POST /api/contact)
  EventsSection.tsx              // cards dos próximos eventos
  EventCalendar.tsx              // grade mensal (somente leitura) + lista
```

- Reaproveitar o design system atual (Tailwind, paleta `#5A5A40`, Lucide, Motion).
- A landing lê eventos e config do Firestore em modo leitura. **Decisão de implementação
  a confirmar no plano:** acesso público de leitura precisa de regra no
  `firestore.rules` (liberar leitura de `events` e `config` públicos) **ou** um endpoint
  público no servidor que use o Admin SDK. Preferência inicial: endpoint no servidor
  (`GET /api/public/landing`) para não expor a base ao cliente anônimo.

---

## 7. Variáveis de ambiente (novas / atualizadas)

Adicionar ao `.env.example`:

```env
# IA (genérico)
AI_PROVIDER=gemini
AI_MODEL=gemini-3-flash-preview
AI_API_KEY=            # fallback: GEMINI_API_KEY

# SMTP (formulário de contato)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
CONTACT_EMAIL_TO=      # e-mail da paróquia que recebe os contatos
```

Manter as existentes (Evolution, Firebase, GEMINI_API_KEY por compatibilidade).

---

## 8. Tratamento de erros

- **Formulário de contato:** falha de SMTP → mensagem amigável na landing, log no
  servidor; nunca expor stack ao usuário público.
- **Upload de imagem:** validar tipo/tamanho antes do upload; feedback de progresso e erro
  na Administração.
- **Leitura pública (eventos/config):** se o endpoint público falhar, a landing degrada
  graciosamente (esconde a seção em vez de quebrar a página).

---

## 9. Testes

- **Endpoint `/api/contact`:** teste do fluxo de envio (mock do transporte SMTP),
  validação de entrada e caminho de erro.
- **Leitura de config de IA:** garantir que `AI_MODEL`/`AI_PROVIDER` são respeitados e
  que há fallback correto.
- **Componentes da landing:** render dos eventos (incluindo recorrentes no calendário) e
  estados vazios.
- Seguir TDD onde aplicável (ver skill `test-driven-development`).

---

## 10. Sequenciamento sugerido (sub-projetos)

A implementação será detalhada em um plano (skill `writing-plans`). Ordem sugerida:

1. **Roteamento + AppShell** — extrair o painel atual para `/app`, criar shell de `/`.
2. **Externalização de config (IA + env)** — remover modelo hardcoded, novas envs.
3. **Administração: imagem da paróquia + campos de contato + imagem de evento** (Storage).
4. **Endpoint público de leitura** (`/api/public/landing`).
5. **Landing page** — Hero, Contato, Eventos, Calendário.
6. **Endpoint de contato SMTP** + formulário ligado.
7. **Testes + documentação final.**

---

## 11. Riscos e pontos de atenção

- **Regras do Firestore vs. leitura pública:** decidir cedo entre liberar leitura pública
  ou usar endpoint do servidor (recomendado: servidor).
- **Firebase Storage:** exige `storageBucket` configurado e regras de Storage para upload
  autenticado (admin) e leitura pública das imagens.
- **SMTP:** depende de credenciais válidas; em dev pode-se usar um mock/ethereal.
- **Compatibilidade:** manter `GEMINI_API_KEY` funcionando para não quebrar deploys atuais.
