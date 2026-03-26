/* =============================================
   EduAI - Yapay Zeka Öğrenme Asistanı
   JavaScript Uygulama Mantığı + Google Gemini API
   ============================================= */

// ---- State ----
const DEFAULT_API_KEY = localStorage.getItem('eduai_gemini_key') || 'AIzaSyAdwKVmcGfrW9bmvVVbIbF64sc6pscMVxQ';

const state = {
  apiKey: DEFAULT_API_KEY,
  level: 'ortaokul',
  subject: 'matematik',
  chatHistory: [],
  isLoading: false,
};

// ---- DOM References ----
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearChat = document.getElementById('clearChat');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiKeySection = document.getElementById('apiKeySection');
const quickSuggestions = document.getElementById('quickSuggestions');
const levelOptions = document.getElementById('levelOptions');
const subjectOptions = document.getElementById('subjectOptions');

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setupThemeToggle();
  setupLevelSubjectButtons();
  setupChatInput();
  setupApiKey();
  setupClearChat();
  setupSuggestions();
  setupHeroLinks();
  autoResizeTextarea();

  // API key her zaman hazır, otomatik olarak kayıtlı göster
  markApiKeySaved();
});

// ---- Navbar Scroll Effect ----
function setupNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  });

  // Hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  hamburger.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '70px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'var(--bg3)';
    navLinks.style.padding = '16px 24px';
    navLinks.style.borderBottom = '1px solid var(--border2)';
    navLinks.style.zIndex = '99';
  });
}

function setupHeroLinks() {
  // Butonlar artık chat.html'e yönlendiriyor — JS müdahalesi yok
}

// ── Dark / Light Mode ────────────────────────────────────────────────────────
function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  // Kayıtlı tercihi uygula
  const saved = localStorage.getItem('eduai_theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    btn.textContent = '☀️';
  }

  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    btn.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('eduai_theme', isLight ? 'light' : 'dark');

    // Animasyon feedback
    btn.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => btn.style.transform = '', 400);
  });
}


// ---- Level & Subject Buttons ----
function setupLevelSubjectButtons() {
  levelOptions.querySelectorAll('.config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      levelOptions.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.level = btn.dataset.level;
    });
  });
  subjectOptions.querySelectorAll('.config-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      subjectOptions.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.subject = btn.dataset.subject;
    });
  });
}

// ---- API Key ----
function setupApiKey() {
  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key || !key.startsWith('AIzaSy')) {
      showApiError('Lütfen geçerli bir Google Gemini API anahtarı girin (AIzaSy ile başlamalı).');
      return;
    }
    state.apiKey = key;
    localStorage.setItem('eduai_gemini_key', key);
    markApiKeySaved();
    addAiMessage('✅ Google Gemini API anahtarınız kaydedildi! Artık soru sorabilirsiniz. 🚀');
  });
}

function markApiKeySaved() {
  apiKeySection.classList.add('saved');
  apiKeySection.innerHTML = `
    <div class="api-key-info">
      <svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="color: var(--success);">✓ Google Gemini API anahtarı kayıtlı.
        <button id="changeKey" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.82rem;text-decoration:underline;">Değiştir</button>
      </span>
    </div>
  `;
  document.getElementById('changeKey')?.addEventListener('click', () => {
    state.apiKey = '';
    localStorage.removeItem('eduai_gemini_key');
    location.reload();
  });
}

function showApiError(msg) {
  const err = document.createElement('p');
  err.style.cssText = 'color:var(--danger);font-size:0.8rem;margin-top:6px;';
  err.textContent = msg;
  apiKeySection.appendChild(err);
  setTimeout(() => err.remove(), 3000);
}

// ---- Suggestions ----
function setupSuggestions() {
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.dataset.msg;
      chatInput.value = msg;
      autoResizeTextarea();
      sendMessage();
      quickSuggestions.style.display = 'none';
    });
  });
}

// ---- Chat Input ----
function setupChatInput() {
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  chatInput.addEventListener('input', autoResizeTextarea);
}

function autoResizeTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
}

// ---- Clear Chat ----
function setupClearChat() {
  clearChat.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    state.chatHistory = [];
    quickSuggestions.style.display = 'block';
    addAiMessage('🔄 Sohbet temizlendi. Yeni bir soru sorabilirsiniz!');
  });
}

// ---- Send Message ----
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || state.isLoading) return;

  chatInput.value = '';
  autoResizeTextarea();
  quickSuggestions.style.display = 'none';

  addUserMessage(text);

  if (!state.apiKey) {
    addAiMessage('⚠️ Yapay zekayı kullanmak için lütfen önce Google Gemini API anahtarınızı girin. Ücretsiz almak için: <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--primary)">aistudio.google.com/apikey</a>');
    return;
  }

  state.isLoading = true;
  sendBtn.disabled = true;

  const typingId = addTypingIndicator();

  try {
    const response = await callGeminiAPI(text);
    removeTypingIndicator(typingId);
    addAiMessage(response, true);
  } catch (err) {
    removeTypingIndicator(typingId);
    const msg = err.message || '';
    // Gerçek hata detayını göster (debug için)
    let errMsg = `❌ Hata: <code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:0.8rem;">${msg}</code>`;

    if (msg.startsWith('INVALID_KEY') || msg.startsWith('FORBIDDEN')) {
      errMsg = '❌ API anahtarı geçersiz veya bu proje için Gemini API aktif değil. <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--primary);">Yeni key al</a>';
    } else if (msg.startsWith('RATE_LIMIT')) {
      addAiMessage('⚠️ Dakika limiti doldu. Lütfen <strong>1 dakika</strong> bekleyip tekrar deneyin. Google ücretsiz API\'sinde dakikada 15 istek sınırı var.');
      startRateCountdown();
    } else if (msg.startsWith('MODEL_NOT_FOUND')) {
      errMsg = '❌ Hiçbir model yanıt vermedi. Lütfen sayfayı manuel olarak yenileyin (F5).';
    } else if (msg.startsWith('NETWORK')) {
      errMsg = '❌ Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
    } else if (msg.startsWith('EMPTY_RESPONSE')) {
      errMsg = '⚠️ Yapay zekadan boş yanıt alındı (içerik filtresi). Soruyu farklı şekilde tekrar deneyin.';
    }
    addAiMessage(errMsg);
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ---- Rate Limit Countdown ----
function startRateCountdown() {
  let sec = 60;
  const el = document.createElement('div');
  el.className = 'chat-message ai-message';
  const svgId = 'cd' + Date.now();
  el.innerHTML = `
    <div class="message-avatar">
      <svg viewBox="0 0 32 32" fill="none">
        <defs><linearGradient id="${svgId}" x1="0" y1="0" x2="32" y2="32">
          <stop stop-color="#6C63FF"/><stop offset="1" stop-color="#3ECFCF"/>
        </linearGradient></defs>
        <circle cx="16" cy="16" r="16" fill="url(#${svgId})"/>
        <path d="M10 13h12M10 16h8M10 19h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="message-content">
      <div class="message-bubble" id="countdown-bubble">
        ⏱️ Tekrar deneyebileceğiniz süre: <strong id="countdown-sec">${sec}</strong> saniye
      </div>
    </div>
  `;
  chatMessages.appendChild(el);
  scrollToBottom();

  const timer = setInterval(() => {
    sec--;
    const secEl = document.getElementById('countdown-sec');
    if (secEl) secEl.textContent = sec;
    if (sec <= 0) {
      clearInterval(timer);
      const bubble = document.getElementById('countdown-bubble');
      if (bubble) bubble.innerHTML = '✅ Rate limit sıfırlandı! Artık yeni soru sorabilirsiniz. 🚀';
      sendBtn.disabled = false;
      state.isLoading = false;
    }
  }, 1000);
}

// ---- Gemini API Call ----
async function callGeminiAPI(userMessage) {
  const systemPrompt = buildSystemPrompt();

  if (state.chatHistory.length === 0 || state.chatHistory[state.chatHistory.length - 1].content !== userMessage) {
    state.chatHistory.push({ role: 'user', content: userMessage });
  }

  const messages = [
    { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userMessage }] }
  ];

  // Sohbet geçmişini ekle (son 5 mesaj - daha hızlı)
  const historyMessages = state.chatHistory.slice(-5).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const allMessages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...historyMessages,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const payload = {
    contents: allMessages,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      topP: 0.8,
      topK: 40,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${state.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    throw new Error('NETWORK: ' + networkErr.message);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const rawMsg = errData?.error?.message || `HTTP ${res.status}`;
    if (res.status === 400) throw new Error('INVALID_KEY: ' + rawMsg);
    if (res.status === 429) throw new Error('RATE_LIMIT: ' + rawMsg);
    if (res.status === 403) throw new Error('FORBIDDEN: ' + rawMsg);
    throw new Error(`HTTP_${res.status}: ` + rawMsg);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) throw new Error('EMPTY_RESPONSE');

  state.chatHistory.push({ role: 'assistant', content });
  return content;
}

// ---- System Prompt Builder ----
function buildSystemPrompt() {
  const levelMap = {
    ilkokul: 'İlkokul (1-4. sınıf)',
    ortaokul: 'Ortaokul (5-8. sınıf)',
    lise: 'Lise (9-12. sınıf)',
    universite: 'Üniversite',
  };
  const subjectMap = {
    matematik: 'Matematik',
    fizik: 'Fizik',
    kimya: 'Kimya',
  };

  return `Sen EduAI - ${levelMap[state.level] || 'Ortaokul'} düzeyinde ${subjectMap[state.subject] || 'Matematik'} uzmanı öğretmensin.

KISA FORMAT:
- 📌 Konu: Sorunun hangi konuyla ilgili
- 🔑 Gerekenler: Bilinmesi gerekenler
- 🧮 Çözüm: Adım adım açıklama
- ⚡ Pratik: 2 benzer soru

KURALLAR: Türkçe, net, öğrenci seviyesine uygun. Markdown kullan. ${levelMap[state.level]} - ${subjectMap[state.subject]}`;
}

// ---- UI Helpers ----
function addUserMessage(text) {
  const time = getTime();
  const el = document.createElement('div');
  el.className = 'chat-message user-message';
  el.innerHTML = `
    <div class="message-content">
      <div class="message-bubble">${escapeHtml(text)}</div>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-avatar">
      <div class="user-avatar-img">Ö</div>
    </div>
  `;
  chatMessages.appendChild(el);
  scrollToBottom();
}

function addAiMessage(text, isMarkdown = false) {
  const time = getTime();
  const el = document.createElement('div');
  el.className = 'chat-message ai-message';

  const svgAvatar = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="mg${Date.now()}" x1="0" y1="0" x2="32" y2="32">
      <stop stop-color="#6C63FF"/><stop offset="1" stop-color="#3ECFCF"/>
    </linearGradient></defs>
    <circle cx="16" cy="16" r="16" fill="url(#mg${Date.now()})"/>
    <path d="M10 13h12M10 16h8M10 19h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const formattedText = isMarkdown ? renderMarkdown(text) : `<p>${text}</p>`;

  el.innerHTML = `
    <div class="message-avatar">${svgAvatar}</div>
    <div class="message-content">
      <div class="message-bubble">${formattedText}</div>
      <span class="message-time">${time}</span>
    </div>
  `;
  chatMessages.appendChild(el);
  scrollToBottom();
}

function addTypingIndicator() {
  const id = 'typing-' + Date.now();
  const svgId = 'tsvg' + Date.now();
  const el = document.createElement('div');
  el.className = 'chat-message ai-message';
  el.id = id;
  el.innerHTML = `
    <div class="message-avatar">
      <svg viewBox="0 0 32 32" fill="none">
        <defs><linearGradient id="${svgId}" x1="0" y1="0" x2="32" y2="32">
          <stop stop-color="#6C63FF"/><stop offset="1" stop-color="#3ECFCF"/>
        </linearGradient></defs>
        <circle cx="16" cy="16" r="16" fill="url(#${svgId})"/>
        <path d="M10 13h12M10 16h8M10 19h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(el);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  document.getElementById(id)?.remove();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getTime() {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---- Markdown Renderer ----
function renderMarkdown(text) {
  let html = text;

  // Escape HTML first but keep line breaks
  // Don't escape the whole thing, process selectively

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 style="color:var(--secondary);font-size:0.95rem;margin:14px 0 6px;font-weight:700;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="color:var(--primary);font-size:1.05rem;margin:16px 0 8px;font-weight:700;">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 style="color:var(--gradient-text);font-size:1.15rem;margin:16px 0 8px;font-weight:800;">$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]+?)```/g, '<pre style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:12px;overflow-x:auto;margin:10px 0;font-family:monospace;font-size:0.85rem;white-space:pre-wrap;">$1</pre>');
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:2px 6px;font-family:monospace;font-size:0.88rem;color:var(--secondary);">$1</code>');

  // Dividers
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border2);margin:16px 0;"/>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--primary);margin:10px 0;padding:8px 14px;background:rgba(108,99,255,0.06);border-radius:0 8px 8px 0;color:var(--text-muted);font-size:0.9rem;">$1</blockquote>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>');
  html = html.replace(/^• (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, (match, content, offset, str) => {
    return `<li style="margin:4px 0;padding-left:4px;list-style-type:decimal;">${content}</li>`;
  });

  // Wrap consecutive li items in ul/ol
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
    return `<ul style="list-style:disc;padding-left:18px;margin:8px 0;display:flex;flex-direction:column;gap:3px;">${match}</ul>`;
  });

  // Line breaks to paragraphs
  const lines = html.split('\n');
  const result = [];
  let currentParagraph = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParagraph.length > 0) {
        const paraContent = currentParagraph.join(' ');
        if (!paraContent.startsWith('<h') && !paraContent.startsWith('<ul') &&
          !paraContent.startsWith('<pre') && !paraContent.startsWith('<hr') &&
          !paraContent.startsWith('<blockquote') && !paraContent.startsWith('<ol')) {
          result.push(`<p style="margin:6px 0;">${paraContent}</p>`);
        } else {
          result.push(paraContent);
        }
        currentParagraph = [];
      }
    } else if (trimmed.startsWith('<') && !trimmed.startsWith('<strong') && !trimmed.startsWith('<em') && !trimmed.startsWith('<code')) {
      if (currentParagraph.length > 0) {
        result.push(`<p style="margin:6px 0;">${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      result.push(trimmed);
    } else {
      currentParagraph.push(trimmed);
    }
  }

  if (currentParagraph.length > 0) {
    const paraContent = currentParagraph.join(' ');
    if (!paraContent.startsWith('<h') && !paraContent.startsWith('<ul') &&
      !paraContent.startsWith('<pre') && !paraContent.startsWith('<hr') &&
      !paraContent.startsWith('<blockquote')) {
      result.push(`<p style="margin:6px 0;">${paraContent}</p>`);
    } else {
      result.push(paraContent);
    }
  }

  return result.join('\n');
}

// ---- Smooth Scroll for Nav Links ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ---- Intersection Observer for Animations ----
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fade-in-up 0.6s ease both';
      entry.target.style.opacity = '1';
    }
  });
}, observerOptions);

document.querySelectorAll('.feature-card, .step, .subject-card').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});
