import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OmmyAgent } from './agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const agent = new OmmyAgent();

app.use(express.json());

// CORS para permitir llamadas desde el storefront de Shopify
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Rate limiting: máx 20 mensajes por minuto por IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes. Espera un momento.' },
});

// Servir el widget JS como archivo estático
app.use('/widget', express.static(join(__dirname, '../public'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=3600'),
}));

/**
 * POST /chat
 * Body: { session_id: string, message: string, lang?: 'es'|'en' }
 * Response: { reply: string }
 */
app.post('/chat', chatLimiter, async (req, res) => {
  const { session_id, message, lang, customer, viewed_products } = req.body;

  if (!session_id || !message) {
    return res.status(400).json({ error: 'Se requiere session_id y message' });
  }

  try {
    const reply = await agent.chat(session_id, message, lang, customer, viewed_products);
    res.json({ reply });
  } catch (err) {
    console.error('Error en el agente:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /collections — devuelve colecciones sin pasar por el LLM
 */
app.get('/collections', async (req, res) => {
  try {
    const { getCollections } = await import('./shopify.js');
    const collections = await getCollections({ limit: 20 });
    res.json({ collections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /chat/:session_id
 * Limpia el historial de conversación de una sesión
 */
app.delete('/chat/:session_id', (req, res) => {
  agent.clearSession(req.params.session_id);
  res.json({ ok: true });
});

/**
 * GET /ommy-chat  ← OAuth callback de Shopify
 */
app.get('/ommy-chat', async (req, res) => {
  const { code, shop, hmac, state } = req.query;

  if (!code || !shop) {
    return res.status(400).send('Faltan parámetros OAuth');
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    });
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    console.log('\nShopify status:', tokenRes.status, tokenRes.url);
    const text = await tokenRes.text();
    console.log('\nRespuesta Shopify OAuth:', text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (data.access_token) {
      console.log('\n✅ ACCESS TOKEN:', data.access_token);
      res.send(`<h2>✅ Token obtenido</h2><pre>${JSON.stringify(data, null, 2)}</pre>`);
    } else {
      res.send(`<h2>❌ Error de Shopify</h2><pre>${JSON.stringify(data, null, 2)}</pre>`);
    }
  } catch (err) {
    console.error('Error OAuth:', err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'ommy-chat' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ommy Chat corriendo en http://localhost:${PORT}`);
});
