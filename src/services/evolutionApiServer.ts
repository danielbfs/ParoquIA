import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import QRCode from 'qrcode';
import fs from 'fs';
import pino from 'pino';
import crypto from 'crypto';

const logger = pino({ level: 'silent' });

// Resolve o segredo interno usado para autenticar as chamadas server->server
// (self-reply do webhook, download de mídia, webhook do Baileys).
// Usa EVOLUTION_INTERNAL_KEY (novo) com fallback para VITE_EVOLUTION_API_KEY (já existente).
const getInternalKey = (): string | undefined =>
  process.env.EVOLUTION_INTERNAL_KEY || process.env.VITE_EVOLUTION_API_KEY;

// Comparação em tempo constante que tolera tamanhos diferentes sem lançar exceção.
const safeKeyEquals = (provided: unknown, expected: string): boolean => {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

interface Instance {
  name: string;
  socket: WASocket | null;
  qr: string | null;
  state: 'connecting' | 'open' | 'close' | 'refused';
  webhook?: string;
}

const instances = new Map<string, Instance>();

// Ensure media dir exists
const mediaDir = path.join(process.cwd(), 'dist', 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

export const initEvolutionApi = (app: any) => {
  // Ensure instances dir exists
  const sessionsDir = path.join(process.cwd(), 'instances');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
  }

  // Middleware for API key
  app.use((req: any, res: any, next: any) => {
    // Only protect paths starting with /api/evolution
    if (req.path.startsWith('/api/evolution/instance') ||
        req.path.startsWith('/api/evolution/webhook') ||
        req.path.startsWith('/api/evolution/message')) {
      const expectedKey = getInternalKey();
      // Fail-safe: sem segredo configurado, NÃO liberar geral — negar as rotas protegidas.
      if (!expectedKey) {
        console.warn('[Evolution] Nenhuma chave configurada (EVOLUTION_INTERNAL_KEY/VITE_EVOLUTION_API_KEY). Negando rotas protegidas.');
        return res.status(401).json({ error: 'Unauthorized: API Key not configured' });
      }
      const apiKey = req.headers.apikey;
      if (!safeKeyEquals(apiKey, expectedKey)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
      }
    }
    next();
  });

  const createInstance = async (name: string) => {
    if (instances.has(name)) return instances.get(name);

    const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionsDir, name));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
    });

    const instance: Instance = {
      name,
      socket: sock,
      qr: null,
      state: 'connecting'
    };
    instances.set(name, instance);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        instance.qr = await QRCode.toDataURL(qr);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        instance.state = 'close';
        if (shouldReconnect) {
          createInstance(name);
        }
      } else if (connection === 'open') {
        instance.state = 'open';
        instance.qr = null;
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      if (instance.webhook && m.type === 'notify') {
        try {
          // Inclui o segredo compartilhado para que o consumidor (server.ts) possa
          // validar que o POST veio deste processo Baileys, e não de um terceiro.
          const webhookSecret = getInternalKey();
          await fetch(instance.webhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {})
            },
            body: JSON.stringify({
              event: 'MESSAGES_UPSERT',
              instance: name,
              data: m.messages[0]
            })
          });
        } catch (e) {
          console.error('Webhook error:', e);
        }
      }
    });

    return instance;
  };

  app.post('/api/evolution/message/sendText/:name', async (req: any, res: any) => {
    const instance = instances.get(req.params.name);
    if (!instance || !instance.socket) return res.status(404).json({ error: 'Instance not found/ready' });
    
    const { number, text } = req.body;
    if (!number || !text) return res.status(400).json({ error: 'Number and text required' });

    try {
      const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
      await instance.socket.sendMessage(jid, { text });
      res.json({ status: 'SUCCESS' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/evolution/message/downloadMedia/:name', async (req: any, res: any) => {
    const instance = instances.get(req.params.name);
    if (!instance || !instance.socket) return res.status(404).json({ error: 'Instance not found/ready' });
    
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message object required' });

    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        { 
          logger,
          reuploadRequest: instance.socket.updateMediaMessage
        }
      );

      const msgId = message.key.id;
      const fileName = `${msgId}.jpg`; // Defaulting to jpg for simplicity, can be improved
      const filePath = path.join(mediaDir, fileName);
      
      fs.writeFileSync(filePath, buffer);
      
      res.json({ status: 'SUCCESS', url: `/media/${fileName}` });
    } catch (e: any) {
      console.error('Download Media Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Endpoints using prefix /api/evolution
  app.get('/api/evolution/instance/fetchInstances', (req: any, res: any) => {
    const list = Array.from(instances.values()).map(i => ({
      instanceName: i.name,
      status: i.state
    }));
    res.json(list);
  });

  app.post('/api/evolution/instance/create', async (req: any, res: any) => {
    const { instanceName } = req.body;
    if (!instanceName) return res.status(400).json({ error: 'Name required' });
    
    await createInstance(instanceName);
    res.json({ status: 'SUCCESS', instance: instanceName });
  });

  app.get('/api/evolution/instance/connect/:name', (req: any, res: any) => {
    const instance = instances.get(req.params.name);
    if (!instance) return res.status(404).json({ error: 'Not found' });
    res.json({ base64: instance.qr });
  });

  app.get('/api/evolution/instance/connectionState/:name', (req: any, res: any) => {
    const instance = instances.get(req.params.name);
    if (!instance) return res.json({ instance: { state: 'not_found' } });
    res.json({ instance: { state: instance.state, instanceName: instance.name } });
  });

  app.post('/api/evolution/webhook/set/:name', (req: any, res: any) => {
    const instance = instances.get(req.params.name);
    if (!instance) return res.status(404).json({ error: 'Not found' });
    instance.webhook = req.body.url;
    res.json({ status: 'SUCCESS' });
  });
};
