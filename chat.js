/* =============================================
   EduAI Chat Page — chat.js
   Firebase Auth + Firestore + Gemini API
   ============================================= */

// ─── Firebase Config (auth.js ile aynı) ─────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDv-_cjC6Ls5WpN-t3dOL0NrgcQnb14img",
  authDomain: "edux-5afd6.firebaseapp.com",
  projectId: "edux-5afd6",
  storageBucket: "edux-5afd6.firebasestorage.app",
  messagingSenderId: "32991193464",
  appId: "1:32991193464:web:652b3e374b102b73e1808d",
  measurementId: "G-HJTYMZ9TV9"
};

// ─── Gemini API Key ──────────────────────────────────────────────────────────
const GEMINI_KEY = localStorage.getItem('eduai_gemini_key') || 'AIzaSyAdwKVmcGfrW9bmvVVbIbF64sc6pscMVxQ';

// ─── State ───────────────────────────────────────────────────────────────────
let auth, db;
let currentUser = null;
let currentConvId = null;
let conversations = {};   // { convId: { title, messages[], level, subject, updatedAt } }
let isLoading = false;
let selectedImages = [];  // { file, base64, mimeType }[]

// ─── DOM Refs ────────────────────────────────────────────────────────────────
const authLoadingScreen = document.getElementById('authLoadingScreen');
const loginRequiredScreen = document.getElementById('loginRequiredScreen');
const chatApp = document.getElementById('chatApp');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const convList = document.getElementById('convList');
const convEmpty = document.getElementById('convEmpty');
const messagesArea = document.getElementById('messagesArea');
const messagesList = document.getElementById('messagesList');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatTitle = document.getElementById('chatTitle');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const levelSelect = document.getElementById('levelSelect');
const subjectSelect = document.getElementById('subjectSelect');
const sidebarUserName = document.getElementById('sidebarUserName');
const sidebarUserEmail = document.getElementById('sidebarUserEmail');
const sidebarAvatar = document.getElementById('sidebarAvatar');

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
  auth.languageCode = 'tr';

  // Auth state listener
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      showChatApp(user);
      await loadConversations();
    } else {
      showLoginRequired();
    }
  });

  setupEventListeners();
});

// ─── Auth UI ─────────────────────────────────────────────────────────────────
function showChatApp(user) {
  authLoadingScreen.style.display = 'none';
  loginRequiredScreen.style.display = 'none';
  chatApp.style.display = 'flex';

  // Kullanıcı bilgileri
  const name = user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
  sidebarUserName.textContent = name;
  sidebarUserEmail.textContent = user.email || '';
  sidebarAvatar.textContent = name.charAt(0).toUpperCase();

  if (user.photoURL) {
    const img = document.createElement('img');
    img.src = user.photoURL;
    img.alt = name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    sidebarAvatar.innerHTML = '';
    sidebarAvatar.appendChild(img);
  }
}

function showLoginRequired() {
  authLoadingScreen.style.display = 'none';
  loginRequiredScreen.style.display = 'flex';
  chatApp.style.display = 'none';
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // Gönder butonu
  sendBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  msgInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendBtn();
  });

  // Yeni sohbet
  document.getElementById('newChatBtn').addEventListener('click', startNewChat);

  // Çıkış
  document.getElementById('sidebarLogoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.href = 'index.html';
  });

  // Sidebar toggle (mobil & masaüstü)
  document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  // Welcome chips
  document.querySelectorAll('.welcome-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      msgInput.value = chip.dataset.msg;
      updateSendBtn();
      sendMessage();
    });
  });

  // ── Görsel Yükleme ──────────────────────────────────────────────────────────
  const attachBtn = document.getElementById('attachBtn');
  const imageInput = document.getElementById('imageInput');
  const imagePreviewStrip = document.getElementById('imagePreviewStrip');

  attachBtn.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const MAX = 5;
    const MAX_MB = 10;
    const allowed = files.slice(0, MAX - selectedImages.length);

    for (const file of allowed) {
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`"${file.name}" dosyası ${MAX_MB} MB limitini aşıyor.`);
        continue;
      }
      const base64 = await fileToBase64(file);
      selectedImages.push({ file, base64, mimeType: file.type || 'image/jpeg' });
    }

    renderImagePreviewStrip();
    updateSendBtn();
    imageInput.value = ''; // reset so same file can be re-selected
  });

  // Sürükle-bırak desteği
  const inputCard = document.querySelector('.input-card');
  inputCard.addEventListener('dragover', (e) => { e.preventDefault(); inputCard.classList.add('drag-over'); });
  inputCard.addEventListener('dragleave', () => inputCard.classList.remove('drag-over'));
  inputCard.addEventListener('drop', async (e) => {
    e.preventDefault();
    inputCard.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    for (const file of files.slice(0, 5 - selectedImages.length)) {
      if (file.size > 10 * 1024 * 1024) continue;
      const base64 = await fileToBase64(file);
      selectedImages.push({ file, base64, mimeType: file.type });
    }
    renderImagePreviewStrip();
    updateSendBtn();
  });
}

function updateSendBtn() {
  const hasText = msgInput.value.trim().length > 0;
  const hasImg = selectedImages.length > 0;
  const active = hasText || hasImg;
  sendBtn.classList.toggle('active', active);
  sendBtn.disabled = !active;
}

// ─── Görsel Yardımcıları ──────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // strip data URL prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreviewStrip() {
  const strip = document.getElementById('imagePreviewStrip');
  strip.innerHTML = '';

  if (selectedImages.length === 0) {
    strip.style.display = 'none';
    return;
  }

  strip.style.display = 'flex';
  selectedImages.forEach((img, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'img-preview-item';
    wrapper.innerHTML = `
      <img src="data:${img.mimeType};base64,${img.base64}" alt="Görsel ${idx + 1}" />
      <button class="img-remove-btn" data-idx="${idx}" title="Kaldır">×</button>
    `;
    wrapper.querySelector('.img-remove-btn').addEventListener('click', () => {
      selectedImages.splice(idx, 1);
      renderImagePreviewStrip();
      updateSendBtn();
    });
    strip.appendChild(wrapper);
  });
}

function autoResizeTextarea() {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 200) + 'px';
}

// ─── Conversation Management ─────────────────────────────────────────────────
async function loadConversations() {
  if (!currentUser || !db) return;
  try {
    const snap = await db
      .collection('users').doc(currentUser.uid)
      .collection('conversations')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    conversations = {};
    snap.forEach(doc => {
      conversations[doc.id] = { id: doc.id, ...doc.data() };
    });
    renderConversationList();
  } catch (e) {
    console.error('Sohbetler yüklenemedi:', e);
  }
}

function renderConversationList() {
  convList.innerHTML = '';
  const convArr = Object.values(conversations);

  if (convArr.length === 0) {
    convList.appendChild(convEmpty);
    return;
  }

  // Tarih gruplarına göre sırala
  const groups = { 'Bugün': [], 'Dün': [], 'Son 7 Gün': [], 'Daha Eski': [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const week = new Date(today - 6 * 86400000);

  convArr.forEach(conv => {
    const d = conv.updatedAt?.toDate ? conv.updatedAt.toDate() : new Date(conv.updatedAt || 0);
    if (d >= today) groups['Bugün'].push(conv);
    else if (d >= yesterday) groups['Dün'].push(conv);
    else if (d >= week) groups['Son 7 Gün'].push(conv);
    else groups['Daha Eski'].push(conv);
  });

  Object.entries(groups).forEach(([label, items]) => {
    if (items.length === 0) return;
    const groupLabel = document.createElement('div');
    groupLabel.className = 'conv-group-label';
    groupLabel.textContent = label;
    convList.appendChild(groupLabel);

    items.forEach(conv => convList.appendChild(buildConvItem(conv)));
  });
}

function buildConvItem(conv) {
  const el = document.createElement('div');
  el.className = 'conv-item' + (conv.id === currentConvId ? ' active' : '');
  el.dataset.id = conv.id;

  const subjectEmoji = { matematik: '📐', fizik: '⚗️', kimya: '🧪', biyoloji: '🌿', turkce: '📝' };
  const emoji = subjectEmoji[conv.subject] || '💬';

  el.innerHTML = `
    <div class="conv-item-icon">${emoji}</div>
    <div class="conv-item-text">
      <div class="conv-item-title">${escapeHtml(conv.title || 'Yeni Sohbet')}</div>
      <div class="conv-item-date">${formatDate(conv.updatedAt)}</div>
    </div>
    <button class="conv-item-delete" data-id="${conv.id}" title="Sil">
      <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  el.addEventListener('click', (e) => {
    if (e.target.closest('.conv-item-delete')) return;
    loadConversation(conv.id);
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  el.querySelector('.conv-item-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteConversation(conv.id);
  });

  return el;
}

async function loadConversation(convId) {
  currentConvId = convId;
  const conv = conversations[convId];
  if (!conv) return;

  // Active class güncelle
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.conv-item[data-id="${convId}"]`)?.classList.add('active');

  // Başlık
  chatTitle.textContent = conv.title || 'Sohbet';

  // Seçiciler
  if (conv.level) levelSelect.value = conv.level;
  if (conv.subject) subjectSelect.value = conv.subject;

  // Mesajları göster
  welcomeScreen.style.display = 'none';
  messagesList.innerHTML = '';

  (conv.messages || []).forEach(msg => {
    appendMessage(msg.role, msg.content, false);
  });

  scrollToBottom();
}

async function deleteConversation(convId) {
  if (!confirm('Bu sohbeti silmek istiyor musun?')) return;
  try {
    await db.collection('users').doc(currentUser.uid)
      .collection('conversations').doc(convId).delete();
    delete conversations[convId];
    if (currentConvId === convId) {
      currentConvId = null;
      startNewChat();
    }
    renderConversationList();
  } catch (e) {
    console.error('Silme hatası:', e);
  }
}

function startNewChat() {
  currentConvId = null;
  chatTitle.textContent = 'Yeni Sohbet';
  messagesList.innerHTML = '';
  welcomeScreen.style.display = 'block';
  msgInput.value = '';
  autoResizeTextarea();
  sendBtn.classList.remove('active');
  sendBtn.disabled = true;
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  msgInput.focus();
}

// ─── Yeni Sohbet Oluştur (Firestore) ─────────────────────────────────────────
async function createConversation(firstMsg) {
  const title = firstMsg.slice(0, 50) + (firstMsg.length > 50 ? '…' : '');
  const level = levelSelect.value;
  const subject = subjectSelect.value;
  const ref = db.collection('users').doc(currentUser.uid).collection('conversations').doc();

  const data = {
    title, level, subject,
    messages: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(data);
  conversations[ref.id] = { id: ref.id, ...data, messages: [], updatedAt: new Date() };
  currentConvId = ref.id;

  chatTitle.textContent = title;
  welcomeScreen.style.display = 'none';

  renderConversationList();
  // Active yap
  setTimeout(() => {
    document.querySelector(`.conv-item[data-id="${ref.id}"]`)?.classList.add('active');
  }, 50);

  return ref.id;
}

// ─── Mesaj Kaydet (Firestore) ─────────────────────────────────────────────────
async function saveMessage(convId, role, content) {
  const msg = { role, content, timestamp: Date.now() };
  const convRef = db.collection('users').doc(currentUser.uid).collection('conversations').doc(convId);
  await convRef.update({
    messages: firebase.firestore.FieldValue.arrayUnion(msg),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (conversations[convId]) {
    if (!conversations[convId].messages) conversations[convId].messages = [];
    conversations[convId].messages.push(msg);
    conversations[convId].updatedAt = new Date();
    renderConversationList();
  }
}

// ─── Send Message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = msgInput.value.trim();
  const images = [...selectedImages]; // snapshot
  if (!text && images.length === 0) return;
  if (isLoading) return;

  // Temizle
  msgInput.value = '';
  selectedImages = [];
  renderImagePreviewStrip();
  autoResizeTextarea();
  sendBtn.classList.remove('active');
  sendBtn.disabled = true;

  const displayText = text || (images.length > 0 ? '📷 Görsel gönderildi' : '');

  // İlk mesajda sohbet oluştur
  if (!currentConvId) {
    await createConversation(displayText);
  }

  appendMessage('user', text, true, images);
  isLoading = true;

  const typingId = showTyping();

  try {
    const convMsgs = (conversations[currentConvId]?.messages || []);
    const response = await callGeminiAPI(text, convMsgs, images);
    removeTyping(typingId);
    appendMessage('assistant', response, true);
    await saveMessage(currentConvId, 'user', displayText);
    await saveMessage(currentConvId, 'assistant', response);
  } catch (e) {
    removeTyping(typingId);
    const errMsg = getApiError(e.message);
    appendMessage('assistant', `❌ ${errMsg}`, true);
  } finally {
    isLoading = false;
    msgInput.focus();
  }
}

// ─── Gemini API ───────────────────────────────────────────────────────────────
// images: { base64, mimeType }[]
async function callGeminiAPI(userMessage, history = [], images = []) {
  const systemPrompt = buildPrompt();

  // Kullanıcının son mesajı: metin + görsel parçaları
  const userParts = [];
  if (userMessage) userParts.push({ text: userMessage });
  images.forEach(img => {
    userParts.push({
      inlineData: { mimeType: img.mimeType, data: img.base64 }
    });
  });
  if (userParts.length === 0) userParts.push({ text: '' });

  // Geçmiş mesajları düzenle — ardışık aynı rol olmamalı
  const rawHistory = history.slice(-8).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // Ardışık aynı rolleri birleştir (API'nin kısıtlamasını karşılamak için)
  const mergedHistory = [];
  for (const msg of rawHistory) {
    const last = mergedHistory[mergedHistory.length - 1];
    if (last && last.role === msg.role) {
      last.parts.push(...msg.parts); // aynı role ait parçaları birleştir
    } else {
      mergedHistory.push({ role: msg.role, parts: [...msg.parts] });
    }
  }

  // Son mesaj 'model' ile bitiyorsa sonuna user mesajını ekle
  // Aksi hâlde API 'turns must alternate' hatası verir
  const contents = [...mergedHistory, { role: 'user', parts: userParts }];

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.15, maxOutputTokens: 8192, topP: 0.85, topK: 40 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  };

  const model = 'gemini-2.0-flash';

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

    // Model bulunamazsa eski modele geç
    if (res.status === 404) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
    }
  } catch (e) { throw new Error('NETWORK: ' + e.message); }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) throw new Error('RATE_LIMIT: ' + msg);
    if (res.status === 400) throw new Error('BAD_REQUEST: ' + msg);
    if (res.status === 403) throw new Error('INVALID_KEY: ' + msg);
    throw new Error(`HTTP_${res.status}: ` + msg);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('EMPTY_RESPONSE');
  return content;
}

function buildPrompt() {
  const level = levelSelect.value;
  const subject = subjectSelect.value;
  const levelMap = { ilkokul: 'İlkokul (1-4. sınıf)', ortaokul: 'Ortaokul (5-8. sınıf)', lise: 'Lise (9-12. sınıf)', universite: 'Üniversite' };
  const subjectMap = { matematik: 'Matematik', fizik: 'Fizik', kimya: 'Kimya', biyoloji: 'Biyoloji', turkce: 'Türkçe' };
  return `Sen EduAI, Türkiye MEB müfredatına uyumlu ${levelMap[level] || 'Ortaokul'} düzeyinde ${subjectMap[subject] || 'Matematik'} uzmanı öğretmensin.

FORMAT:
- 📌 **Konu**: Sorunun konusu
- 🔑 **Gerekenler**: Bilinmesi gereken ön bilgiler (kısa)
- 🧮 **Çözüm**: Adım adım açıklama (markdown ile)
- ⚡ **Pratik**: 2-3 benzer soru (kolay→zor)

KURALLAR:
- Türkçe yaz, öğrenci seviyesine uygun konuş
- Markdown formatı kullan (başlıklar, listeler, kod blokları)
- Formülleri açık şekilde yaz
- Kısa ama net ol
Seviye: ${levelMap[level]} | Ders: ${subjectMap[subject]}`;
}

function getApiError(msg) {
  if (msg?.includes('RATE_LIMIT')) return 'Çok hızlı istek gönderdiniz. 1 dakika bekleyip tekrar deneyin.';
  if (msg?.includes('INVALID_KEY')) return 'API anahtarı geçersiz. Lütfen sayfayı yenileyin.';
  if (msg?.includes('NETWORK')) return 'İnternet bağlantınızı kontrol edin.';
  if (msg?.includes('EMPTY_RESPONSE')) return 'Yapay zekadan yanıt alınamadı. Soruyu farklı şekilde deneyin.';
  if (msg?.includes('BAD_REQUEST')) return `Geçersiz istek: ${msg.replace('BAD_REQUEST: ', '')}`;
  return `Hata: ${msg || 'Bilinmeyen hata'}`;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
// images parametresi: { base64, mimeType }[] — sadece kullanıcı mesajında kullanılır
function appendMessage(role, content, animate = true, images = []) {
  const isAI = role === 'assistant';
  const row = document.createElement('div');
  row.className = `msg-row ${isAI ? 'ai-row' : 'user-row'}`;
  if (!animate) row.style.animation = 'none';

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Sen';
  const userInitial = userName.charAt(0).toUpperCase();

  const avatarHTML = isAI
    ? `<div class="msg-avatar ai-avatar" style="background:transparent;border:1.5px solid rgba(108,99,255,0.3);">
        <img src="educresimli.png" alt="EduX" style="width:26px;height:26px;object-fit:contain;" />
       </div>`
    : `<div class="msg-avatar user-avatar">${userInitial}</div>`;

  const formattedContent = isAI ? renderMarkdown(content) : (content ? `<p>${escapeHtml(content)}</p>` : '');

  // Görsel önizleme HTML'i (kullanıcı mesajı için)
  const imagesHTML = images.length > 0
    ? `<div class="msg-images">${images.map(img =>
      `<img src="data:${img.mimeType};base64,${img.base64}" alt="Gönderilen görsel" class="msg-inline-img" />`
    ).join('')}</div>`
    : '';

  row.innerHTML = `
    <div class="msg-inner">
      ${avatarHTML}
      <div class="msg-content">
        <div class="msg-name">${isAI ? 'EduAI' : escapeHtml(userName)}</div>
        ${imagesHTML}
        <div class="msg-text">${formattedContent}</div>
        <div class="msg-actions">
          <button class="msg-action-btn" onclick="copyText(this)" title="Kopyala">
            <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  messagesList.appendChild(row);
  scrollToBottom();
}

function showTyping() {
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row ai-row typing-msg';
  row.id = id;
  row.innerHTML = `
    <div class="msg-inner">
      <div class="msg-avatar ai-avatar" style="background:transparent;border:1.5px solid rgba(108,99,255,0.3);">
        <img src="" alt="EduX" style="width:26px;height:26px;object-fit:contain;" />
      </div>
      <div class="msg-content">
        <div class="msg-name">EduAI</div>
        <div class="msg-text">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  messagesList.appendChild(row);
  scrollToBottom();
  return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }
function scrollToBottom() { messagesArea.scrollTop = messagesArea.scrollHeight; }

function copyText(btn) {
  const text = btn.closest('.msg-content').querySelector('.msg-text').innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" width="13" height="13"><path d="M5 13l4 4L19 7" stroke="#43E97B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    setTimeout(() => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" width="13" height="13"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }, 1800);
  });
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  let html = text;
  html = html.replace(/```[\w]*\n([\s\S]+?)```/g, '<pre>$1</pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  // Paragraflara böl
  const lines = html.split('\n');
  const result = [];
  let para = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (para.length) {
        const j = para.join(' ');
        result.push(j.startsWith('<') ? j : `<p>${j}</p>`);
        para = [];
      }
    } else if (t.startsWith('<') && !t.startsWith('<strong') && !t.startsWith('<em') && !t.startsWith('<code')) {
      if (para.length) { result.push(`<p>${para.join(' ')}</p>`); para = []; }
      result.push(t);
    } else { para.push(t); }
  }
  if (para.length) {
    const j = para.join(' ');
    result.push(j.startsWith('<') ? j : `<p>${j}</p>`);
  }
  return result.join('\n');
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Dün';
  if (diff < 7) return `${diff} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
