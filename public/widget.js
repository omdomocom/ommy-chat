(function () {
  'use strict';

  const script = document.currentScript;
  const API_URL = (script && script.getAttribute('data-api-url')) || 'https://api.omdomo.com';
  const SESSION_ID = 'ommy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  // Cliente logueado en Shopify (disponible en el storefront)
  const CUSTOMER = (typeof window !== 'undefined' && window.__st?.cid)
    ? { id: window.__st.cid }
    : (window.ShopifyAnalytics?.meta?.page?.customerId
        ? { id: window.ShopifyAnalytics.meta.page.customerId }
        : null);

  // ── Tracking de productos vistos ───────────────────────────────────────────
  const STORAGE_KEY = 'ommy_viewed';
  const MAX_VIEWED = 10;

  function getViewedProducts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }

  function trackCurrentProduct() {
    try {
      const page = window.ShopifyAnalytics?.meta?.page;
      const product = window.ShopifyAnalytics?.meta?.product || window.meta?.product;

      if (page?.pageType !== 'product' && !product) return;

      const id = product?.id || page?.resourceId;
      const title = product?.title || document.title;
      const handle = window.location.pathname.split('/products/')[1]?.split('?')[0];

      if (!id && !handle) return;

      const viewed = getViewedProducts().filter(p => p.id !== id && p.handle !== handle);
      viewed.unshift({ id, title, handle, ts: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed.slice(0, MAX_VIEWED)));
    } catch (_) {}
  }

  trackCurrentProduct();

  // ── i18n ──────────────────────────────────────────────────────────────────

  const i18n = {
    es: {
      greeting: 'Hola, soy Ommy 💛',
      greeting_user: (name) => `¡Hola de nuevo, ${name}! 💛`,
      subtitle: '¿En qué te puedo ayudar hoy?',
      subtitle_guest: '¿En qué te puedo ayudar?',
      login_hint: '¿Buscas algo en concreto? Explora nuestro catálogo.',
      login_btn: '👀 Ver productos',
      options: [
        { label: '🛒 Ayuda para comprar',    msg: 'Necesito ayuda para realizar una compra', action: 'chat' },
        { label: '👀 Ver productos',          msg: 'Ver productos',                           action: 'collections' },
        { label: '📖 Leer el blog',           msg: 'Quiero ver el blog de Omdomo',            action: 'chat' },
        { label: '🤝 Unirse a la comunidad',  msg: 'Quiero saber más sobre la comunidad',     action: 'chat' },
      ],
      collections_intro: '🗂️ Estas son nuestras categorías:',
      placeholder: 'Escribe tu mensaje...',
      send: 'Enviar',
      powered: 'Powered by Ommy',
      error: 'Error al conectar. Inténtalo de nuevo.',
      lang_toggle: 'EN',
    },
    en: {
      greeting: "Hi, I'm Ommy 💛",
      greeting_user: (name) => `Welcome back, ${name}! 💛`,
      subtitle: 'How can I help you today?',
      subtitle_guest: 'How can I help you?',
      login_hint: 'Looking for something? Explore our catalog.',
      login_btn: '👀 View products',
      options: [
        { label: '🛒 Help with buying',     msg: 'I need help making a purchase',          action: 'chat' },
        { label: '👀 View products',         msg: 'View products',                          action: 'collections' },
        { label: '📖 Read the blog',         msg: 'I want to see the Omdomo blog',          action: 'chat' },
        { label: '🤝 Join the community',    msg: 'I want to learn more about the community', action: 'chat' },
      ],
      collections_intro: '🗂️ Here are our categories:',
      placeholder: 'Type your message...',
      send: 'Send',
      powered: 'Powered by Ommy',
      error: 'Connection error. Please try again.',
      lang_toggle: 'ES',
    },
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const css = `
    #ommy-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(245, 197, 24, 0.82);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1.5px solid rgba(255, 255, 255, 0.45);
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(245, 197, 24, 0.45), 0 2px 8px rgba(0,0,0,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      animation: ommy-pulse 3s ease-in-out infinite;
    }
    #ommy-fab:hover {
      transform: scale(1.1);
      background: rgba(245, 197, 24, 0.95);
      box-shadow: 0 6px 28px rgba(245, 197, 24, 0.6), 0 4px 12px rgba(0,0,0,0.15);
      animation: none;
    }
    #ommy-fab svg { pointer-events: none; }
    @keyframes ommy-pulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(245,197,24,0.45), 0 0 0 0 rgba(245,197,24,0.4); }
      50% { box-shadow: 0 4px 20px rgba(245,197,24,0.45), 0 0 0 10px rgba(245,197,24,0); }
    }

    #ommy-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: #e53935;
      border-radius: 50%;
      border: 2px solid #fff;
      display: none;
    }

    #ommy-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      max-height: 580px;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    #ommy-window.ommy-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Header */
    #ommy-header {
      background: #F5C518;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #ommy-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    #ommy-header-info { flex: 1; }
    #ommy-header-name {
      font-weight: 700;
      font-size: 15px;
      color: #1a1a1a;
      line-height: 1.2;
    }
    #ommy-header-status {
      font-size: 11px;
      color: #444;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    #ommy-header-status::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
    }
    #ommy-lang-btn {
      background: rgba(0,0,0,0.10);
      border: none;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: #1a1a1a;
      transition: background 0.15s;
    }
    #ommy-lang-btn:hover { background: rgba(0,0,0,0.18); }
    #ommy-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      color: #1a1a1a;
      transition: background 0.15s;
    }
    #ommy-close-btn:hover { background: rgba(0,0,0,0.10); }

    /* Messages */
    #ommy-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 160px;
      max-height: 320px;
    }
    #ommy-messages::-webkit-scrollbar { width: 4px; }
    #ommy-messages::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }

    .ommy-msg {
      display: flex;
      flex-direction: column;
      max-width: 82%;
      gap: 2px;
    }
    .ommy-msg-bot { align-self: flex-start; }
    .ommy-msg-user { align-self: flex-end; }

    .ommy-bubble {
      padding: 10px 13px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.45;
      word-break: break-word;
    }
    .ommy-msg-bot .ommy-bubble {
      background: #f5f5f5;
      color: #1a1a1a;
      border-bottom-left-radius: 4px;
    }
    .ommy-msg-user .ommy-bubble {
      background: #F5C518;
      color: #1a1a1a;
      border-bottom-right-radius: 4px;
    }

    /* Typing indicator */
    #ommy-typing {
      display: none;
      align-self: flex-start;
    }
    #ommy-typing.ommy-visible { display: flex; }
    .ommy-typing-dots {
      background: #f5f5f5;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      padding: 12px 16px;
      display: flex;
      gap: 5px;
      align-items: center;
    }
    .ommy-typing-dots span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #bbb;
      animation: ommy-bounce 1.2s infinite;
    }
    .ommy-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ommy-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ommy-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* Login hint */
    #ommy-login-hint {
      margin: 0 14px 8px;
      background: #FFF9E0;
      border: 1px solid #F5C518;
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 12.5px;
      color: #555;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-shrink: 0;
    }
    #ommy-login-hint button {
      color: #1a1a1a;
      font-weight: 600;
      white-space: nowrap;
      background: #F5C518;
      padding: 4px 10px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
      font-size: 12.5px;
      flex-shrink: 0;
    }
    #ommy-login-hint button:hover { opacity: 0.85; }

    /* Product cards */
    .ommy-product-cards {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
      max-width: 100%;
    }
    .ommy-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      gap: 10px;
      padding: 8px;
      align-items: center;
    }
    .ommy-card img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
      background: #f5f5f5;
    }
    .ommy-card-info { flex: 1; min-width: 0; }
    .ommy-card-title {
      font-size: 12.5px;
      font-weight: 600;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ommy-card-price {
      font-size: 12px;
      color: #555;
      margin: 2px 0 6px;
    }
    .ommy-card-actions { display: flex; gap: 5px; flex-wrap: wrap; }
    .ommy-card-btn {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: opacity 0.15s;
    }
    .ommy-card-btn:hover { opacity: 0.8; }
    .ommy-card-btn-view { background: #f5f5f5; color: #1a1a1a; }
    .ommy-card-btn-cart { background: #F5C518; color: #1a1a1a; }

    /* Feedback */
    .ommy-feedback {
      display: flex;
      gap: 6px;
      margin-top: 5px;
      align-self: flex-start;
    }
    .ommy-fb-btn {
      background: none;
      border: 1px solid #e8e8e8;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .ommy-fb-btn:hover { background: #f5f5f5; }
    .ommy-fb-btn.ommy-fb-active { background: #FFF9E0; border-color: #F5C518; }

    /* Quick options */
    #ommy-options {
      padding: 4px 14px 10px;
      display: flex;
      flex-direction: column;
      gap: 7px;
      flex-shrink: 0;
    }
    .ommy-option-btn {
      background: #fff;
      border: 1.5px solid #F5C518;
      border-radius: 22px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      color: #1a1a1a;
      transition: background 0.15s, transform 0.1s;
    }
    .ommy-option-btn:hover {
      background: #FFF9E0;
      transform: translateX(2px);
    }

    /* Input area */
    #ommy-input-area {
      padding: 10px 12px 12px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-shrink: 0;
    }
    #ommy-input {
      flex: 1;
      border: 1.5px solid #e8e8e8;
      border-radius: 22px;
      padding: 9px 14px;
      font-size: 14px;
      outline: none;
      resize: none;
      font-family: inherit;
      line-height: 1.4;
      max-height: 90px;
      overflow-y: auto;
      transition: border-color 0.15s;
    }
    #ommy-input:focus { border-color: #F5C518; }
    #ommy-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #F5C518;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.1s;
    }
    #ommy-send-btn:hover { background: #e6b800; transform: scale(1.05); }
    #ommy-send-btn:disabled { background: #e8e8e8; cursor: default; transform: none; }

    #ommy-powered {
      text-align: center;
      font-size: 10px;
      color: #bbb;
      padding-bottom: 6px;
    }

    @media (max-width: 420px) {
      #ommy-window {
        right: 0;
        bottom: 0;
        width: 100vw;
        max-height: 100dvh;
        border-radius: 18px 18px 0 0;
      }
      #ommy-fab { bottom: 16px; right: 16px; }
    }
  `;

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function iconChat() {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`;
  }

  function iconClose() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
  }

  function iconSend() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>`;
  }

  // ── Widget state ───────────────────────────────────────────────────────────

  let lang = 'es';
  let isOpen = false;
  let optionsVisible = true;
  let isLoading = false;

  // ── Build DOM ──────────────────────────────────────────────────────────────

  function buildWidget() {
    // FAB button
    const fab = document.createElement('button');
    fab.id = 'ommy-fab';
    fab.setAttribute('aria-label', 'Abrir chat Ommy');
    fab.innerHTML = iconChat() + '<span id="ommy-badge"></span>';

    // Chat window
    const win = document.createElement('div');
    win.id = 'ommy-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Chat Ommy');
    win.innerHTML = `
      <div id="ommy-header">
        <div id="ommy-avatar">🐝</div>
        <div id="ommy-header-info">
          <div id="ommy-header-name">Ommy</div>
          <div id="ommy-header-status">En línea</div>
        </div>
        <button id="ommy-lang-btn" aria-label="Cambiar idioma">EN</button>
        <button id="ommy-close-btn" aria-label="Cerrar chat">${iconClose()}</button>
      </div>

      <div id="ommy-messages">
        <div class="ommy-msg ommy-msg-bot" id="ommy-greeting-msg">
          <div class="ommy-bubble" id="ommy-greeting-text"></div>
        </div>
        <div class="ommy-msg ommy-msg-bot" id="ommy-typing">
          <div class="ommy-typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div id="ommy-login-hint" style="display:none"></div>
      <div id="ommy-options"></div>

      <div id="ommy-input-area">
        <textarea id="ommy-input" rows="1" aria-label="Mensaje"></textarea>
        <button id="ommy-send-btn" aria-label="Enviar">${iconSend()}</button>
      </div>
      <div id="ommy-powered"></div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(win);

    bindEvents(fab, win);
    applyLang();
  }

  // ── Language ───────────────────────────────────────────────────────────────

  function applyLang() {
    const t = i18n[lang];
    const customerName = CUSTOMER?.first_name;
    const greeting = customerName ? t.greeting_user(customerName) : t.greeting;

    document.getElementById('ommy-greeting-text').textContent = greeting;
    document.getElementById('ommy-header-status').textContent = lang === 'es' ? 'En línea' : 'Online';
    document.getElementById('ommy-lang-btn').textContent = t.lang_toggle;
    document.getElementById('ommy-input').placeholder = t.placeholder;
    document.getElementById('ommy-powered').textContent = t.powered;

    // Hint de login solo para usuarios no registrados
    const hintEl = document.getElementById('ommy-login-hint');
    if (optionsVisible) {
      hintEl.style.display = 'flex';
      hintEl.innerHTML = `<span>${t.login_hint}</span><button id="ommy-hint-btn">${t.login_btn}</button>`;
      document.getElementById('ommy-hint-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        showCollections();
      });
    } else {
      hintEl.style.display = 'none';
    }

    const optionsEl = document.getElementById('ommy-options');
    if (optionsVisible) renderOptions(optionsEl, t);
  }

  function renderOptions(container, t) {
    container.innerHTML = '';
    t.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'ommy-option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (opt.action === 'collections') {
          showCollections();
        } else {
          sendMessage(opt.msg);
        }
      });
      container.appendChild(btn);
    });
  }

  async function showCollections() {
    hideOptions();
    const t = i18n[lang];
    setTyping(true);
    try {
      const res = await fetch(`${API_URL}/collections`);
      const data = await res.json();
      setTyping(false);
      if (data.collections?.length) {
        const list = data.collections.map(c => `• ${c.title}`).join('\n');
        appendMessage(`${t.collections_intro}\n\n${list}`, 'bot');
      } else {
        appendMessage(t.error, 'bot');
      }
    } catch (_) {
      setTyping(false);
      appendMessage(t.error, 'bot');
    }
  }

  function hideOptions() {
    if (!optionsVisible) return;
    optionsVisible = false;
    document.getElementById('ommy-options').innerHTML = '';
    document.getElementById('ommy-login-hint').style.display = 'none';
  }

  // ── Chat logic ─────────────────────────────────────────────────────────────

  let messageIndex = 0;

  function appendMessage(text, role, products = null) {
    const msgs = document.getElementById('ommy-messages');
    const typing = document.getElementById('ommy-typing');
    const idx = messageIndex++;

    const wrap = document.createElement('div');
    wrap.className = `ommy-msg ommy-msg-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'ommy-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);

    // Product cards
    if (role === 'bot' && products?.length) {
      const cards = document.createElement('div');
      cards.className = 'ommy-product-cards';
      products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'ommy-card';
        const img = p.images?.[0] ? `<img src="${p.images[0]}" alt="${p.title}" loading="lazy">` : '';
        const price = p.price ? `<div class="ommy-card-price">€${p.price}</div>` : '';
        const variantId = p.variants?.[0]?.id;
        const cartBtn = variantId
          ? `<button class="ommy-card-btn ommy-card-btn-cart" data-variant="${variantId}">🛒 Carrito</button>`
          : '';
        card.innerHTML = `
          ${img}
          <div class="ommy-card-info">
            <div class="ommy-card-title">${p.title}</div>
            ${price}
            <div class="ommy-card-actions">
              <a class="ommy-card-btn ommy-card-btn-view" href="/products/${p.handle}" target="_blank">Ver</a>
              ${cartBtn}
            </div>
          </div>`;
        card.querySelector('.ommy-card-btn-cart')?.addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          btn.textContent = '...';
          try {
            await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: Number(btn.dataset.variant), quantity: 1 }),
            });
            btn.textContent = '✓ Agregado';
            btn.style.background = '#22c55e';
            btn.style.color = '#fff';
          } catch (_) { btn.textContent = '🛒 Carrito'; }
        });
        cards.appendChild(card);
      });
      wrap.appendChild(cards);
    }

    // Feedback buttons (solo en mensajes del bot)
    if (role === 'bot') {
      const fb = document.createElement('div');
      fb.className = 'ommy-feedback';
      ['👍', '👎'].forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'ommy-fb-btn';
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
          fb.querySelectorAll('.ommy-fb-btn').forEach(b => b.classList.remove('ommy-fb-active'));
          btn.classList.add('ommy-fb-active');
          fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: SESSION_ID, message_index: idx, value: emoji }),
          }).catch(() => {});
        });
        fb.appendChild(btn);
      });
      wrap.appendChild(fb);
    }

    msgs.insertBefore(wrap, typing);
    scrollToBottom();
  }

  function scrollToBottom() {
    const msgs = document.getElementById('ommy-messages');
    msgs.scrollTop = msgs.scrollHeight;
  }

  function setTyping(visible) {
    const el = document.getElementById('ommy-typing');
    el.classList.toggle('ommy-visible', visible);
    if (visible) scrollToBottom();
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    const input = document.getElementById('ommy-input');
    input.value = '';
    input.style.height = 'auto';
    hideOptions();
    appendMessage(text, 'user');
    setTyping(true);
    isLoading = true;
    document.getElementById('ommy-send-btn').disabled = true;

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: SESSION_ID,
          message: text,
          lang,
          customer: CUSTOMER,
          viewed_products: getViewedProducts().slice(0, 5),
        }),
      });

      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      setTyping(false);
      appendMessage(data.reply, 'bot', data.products);
    } catch (_) {
      setTyping(false);
      appendMessage(i18n[lang].error, 'bot');
    } finally {
      isLoading = false;
      document.getElementById('ommy-send-btn').disabled = false;
      document.getElementById('ommy-input').focus();
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  function bindEvents(fab, win) {
    fab.addEventListener('click', toggleChat);

    document.getElementById('ommy-close-btn').addEventListener('click', () => toggleChat(false));

    document.getElementById('ommy-lang-btn').addEventListener('click', () => {
      lang = lang === 'es' ? 'en' : 'es';
      applyLang();
    });

    const input = document.getElementById('ommy-input');
    const sendBtn = document.getElementById('ommy-send-btn');

    sendBtn.addEventListener('click', () => sendMessage(input.value));

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (isOpen && !win.contains(e.target) && e.target !== fab) {
        toggleChat(false);
      }
    });
  }

  function toggleChat(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    const win = document.getElementById('ommy-window');
    win.classList.toggle('ommy-open', isOpen);
    document.getElementById('ommy-fab').setAttribute('aria-expanded', isOpen);
    if (isOpen) {
      setTimeout(() => document.getElementById('ommy-input').focus(), 250);
    }
  }

  // ── Trigger proactivo en páginas de producto ───────────────────────────────

  function setupProactiveTrigger() {
    try {
      const page = window.ShopifyAnalytics?.meta?.page;
      if (page?.pageType !== 'product') return;

      const productTitle = window.ShopifyAnalytics?.meta?.product?.title || document.title;
      const t = i18n[lang];
      const proactiveMsg = lang === 'es'
        ? `¿Tienes alguna duda sobre "${productTitle}"? ¡Puedo ayudarte! 😊`
        : `Any questions about "${productTitle}"? I'm here to help! 😊`;

      // Abre el chat a los 15s si el usuario no lo ha abierto ya
      setTimeout(() => {
        if (!isOpen) {
          toggleChat(true);
          appendMessage(proactiveMsg, 'bot');
        }
      }, 15000);
    } catch (_) {}
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    if (document.getElementById('ommy-fab')) return; // already loaded
    injectStyles();
    buildWidget();
    setupProactiveTrigger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
