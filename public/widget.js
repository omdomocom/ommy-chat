(function () {
  'use strict';

  const script = document.currentScript;
  const API_URL = (script && script.getAttribute('data-api-url')) || 'https://api.omdomo.com';
  const SESSION_ID = 'ommy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  // ── i18n ──────────────────────────────────────────────────────────────────

  const i18n = {
    es: {
      greeting: 'Hola, soy Ommy 💛',
      subtitle: '¿En qué te puedo ayudar hoy?',
      options: [
        { label: '🛒 Ayuda para comprar',    msg: 'Necesito ayuda para realizar una compra' },
        { label: '👀 Ver productos',          msg: '¿Qué productos tienen disponibles?' },
        { label: '📖 Leer el blog',           msg: 'Quiero ver el blog de Omdomo' },
        { label: '🤝 Unirse a la comunidad',  msg: 'Quiero saber más sobre la comunidad de Omdomo' },
      ],
      placeholder: 'Escribe tu mensaje...',
      send: 'Enviar',
      powered: 'Powered by Ommy',
      error: 'Error al conectar. Inténtalo de nuevo.',
      lang_toggle: 'EN',
    },
    en: {
      greeting: "Hi, I'm Ommy 💛",
      subtitle: 'How can I help you today?',
      options: [
        { label: '🛒 Help with buying',     msg: 'I need help making a purchase' },
        { label: '👀 View products',         msg: 'What products do you have available?' },
        { label: '📖 Read the blog',         msg: 'I want to see the Omdomo blog' },
        { label: '🤝 Join the community',    msg: 'I want to learn more about the Omdomo community' },
      ],
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
      background: #F5C518;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #ommy-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(0,0,0,0.22);
    }
    #ommy-fab svg { pointer-events: none; }

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
    document.getElementById('ommy-greeting-text').textContent = t.greeting;
    document.getElementById('ommy-header-status').textContent = lang === 'es' ? 'En línea' : 'Online';
    document.getElementById('ommy-lang-btn').textContent = t.lang_toggle;
    document.getElementById('ommy-input').placeholder = t.placeholder;
    document.getElementById('ommy-powered').textContent = t.powered;

    const optionsEl = document.getElementById('ommy-options');
    if (optionsVisible) renderOptions(optionsEl, t);
  }

  function renderOptions(container, t) {
    container.innerHTML = '';
    t.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'ommy-option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => sendMessage(opt.msg));
      container.appendChild(btn);
    });
  }

  function hideOptions() {
    if (!optionsVisible) return;
    optionsVisible = false;
    document.getElementById('ommy-options').innerHTML = '';
  }

  // ── Chat logic ─────────────────────────────────────────────────────────────

  function appendMessage(text, role) {
    const msgs = document.getElementById('ommy-messages');
    const typing = document.getElementById('ommy-typing');

    const wrap = document.createElement('div');
    wrap.className = `ommy-msg ommy-msg-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'ommy-bubble';
    bubble.textContent = text;

    wrap.appendChild(bubble);
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
        body: JSON.stringify({ session_id: SESSION_ID, message: text, lang }),
      });

      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      setTyping(false);
      appendMessage(data.reply, 'bot');
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

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    if (document.getElementById('ommy-fab')) return; // already loaded
    injectStyles();
    buildWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
