# Auditoria do Sistema ParoquIA — 2026-06-30

Auditoria multi-agente (11 dimensões, verificação adversarial). Achados com
`arquivo:linha`. Severidade = pós-verificação quando houve verificador; itens
marcados **(não verificado)** tiveram o verificador interrompido por limite de
sessão — são achados de revisão ainda não confirmados adversarialmente.

> ⚠️ **Descoberta estrutural que afeta tudo:** `main.tsx` renderiza `App.tsx`, cujo
> roteador define `/app → PastoralPanel` (dentro do próprio `App.tsx`).
> **`AppShell.tsx` NÃO é importado — é código morto** (um refactor nunca ligado ao
> roteador). A UI viva do painel é o `App.tsx`. Correções feitas no `AppShell.tsx`
> não têm efeito em produção.

## Status das correções já aplicadas nesta sessão
- ✅ **VIVO** `firebase.ts` — `ignoreUndefinedProperties` (causa raiz do "nada salva").
- ✅ **VIVO** `server.ts` — allowlist no `/api/public/landing` (fechou vazamento de `evolutionApiKey`/`aiPrompt`).
- ⚠️ **EM CÓDIGO MORTO** `AppShell.tsx` — fixes de evento (descrição, validação de imagem/horário, nav. mês, fuso). Precisam ser refeitos no `App.tsx`.

## 🔴 CRÍTICO (produção, ação urgente)
1. **Chave Gemini vazada no bundle do cliente** — `vite.config.ts:10-14` injeta `GEMINI_API_KEY`/`AI_API_KEY` no `define`, consumida por `geminiService.ts` importado na SPA. Qualquer visitante extrai a chave (View Source/Network). **Rotacionar a chave já** e mover toda chamada Gemini para o servidor. *(verificado)*
2. **Bypass de auth na Evolution API interna** — `evolutionApiServer.ts:40-52`: aceita qualquer `apikey` ≥5 chars e o literal `INTERNAL`; servidor escuta em `0.0.0.0:3000`. Permite enviar WhatsApp, criar instâncias, trocar webhook. *(verificado: high)*
3. **Reconexão do WhatsApp quebrada** — `evolutionApiServer.ts:55,82-87`: o `close` chama `createInstance`, que tem early-return `if (instances.has(name)) return` → devolve socket morto, nunca recria. Após qualquer queda, fica offline até recriar manualmente. *(não verificado)*
4. **VITE_* e build / `.env` na imagem** — sem `.dockerignore`, o `COPY . .` embute `.env` e `service-account.json` nas camadas da imagem; o build do client só funciona porque o vite lê o `.env` copiado (a `environment:` do compose é runtime-only, inócua para `VITE_*`). Frágil e vaza segredos na imagem. *(não verificado)*

## 🟠 ALTO
- **Webhook `/api/webhook/whatsapp` anônimo** — `server.ts:18-24` fora do middleware; permite forjar eventos, gastar cota Gemini, gravar Firestore, disparar mensagens e injetar transações falsas. *(verificado)*
- **Comprovantes de pagamento públicos** — `server.ts:267` serve `/media` estático sem auth; `attachmentUrl` de transações/mensagens fica acessível por quem souber o id. *(verificado)*
- **SSRF** via `/api/evolution/webhook/set` sem validar URL. *(verificado)*
- **Sessões Baileys não restauradas no boot** — `evolutionApiServer.ts` não varre `instances/` no startup; após restart o WhatsApp fica offline. *(não verificado)*
- **Sem healthcheck** no compose — `restart:always` não cobre processo travado. *(não verificado)*
- **Modelo de dados órfão** — campos `SystemConfig.heroImageUrl/address/phone/email` e `Event.imageUrl/startTime/endTime` são lidos pela landing mas **nunca gravados pela UI viva (`App.tsx`)**; o cadastro deles existe só no `AppShell.tsx` (morto). *(não verificado)*

## 🟡 MÉDIO
- **server.ts não usa `AI_PROVIDER/AI_MODEL/AI_API_KEY`** e tem modelo hardcoded (`server.ts:76,78,94`) — viola spec §4.3 (o `geminiService.ts` já está conforme). *(verificado: medium)*
- **Injeção de prompt** — texto do WhatsApp interpolado cru no prompt (`server.ts:82-83,95`) alimentando auto-registro de transação (mitigado por `isProcessed:false`). *(verificado)*
- **IA sem timeout** — `server.ts:91-111` e `geminiService.ts` sem AbortController; webhook pode travar e gerar retries/duplicação. *(verificado)*
- **`/api/contact` sem rate-limit/honeypot** (spec §4.5 pedia) e **retorna `error.message`** ao cliente (§8). *(verificado)*
- **`/api/contact` sucesso silencioso** sem enviar e-mail quando SMTP não configurado. *(verificado)*
- **`contactEmailTo` nunca consumido** — `/api/contact` usa env, ignora o campo do config. *(não verificado)*
- **Mensagens gravadas no servidor divergem da interface `Message`**. *(não verificado)*
- **Sem dedupe/idempotência** no webhook → mensagens/transações duplicadas em reentrega. *(não verificado)*
- **`authorized_emails`/`profiles` legíveis por qualquer autenticado**; **`evolutionApiKey` no doc `config`** legível por autorizados. *(parcial)*
- **A11y da landing** — labels sem `htmlFor/id`, botões-ícone sem `aria-label`, contraste WCAG, sem `aria-live`, sem `prefers-reduced-motion`. *(não verificado)*

## 🟢 BAIXO / UX
- Eventos recorrentes **sem limite temporal** (aparecem em meses anteriores à criação) — `EventCalendar.tsx:36`. *(verificado: low)*
- "Próximos Eventos" **sem ordenação cronológica** — `EventsSection.tsx:14`. *(verificado: low)*
- Validação de horário **bloqueia vigílias** (cruza meia-noite) — `AppShell.tsx:2158` (live: ver App.tsx). *(verificado: low)*
- Calendário da landing **sem estado vazio**; visões **Semanal/Diária não implementadas** (placeholder). *(verificado: low)*
- Botão da landing diverge da spec ("Entrar"); sem meta description/SEO; imagens sem `onError`/lazy. *(não verificado)*
- Produção roda TS via `tsx` com Vite como dependência de runtime. *(não verificado)*

## Pontos positivos confirmados
- `firestore.rules` íntegro: default-deny explícito, `get()/exists()` seguros, validação por coleção; **publicado corretamente** no banco nomeado.
- `react-markdown` v10 sem `rehype-raw`/`allowDangerousHtml` → **sem XSS** via markdown; nenhum `dangerouslySetInnerHTML`.
- Recorrência/exclusão de eventos coerente entre as telas; edição de instância única correta.

## Decisão pendente (estrutural)
`App.tsx` (vivo) e `AppShell.tsx` (morto) são quase duplicados. Escolher um canônico:
- **(A)** Manter `App.tsx`, reaplicar nele os fixes de evento e **deletar `AppShell.tsx`**. (menor risco)
- **(B)** Finalizar o refactor: ligar `AppShell.tsx` ao roteador e **deletar `App.tsx`**. (alinha à intenção do refactor; risco maior)
