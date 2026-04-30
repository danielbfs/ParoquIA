import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initEvolutionApi } from "./src/services/evolutionApiServer";

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
              headers: { 'Content-Type': 'application/json', 'apikey': 'INTERNAL' },
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
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const model = ai.models.generateContent({
          model: "gemini-3-flash-preview",
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
            model: "gemini-3-flash-preview",
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
            'apikey': 'INTERNAL'
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

  // Serve media files
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
