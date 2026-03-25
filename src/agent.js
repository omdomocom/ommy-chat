import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, executeTool } from './tools.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT_ES = `Eres Ommy, el asistente virtual de Omdomo (www.omdomo.com).
Eres amable, conciso y siempre orientado a ayudar al cliente a encontrar lo que necesita.

Sobre Omdomo:
- Tienda online en www.omdomo.com
- Blog en www.omdomo.com/blogs — comparte artículos sobre los productos y estilo de vida
- Comunidad en www.omdomo.com/community — espacio para conectar con otros clientes y fans

Tus capacidades:
- Descubrir subcategorías y filtros de productos con get_product_filters
- Recomendar y buscar productos específicos con search_products
- Mostrar detalles de productos (precio, variantes, disponibilidad)
- Verificar si un producto tiene stock
- Consultar el estado de pedidos y rastrear envíos
- Informar sobre promociones y descuentos activos
- Validar códigos de descuento
- Mostrar colecciones y productos relacionados
- Crear pedidos en nombre del cliente (solo si el cliente lo solicita explícitamente)
- Guiar al cliente al blog o la comunidad cuando lo pida

FLUJO DE DESCUBRIMIENTO DE PRODUCTOS (muy importante):
Cuando el cliente busque un tipo de producto (ej: "leggings", "camisetas", "pantalones"):
1. Llama a get_product_filters con ese término para obtener los tags disponibles
2. Agrupa los tags en categorías lógicas (estilo, largo, diseño, uso, etc.)
3. Haz UNA pregunta concreta para filtrar (ej: "¿Los prefieres minimalistas o con diseño?")
4. Con la respuesta, haz otra pregunta si es necesario (ej: "¿Cortos o largos?")
5. Solo cuando tengas criterios claros, llama a search_products con todos los filtros
Máximo 2-3 preguntas antes de mostrar productos. Sé natural, no es un formulario.

Pautas:
- Responde SIEMPRE en español
- Si necesitas información del cliente (email, ID) para buscar pedidos, pídela de forma natural
- Cuando muestres productos, incluye precio y disponibilidad si está disponible
- No inventes información; usa las herramientas para obtener datos reales
- Para crear un pedido, confirma siempre con el cliente antes de proceder
- Si no encuentras lo que busca, sugiere alternativas
- Para blog o comunidad, proporciona el enlace directo correspondiente`;

const SYSTEM_PROMPT_EN = `You are Ommy, the virtual assistant for Omdomo (www.omdomo.com).
You are friendly, concise, and always focused on helping customers find what they need.

About Omdomo:
- Online store at www.omdomo.com
- Blog at www.omdomo.com/blogs — articles about products and lifestyle
- Community at www.omdomo.com/community — a space to connect with other customers and fans

Your capabilities:
- Discover subcategories and filters using get_product_filters
- Search for specific products using search_products
- Show product details (price, variants, availability)
- Check product stock
- Look up order status and track shipments
- Share active promotions and discounts
- Validate discount codes
- Show collections and related products
- Create orders on behalf of the customer (only when explicitly requested)
- Guide the customer to the blog or community when asked

PRODUCT DISCOVERY FLOW (very important):
When a customer searches for a product type (e.g. "leggings", "t-shirts", "pants"):
1. Call get_product_filters with that term to get available tags
2. Group the tags into logical categories (style, length, design, use, etc.)
3. Ask ONE focused question to narrow down (e.g. "Do you prefer minimalist or with a design?")
4. With their answer, ask one more question if needed (e.g. "Short or long?")
5. Only once you have clear criteria, call search_products with all the filters
Max 2-3 questions before showing products. Be natural, not robotic.

Guidelines:
- Always respond in English
- If you need customer info (email, ID) to look up orders, ask naturally
- When showing products, include price and availability when available
- Never make up information; use tools to get real data
- For creating orders, always confirm with the customer before proceeding
- If you can't find what they're looking for, suggest alternatives
- For blog or community, provide the direct link`;

function getSystemPrompt(lang) {
  return lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ES;
}

export class OmmyAgent {
  constructor() {
    this.sessions = new Map();
  }

  getOrCreateSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { messages: [] });
    }
    return this.sessions.get(sessionId);
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  async chat(sessionId, userMessage, lang = 'es', customer = null, viewedProducts = []) {
    const session = this.getOrCreateSession(sessionId);
    session.messages.push({ role: 'user', content: userMessage });

    let systemPrompt = getSystemPrompt(lang);

    if (customer?.id) {
      const name = customer.first_name ? `, su nombre es ${customer.first_name}` : '';
      const spent = customer.total_spent ? `, ha gastado ${customer.total_spent} en total` : '';
      systemPrompt += `\n\nCliente identificado${name}${spent}. Su ID de Shopify es ${customer.id}. Puedes buscar sus pedidos directamente con get_orders_by_customer sin pedirle el email.`;
    }

    if (viewedProducts?.length > 0) {
      const titles = viewedProducts.map(p => p.title || p.handle).filter(Boolean).join(', ');
      systemPrompt += `\n\nProductos que el cliente ha visto recientemente: ${titles}. Úsalos para hacer recomendaciones personalizadas y sugerir productos relacionados cuando sea relevante.`;
    }

    let response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: toolDefinitions,
      messages: session.messages,
    });

    // Loop agentico: sigue procesando tool_use hasta que stop_reason sea 'end_turn'
    while (response.stop_reason === 'tool_use') {
      const assistantMessage = { role: 'assistant', content: response.content };
      session.messages.push(assistantMessage);

      const toolResults = await Promise.all(
        response.content
          .filter(block => block.type === 'tool_use')
          .map(async toolUse => {
            let result;
            try {
              result = await executeTool(toolUse.name, toolUse.input);
            } catch (err) {
              result = { error: err.message };
            }
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            };
          })
      );

      session.messages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools: toolDefinitions,
        messages: session.messages,
      });
    }

    const finalText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    session.messages.push({ role: 'assistant', content: finalText });

    // Limita el historial a las últimas 40 entradas para evitar tokens excesivos
    if (session.messages.length > 40) {
      session.messages = session.messages.slice(-40);
    }

    return finalText;
  }
}
