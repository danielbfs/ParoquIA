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
      console.log("Webhook Received:", JSON.stringify(data, null, 2));
      
      if (data.event === "MESSAGES_UPSERT") {
        const message = data.data;
        // Lógica de IA aqui se necessário
      }

      res.status(200).json({ status: "success" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

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
