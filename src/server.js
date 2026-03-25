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
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Rate limiting: máx 10 mensajes por minuto por IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes. Espera un momento.' },
});

// Servir el widget JS como archivo estático
app.use('/widget', express.static(join(__dirname, '../public'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'),
}));

/**
 * POST /chat
 * Body: { session_id, message, lang?, customer?, viewed_products? }
 * Response: { reply, products? }
 */
app.post('/chat', chatLimiter, async (req, res) => {
  const { session_id, message, lang, customer, viewed_products } = req.body;

  if (!session_id || !message) {
    return res.status(400).json({ error: 'Se requiere session_id y message' });
  }

  try {
    const result = await agent.chat(session_id, message, lang, customer, viewed_products);
    res.json(result);
  } catch (err) {
    console.error('Error en el agente:', err);
    res.status(500).json({ error: 'Error procesando tu mensaje. Por favor intenta de nuevo.' });
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
 * POST /feedback — registra feedback de una respuesta del agente
 */
app.post('/feedback', async (req, res) => {
  const { session_id, message_index, value } = req.body;
  console.log(`Feedback [${value}] session=${session_id} msg=${message_index}`);
  res.json({ ok: true });
});

/**
 * DELETE /chat/:session_id — limpia el historial
 */
app.delete('/chat/:session_id', async (req, res) => {
  await agent.clearSession(req.params.session_id);
  res.json({ ok: true });
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
