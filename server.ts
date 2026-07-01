import express from "express";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { initEvolutionApi } from "./src/services/evolutionApiServer";

// Segredo interno compartilhado para chamadas server->server (mesma chave usada pela
// Evolution API interna). EVOLUTION_INTERNAL_KEY (novo) com fallback para VITE_EVOLUTION_API_KEY.
const getInternalKey = (): string | undefined =>
  process.env.EVOLUTION_INTERNAL_KEY || process.env.VITE_EVOLUTION_API_KEY;

// Comparação em tempo constante que tolera tamanhos diferentes sem lançar exceção.
const safeKeyEquals = (provided: unknown, expected: string): boolean => {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// Config de IA lida de env (spec §4.3). A chave NUNCA vai para o bundle do cliente:
// as chamadas Gemini do front passam pelo endpoint /api/ai/chat deste servidor.
const AI_MODEL = process.env.AI_MODEL || "gemini-3-flash-preview";
const AI_API_KEY = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Internal Evolution API (Port 3000)
  initEvolutionApi(app);

  // Endpoint do Webhook para Evolution API (receberá do baileys interno)
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      // Verificação do segredo compartilhado: o produtor é o próprio processo Baileys
      // (evolutionApiServer.ts), que envia o header x-webhook-secret com a mesma chave do env.
      const expectedSecret = getInternalKey();
      if (!expectedSecret) {
        console.warn("[Webhook] Nenhuma chave configurada (EVOLUTION_INTERNAL_KEY/VITE_EVOLUTION_API_KEY). Negando webhook.");
        return res.status(401).json({ error: "Unauthorized: webhook secret not configured" });
      }
      if (!safeKeyEquals(req.headers["x-webhook-secret"], expectedSecret)) {
        return res.status(401).json({ error: "Unauthorized: invalid webhook secret" });
      }

      const data = req.body;
      const { adminDb } = await import("./src/lib/firebase-server");
      const { GoogleGenAI, Type } = await import("@google/genai");

      if (data.event === "MESSAGES_UPSERT") {
        const message = data.data;
        const instanceName = data.instance;
        const sender = message.key.remoteJid;
        const pushName = message.pushName || 'Paroquiano';
        
        // Extract text content
        const textContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text || 
                          message.message?.imageMessage?.caption || 
                          message.message?.videoMessage?.caption || "";

        const hasImage = !!message.message?.imageMessage;

        if (!textContent && !hasImage) {
           return res.status(200).json({ status: "ignored_empty" });
        }

        // 0. Download Media if present
        let attachmentUrl = "";
        if (hasImage) {
          try {
            const dlResponse = await fetch(`http://localhost:3000/api/evolution/message/downloadMedia/${instanceName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': getInternalKey() || '' },
              body: JSON.stringify({ message })
            });
            const dlData = await dlResponse.json();
            if (dlData.url) attachmentUrl = dlData.url;
          } catch (e) {
            console.error("Error downloading media in webhook:", e);
          }
        }

        // 1. Save message to Firestore
        const messageDoc = {
          content: textContent || "[Mídia Recebida]",
          senderName: pushName,
          senderPhone: sender.split('@')[0],
          createdAt: new Date().toISOString(),
          status: 'pending',
          source: 'whatsapp',
          attachmentUrl
        };
        const messageRef = await adminDb.collection('messages').add(messageDoc);

        // 2. Fetch System Config for Prompt
        const configSnap = await adminDb.collection('config').get();
        const config = configSnap.docs[0]?.data();
        const modalities = config?.paymentModalities || ['Dízimo', 'Oferta'];
        
        // 3. AI Analysis & Response Generation
        const ai = new GoogleGenAI({ apiKey: AI_API_KEY });
        const model = ai.models.generateContent({
          model: AI_MODEL,
          contents: `
            Você é o ParoquIA. 
            Instrução: ${config?.aiPrompt || 'Acolha o fiel e organize a informação.'}
            Contexto: O usuário "${pushName}" enviou uma mensagem.
            Mensagem: "${textContent}"
            Mídia: ${hasImage ? 'SIM (Foto/Comprovante)' : 'NÃO'}
            Modalidades Permitidas: ${modalities.join(', ')}

            Responda de forma acolhedora. Se parecer um pagamento, confirme os dados. Se faltar a modalidade, PERGUNTE.
          `
        });

        const [aiResponse, analysisResponse] = await Promise.all([
          model,
          ai.models.generateContent({
            model: AI_MODEL,
            contents: `Analise a mensagem: "${textContent}". Extraia se é um pagamento, valor e modalidade (se informada).`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isPayment: { type: Type.BOOLEAN },
                  amount: { type: Type.NUMBER },
                  modality: { type: Type.STRING },
                  category: { type: Type.STRING },
                  sentiment: { type: Type.STRING }
                },
                required: ["isPayment", "category", "sentiment"]
              }
            }
          })
        ]);

        const analysis = JSON.parse((await analysisResponse).text || '{}');
        const replyText = (await aiResponse).text;

        // 4. Update message with AI data
        await messageRef.update({
          aiCategory: analysis.category,
          aiSentiment: analysis.sentiment,
          suggestedResponse: replyText,
          status: 'processed'
        });

        // 5. If it's a payment and we have enough data, pre-register a transaction
        if (analysis.isPayment && analysis.amount) {
          await adminDb.collection('transactions').add({
            type: 'event', // Default to event if modality is specific, or tithe/offering
            amount: analysis.amount,
            parishionerName: pushName,
            date: new Date().toISOString(),
            modality: analysis.modality || 'A confirmar',
            isProcessed: false,
            notes: `Auto-detectado de WhatsApp: ${textContent}`,
            attachmentUrl
          });
        }

        // 6. Send Response via WhatsApp (Self-reply)
        await fetch(`http://localhost:3000/api/evolution/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getInternalKey() || ''
          },
          body: JSON.stringify({
            number: sender,
            text: replyText
          })
        });
      }

      res.status(200).json({ status: "success" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // POST /api/ai/chat: proxy server-side das chamadas Gemini do painel (Teste de Chat).
  // A chave da IA fica só no servidor (não vai para o bundle do cliente). Exige um
  // ID token Firebase válido para evitar abuso anônimo da API paga.
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) return res.status(401).json({ error: "Unauthorized" });
      const { adminAuth } = await import("./src/lib/firebase-server");
      try {
        await adminAuth.verifyIdToken(idToken);
      } catch {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { message, history = [], context = "", customPrompt } = req.body || {};
      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "O campo 'message' é obrigatório." });
      }
      if (!AI_API_KEY) {
        return res.status(503).json({ error: "IA não configurada no servidor." });
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: AI_API_KEY });

      const histText = (Array.isArray(history) ? history : [])
        .map((h: any) => `${h.role === "ai" ? "IA" : "Usuário"}: ${h.content}`)
        .join("\n");

      const prompt = `
        SISTEMA (Instrução):
        ${customPrompt || "Você é o ParoquIA, um assistente pastoral inteligente. Seja acolhedor, use linguagem cristã moderada e ajude com informações da paróquia."}

        CONTEXTO DO SISTEMA (Dados Atuais):
        ${context}

        INSTRUÇÃO ADICIONAL:
        Se o usuário enviou algo que parece um comprovante ou fala sobre pagamento e você não sabe o objetivo (Dízimo, Oferta, Festa, etc), você DEVE perguntar educadamente qual a finalidade para podermos registrar corretamente.

        HISTÓRICO DA CONVERSA:
        ${histText}

        NOVA MENSAGEM DO USUÁRIO:
        ${message}

        IA:
      `;

      const response = await ai.models.generateContent({ model: AI_MODEL, contents: prompt });
      const responseText = response.text || "Paz de Cristo! Como posso te ajudar?";

      const analysisResponse = await ai.models.generateContent({
        model: AI_MODEL,
        contents: `Analise brevemente esta mensagem de usuário: "${message}". Extraia categoria e sentimento.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { category: { type: Type.STRING }, sentiment: { type: Type.STRING } },
            required: ["category", "sentiment"],
          },
        },
      });

      let analysis;
      try {
        analysis = JSON.parse(analysisResponse.text || '{"category":"Outros","sentiment":"Neutro"}');
      } catch {
        analysis = { category: "Outros", sentiment: "Neutro" };
      }

      res.status(200).json({ text: responseText, analysis });
    } catch (error) {
      console.error("Error in POST /api/ai/chat:", error);
      res.status(500).json({
        text: "Paz de Cristo! No momento estou passando por uma manutenção técnica, mas em breve poderei te ajudar melhor.",
        analysis: { category: "Erro", sentiment: "Neutro" },
      });
    }
  });

  // GET /api/public/landing: Busca a configuração da paróquia e eventos cadastrados
  app.get("/api/public/landing", async (req, res) => {
    try {
      const { adminDb } = await import("./src/lib/firebase-server");

      // 1. Busca a configuração da paróquia na coleção 'config' (pegando o primeiro documento)
      const configSnap = await adminDb.collection("config").get();
      const rawConfig = configSnap.docs[0]?.data() || null;

      // 1.1. Allowlist: expõe SOMENTE os campos públicos consumidos pela landing page.
      // NUNCA retornar segredos (evolutionApiKey, evolutionApiUrl, evolutionInstanceName,
      // aiPrompt, contactEmailTo) nem campos internos não usados publicamente.
      const config = rawConfig
        ? {
            parishName: rawConfig.parishName ?? null,
            heroImageUrl: rawConfig.heroImageUrl ?? null,
            address: rawConfig.address ?? null,
            phone: rawConfig.phone ?? null,
            email: rawConfig.email ?? null,
            pixKey: rawConfig.pixKey ?? null,
            whatsappNumber: rawConfig.whatsappNumber ?? null,
            priestName: rawConfig.priestName ?? null,
            priestRole: rawConfig.priestRole ?? null,
            priestPhotoUrl: rawConfig.priestPhotoUrl ?? null,
            priestMessage: rawConfig.priestMessage ?? null,
            mapEmbedUrl: rawConfig.mapEmbedUrl ?? null,
          }
        : null;

      // 2. Busca os eventos cadastrados na coleção 'events'
      const eventsSnap = await adminDb.collection("events").get();
      const events = eventsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 3. Busca as obras paroquiais ativas (isActive !== false)
      const worksSnap = await adminDb.collection("works").get();
      const works = worksSnap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
        .filter((w: any) => w.isActive !== false);

      // 4. Busca as comunidades ativas (isActive !== false), ordenadas por `order`
      const communitiesSnap = await adminDb.collection("communities").get();
      const communities = communitiesSnap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
        .filter((c: any) => c.isActive !== false)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

      res.status(200).json({
        config,
        events,
        works,
        communities
      });
    } catch (error) {
      console.error("Error in GET /api/public/landing:", error);
      res.status(500).json({ error: "Erro ao buscar as informações da página inicial." });
    }
  });

  // POST /api/contact: Recebe as informações do formulário de contato e envia e-mail via nodemailer
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;

      // Validação dos campos obrigatórios
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Os campos Nome, E-mail e Mensagem são obrigatórios." });
      }

      const smtpHost = process.env.SMTP_HOST;
      const smtpPortStr = process.env.SMTP_PORT;
      const smtpPort = smtpPortStr ? parseInt(smtpPortStr, 10) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || smtpUser;
      const contactEmailTo = process.env.CONTACT_EMAIL_TO;

      // Verifica se as credenciais do SMTP estão preenchidas nas variáveis de ambiente
      const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass && contactEmailTo);

      if (isSmtpConfigured) {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const mailOptions = {
          from: smtpFrom,
          to: contactEmailTo,
          subject: `Novo contato de ${name}`,
          text: `Nome: ${name}\nE-mail: ${email}\nTelefone: ${phone || "Não informado"}\nMensagem: ${message}`,
          html: `
            <h3>Novo contato recebido do formulário de contato</h3>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>E-mail:</strong> ${email}</p>
            <p><strong>Telefone:</strong> ${phone || "Não informado"}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${message.replace(/\n/g, "<br>")}</p>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Contato enviado com sucesso por e-mail para ${contactEmailTo}`);
      } else {
        // Se as credenciais do SMTP não estiverem preenchidas, simula o envio de e-mail (para dev local)
        console.log("SMTP não configurado. Simulando envio de e-mail com os dados:", {
          name,
          email,
          phone,
          message,
          contactEmailTo
        });
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error in POST /api/contact:", error);
      res.status(500).json({ error: error.message || "Erro ao processar o formulário de contato." });
    }
  });

  // Serve media files
  // TODO(segurança): /media público expõe comprovantes — migrar para Storage com URL assinada
  app.use('/media', express.static(path.join(process.cwd(), 'dist', 'media')));

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Webhook disponível em: http://localhost:${PORT}/api/webhook/whatsapp`);
  });
}

startServer();
