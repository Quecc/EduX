/* =============================================
   BearMate Chat Page — chat.js
   Firebase Auth + Firestore + server-side Gemini proxy
   ============================================= */

// ─── Firebase Config (auth.js ile aynı) ─────────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "edux-5afd6.firebaseapp.com",
  projectId: "edux-5afd6",
  storageBucket: "edux-5afd6.firebasestorage.app",
  messagingSenderId: "32991193464",
  appId: "1:32991193464:web:652b3e374b102b73e1808d",
  measurementId: "G-HJTYMZ9TV9"
};


const GROQ_SYSTEM_PROMPT = `Sen BearMate AI Assistant - Türkiye MEB müfredatına uyumlu bir öğretmensin.
Her zaman Türkçe cevap ver. Matematikte adım adım çöz ve formülleri açıkla.
Kısa ve net ol. Markdown formatı kullan.`;

async function askGroq(userMessage, history = []) {
  const messages = [
    { role: 'system', content: GROQ_SYSTEM_PROMPT },
    ...history.slice(-6).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 1024,
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || res.status;
    if (res.status === 401) throw new Error('GROQ_KEY_INVALID');
    if (res.status === 429) throw new Error('GROQ_RATE_LIMIT');
    throw new Error('GROQ_ERROR: ' + msg);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── State ───────────────────────────────────────────────────────────────────
let auth, db;
let currentUser = null;
let currentConvId = null;
let conversations = {};   // { convId: { title, messages[], level, subject, updatedAt } }
let isLoading = false;
let selectedImages = [];  // { file, base64, mimeType }[]

// ─── Knowledge Base ──────────────────────────────────────────────────────────
// NOT: Bilgi tabanı araması artık sunucu tarafında RAG (vektör embedding) ile yapılıyor.
// Client-side KB kodu kaldırıldı — server.js + rag.js bunu otomatik hallediyor.



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

  // Tema restore
  const savedTheme = localStorage.getItem('bearly_theme');
  const isDark = savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) document.body.classList.add('dark-mode');
  updateThemeUI(isDark);

  // Görünüm ayarlarını restore
  const savedFont = localStorage.getItem('bearly_font_size');
  if (savedFont) document.body.dataset.fontSize = savedFont;
  const savedCodeTheme = localStorage.getItem('bearly_code_theme');
  if (savedCodeTheme) document.body.dataset.codeTheme = savedCodeTheme;
  const savedMsgStyle = localStorage.getItem('bearly_msg_style');
  if (savedMsgStyle) document.body.dataset.msgStyle = savedMsgStyle;
  const savedContrast = localStorage.getItem('bearly_contrast');
  if (savedContrast) document.body.dataset.contrast = savedContrast;
  const savedNoAnim = localStorage.getItem('bearly_no_animation');
  if (savedNoAnim) document.body.dataset.noAnimation = savedNoAnim;
  // Accent color restore
  applyAccentColor(localStorage.getItem('bearly_accent') || 'blue');

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

function updateThemeUI(isDark) {
  // Sidebar logo filter
  const sidebarLogo = document.querySelector('.sidebar-logo img');
  if (sidebarLogo) {
    sidebarLogo.style.filter = isDark ? 'brightness(0) invert(1)' : 'none';
  }
}

function applyTheme(mode) {
  localStorage.setItem('bearly_theme', mode);
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-mode', prefersDark);
    updateThemeUI(prefersDark);
  } else {
    const isDark = mode === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    updateThemeUI(isDark);
  }
}

function applyAccentColor(accent) {
  const colorMap = { blue:'#0071E3', purple:'#6C63FF', green:'#34C759', orange:'#FF9500', pink:'#FF2D55', teal:'#5AC8FA' };
  const color = colorMap[accent] || colorMap.blue;
  document.documentElement.style.setProperty('--primary', color);
  localStorage.setItem('bearly_accent', accent);
}

function openSettings() {
  document.getElementById('settingsModal').classList.add('open');
  document.getElementById('settingsOverlay').classList.add('open');
  // Mevcut ayarları yansıt
  const savedTheme = localStorage.getItem('bearly_theme') || 'light';
  document.getElementById('settingsThemeSelect').value = savedTheme;
  const savedFont = localStorage.getItem('bearly_font_size') || 'normal';
  document.getElementById('settingsFontSize').value = savedFont;
  if (levelSelect) document.getElementById('settingsLevelSelect').value = levelSelect.value;
  if (subjectSelect) document.getElementById('settingsSubjectSelect').value = subjectSelect.value;

  // Vurgu rengi
  const savedAccent = localStorage.getItem('bearly_accent') || 'blue';
  document.querySelectorAll('.accent-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.accent === savedAccent);
  });

  // Görünüm ayarları
  const el = (id, key, def) => { const e = document.getElementById(id); if (e) e.value = localStorage.getItem(key) || def; };
  el('settingsAiBg', 'bearly_ai_bg', 'default');
  el('settingsMsgStyle', 'bearly_msg_style', 'default');
  el('settingsCodeTheme', 'bearly_code_theme', 'dark');
  el('settingsContrast', 'bearly_contrast', 'normal');
  el('settingsLang', 'bearly_lang', 'tr');

  // Custom AI BG color
  const aiBgCustom = document.getElementById('settingsAiBgCustom');
  if (aiBgCustom) aiBgCustom.value = localStorage.getItem('bearly_ai_bg_custom') || '#f0f4ff';
  const customRow = document.getElementById('customAiBgRow');
  if (customRow) customRow.style.display = (localStorage.getItem('bearly_ai_bg') === 'custom') ? 'flex' : 'none';

  // Mesaj animasyonu
  const animEl = document.getElementById('settingsMsgAnimation');
  if (animEl) animEl.checked = localStorage.getItem('bearly_no_animation') !== 'true';

  // Kişiselleştirme
  el('settingsTone', 'bearly_tone', 'default');
  el('settingsFriendly', 'bearly_friendly', 'default');
  el('settingsHeadings', 'bearly_headings', 'default');
  el('settingsEmoji', 'bearly_emoji', 'default');

  const quickEl = document.getElementById('settingsQuickReplies');
  if (quickEl) quickEl.checked = localStorage.getItem('bearly_quick_replies') !== 'false';

  const customInst = document.getElementById('settingsCustomInstructions');
  if (customInst) customInst.value = localStorage.getItem('bearly_custom_instructions') || '';
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
  document.getElementById('settingsOverlay').classList.remove('open');
}

// ─── Auth UI ─────────────────────────────────────────────────────────────────
async function showChatApp(user) {
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

  // Firestore'dan kullanıcı verisini yükle (seviye + profil fotoğrafı)
  if (db) {
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        // Kullanıcının eğitim seviyesini AI için ayarla
        if (data.level && levelSelect) {
          levelSelect.value = data.level;
        }
        // Profil fotoğrafını sidebar'a yükle
        if (data.profilePhoto) {
          const img = document.createElement('img');
          img.src = data.profilePhoto;
          img.alt = name;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
          sidebarAvatar.innerHTML = '';
          sidebarAvatar.appendChild(img);
        }
      }
    } catch(e) { /* ignore */ }
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

  // ── Popup Menü (ChatGPT tarzı) ───────────────────────────────────────────────
  const userRow = document.getElementById('sidebarUser');
  const popupMenu = document.getElementById('userPopupMenu');

  userRow.addEventListener('click', (e) => {
    e.stopPropagation();
    popupMenu.classList.toggle('open');
  });

  // Dışarı tıklayınca kapat
  document.addEventListener('click', (e) => {
    if (!popupMenu.contains(e.target) && !userRow.contains(e.target)) {
      popupMenu.classList.remove('open');
    }
  });

  // Ayarlar butonu
  document.getElementById('openSettingsBtn').addEventListener('click', () => {
    popupMenu.classList.remove('open');
    openSettings();
  });

  // Yardım butonu
  document.getElementById('popupHelpBtn').addEventListener('click', () => {
    popupMenu.classList.remove('open');
    window.open('mailto:destek@bearly.com', '_blank');
  });

  // Çıkış butonu (popup'tan)
  document.getElementById('popupLogoutBtn').addEventListener('click', async () => {
    popupMenu.classList.remove('open');
    await auth.signOut();
    window.location.href = 'index.html';
  });

  // ── Ayarlar Modalı ─────────────────────────────────────────────────────────
  document.getElementById('settingsCloseBtn').addEventListener('click', closeSettings);
  document.getElementById('settingsOverlay').addEventListener('click', closeSettings);

  // Tab navigasyonu
  document.querySelectorAll('[data-settings-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.settingsTab;
      document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.settings-tab-content').forEach(t => t.classList.remove('active'));
      const tabMap = { general: 'settingsTabGeneral', appearance: 'settingsTabAppearance', personalize: 'settingsTabPersonalize', about: 'settingsTabAbout' };
      document.getElementById(tabMap[tabId])?.classList.add('active');
    });
  });

  // Tema seçimi
  document.getElementById('settingsThemeSelect').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Yazı boyutu
  document.getElementById('settingsFontSize').addEventListener('change', (e) => {
    const size = e.target.value;
    document.body.dataset.fontSize = size;
    localStorage.setItem('bearly_font_size', size);
  });

  // Vurgu rengi
  document.querySelectorAll('.accent-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      applyAccentColor(swatch.dataset.accent);
    });
  });

  // AI Mesaj Arka Plan
  document.getElementById('settingsAiBg')?.addEventListener('change', (e) => {
    localStorage.setItem('bearly_ai_bg', e.target.value);
    const customRow = document.getElementById('customAiBgRow');
    if (customRow) customRow.style.display = e.target.value === 'custom' ? 'flex' : 'none';
  });
  document.getElementById('settingsAiBgCustom')?.addEventListener('input', (e) => {
    localStorage.setItem('bearly_ai_bg_custom', e.target.value);
  });

  // Mesaj Baloncuk Stili
  document.getElementById('settingsMsgStyle')?.addEventListener('change', (e) => {
    document.body.dataset.msgStyle = e.target.value;
    localStorage.setItem('bearly_msg_style', e.target.value);
  });

  // Kod Bloğu Teması
  document.getElementById('settingsCodeTheme')?.addEventListener('change', (e) => {
    document.body.dataset.codeTheme = e.target.value;
    localStorage.setItem('bearly_code_theme', e.target.value);
  });

  // Mesaj Animasyonu
  document.getElementById('settingsMsgAnimation')?.addEventListener('change', (e) => {
    const noAnim = !e.target.checked;
    document.body.dataset.noAnimation = noAnim ? 'true' : 'false';
    localStorage.setItem('bearly_no_animation', noAnim ? 'true' : 'false');
  });

  // Kontrast
  document.getElementById('settingsContrast')?.addEventListener('change', (e) => {
    document.body.dataset.contrast = e.target.value;
    localStorage.setItem('bearly_contrast', e.target.value);
  });

  // Konuşma Tonu, Nitelikler
  ['settingsTone', 'settingsFriendly', 'settingsHeadings', 'settingsEmoji'].forEach(id => {
    const keyMap = { settingsTone:'bearly_tone', settingsFriendly:'bearly_friendly', settingsHeadings:'bearly_headings', settingsEmoji:'bearly_emoji' };
    document.getElementById(id)?.addEventListener('change', (e) => {
      localStorage.setItem(keyMap[id], e.target.value);
    });
  });

  // Hızlı Yanıtlar Toggle
  document.getElementById('settingsQuickReplies')?.addEventListener('change', (e) => {
    localStorage.setItem('bearly_quick_replies', e.target.checked ? 'true' : 'false');
  });

  // Özel Talimatlar
  document.getElementById('settingsCustomInstructions')?.addEventListener('input', (e) => {
    localStorage.setItem('bearly_custom_instructions', e.target.value);
  });

  // Tüm sohbetleri sil
  document.getElementById('clearAllChatsBtn').addEventListener('click', async () => {
    if (!confirm('Tüm sohbet geçmişini silmek istiyor musun? Bu işlem geri alınamaz.')) return;
    if (!currentUser || !db) return;
    try {
      const snap = await db.collection('users').doc(currentUser.uid).collection('conversations').get();
      const batch = db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      conversations = {};
      currentConvId = null;
      startNewChat();
      renderConversationList();
      closeSettings();
    } catch(e) { console.error('Sohbet silme hatası:', e); }
  });

  // Seviye/ders ayarları (senkronize)
  document.getElementById('settingsLevelSelect').addEventListener('change', (e) => {
    if (levelSelect) levelSelect.value = e.target.value;
    localStorage.setItem('bearly_level', e.target.value);
  });
  document.getElementById('settingsSubjectSelect').addEventListener('change', (e) => {
    if (subjectSelect) subjectSelect.value = e.target.value;
    localStorage.setItem('bearly_subject', e.target.value);
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

  // ── Clipboard Paste (Ctrl+V) ile görsel ekleme ────────────────────────────
  document.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();
    const MAX = 5;
    const MAX_MB = 10;

    for (const item of imageItems.slice(0, MAX - selectedImages.length)) {
      const file = item.getAsFile();
      if (!file || file.size > MAX_MB * 1024 * 1024) continue;
      const base64 = await fileToBase64(file);
      selectedImages.push({ file, base64, mimeType: file.type || 'image/png' });
    }

    renderImagePreviewStrip();
    updateSendBtn();
    msgInput.focus();
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

// Görseli sıkıştırarak base64 döndür (Firestore 1MB limitine uyum)
function compressImageBase64(base64, mimeType, maxDim = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]); // return only base64 part
    };
    img.onerror = () => resolve(base64); // fallback: orijinal
    img.src = `data:${mimeType};base64,${base64}`;
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

  const icon = '<svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  el.innerHTML = `
    <div class="conv-item-icon">${icon}</div>
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
    appendMessage(msg.role, msg.content, false, msg.images || []);
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
async function saveMessage(convId, role, content, images = []) {
  const msg = { role, content, timestamp: Date.now() };

  // Görselleri sıkıştırarak kaydet (Firestore 1MB belge limiti)
  if (images.length > 0) {
    try {
      const compressed = [];
      for (const img of images) {
        // Agresif sıkıştırma: max 400px, %40 kalite
        const smallBase64 = await compressImageBase64(img.base64, img.mimeType, 400, 0.4);
        compressed.push({ base64: smallBase64, mimeType: 'image/jpeg' });
      }
      msg.images = compressed;
      console.log(`📸 ${compressed.length} görsel sıkıştırıldı (toplam ~${Math.round(compressed.reduce((s,i) => s + i.base64.length, 0) / 1024)} KB)`);
    } catch (compErr) {
      console.error('⚠️ Görsel sıkıştırma hatası:', compErr);
    }
  }

  try {
    const convRef = db.collection('users').doc(currentUser.uid).collection('conversations').doc(convId);
    await convRef.update({
      messages: firebase.firestore.FieldValue.arrayUnion(msg),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Mesaj kaydedildi (role: ${role}, images: ${msg.images?.length || 0})`);
  } catch (saveErr) {
    console.error('❌ Firestore kaydetme hatası:', saveErr);
    // Görsel çok büyükse görselsiz kaydetmeyi dene
    if (msg.images && saveErr.message?.includes('size')) {
      console.warn('⚠️ Görsel çok büyük, görselsiz kaydediliyor...');
      delete msg.images;
      try {
        const convRef = db.collection('users').doc(currentUser.uid).collection('conversations').doc(convId);
        await convRef.update({
          messages: firebase.firestore.FieldValue.arrayUnion(msg),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e2) {
        console.error('❌ Görselsiz kaydetme de başarısız:', e2);
      }
    }
  }

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

  const displayText = text || (images.length > 0 ? 'Görsel gönderildi' : '');

  // İlk mesajda sohbet oluştur
  if (!currentConvId) {
    await createConversation(displayText);
  }

  appendMessage('user', text, true, images);
  isLoading = true;

  // Kullanıcı mesajını HEMEN kaydet (görseller dahil) — API yanıtını bekleme
  await saveMessage(currentConvId, 'user', displayText, images);

  const typingId = showTyping();

  try {
    const convMsgs = (conversations[currentConvId]?.messages || []);

    const response = await callGeminiAPI(text, convMsgs, images);

    removeTyping(typingId);
    appendMessage('assistant', response, true);
    await saveMessage(currentConvId, 'assistant', response);
  } catch (e) {
    removeTyping(typingId);
    appendMessage('assistant', `Hata: ${e.message}`, true);
  } finally {
    isLoading = false;
    msgInput.focus();
  }
}


// ─── Gemini API ───────────────────────────────────────────────────────────────
// images: { base64, mimeType }[]
async function callGeminiAPI(userMessage, history = [], images = []) {
  const subject = subjectSelect?.value || 'matematik';
  const level = levelSelect?.value || 'lise';
  // Seviye → sınıf dönüşümü (RAG filtresi için)
  const sinifMap = { ilkokul: null, ortaokul: null, lise: null, universite: null };
  const sinif = sinifMap[level] || null; // null = tüm sınıfları ara

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
    generationConfig: { temperature: 0.15, maxOutputTokens: 16384, topP: 0.85, topK: 40 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  };

  const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash',
  ];

  let res;
  try {
    res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        models: MODELS,
        payload,
        subject,  // RAG filtresi için
        sinif,    // RAG filtresi için
      }),
    });
  } catch (e) { throw new Error('NETWORK: ' + e.message); }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    const code = err?.error?.code || '';
    if (code === 'MISSING_SERVER_API_KEY') throw new Error('MISSING_SERVER_API_KEY: ' + msg);
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

  // Personalization settings
  const tone = localStorage.getItem('bearly_tone') || 'default';
  const emoji = localStorage.getItem('bearly_emoji') || 'default';
  const headings = localStorage.getItem('bearly_headings') || 'default';
  const customInstructions = localStorage.getItem('bearly_custom_instructions') || '';

  const toneMap = { friendly: 'Samimi ve arkadaşça bir üslupla konuş, öğrenciye yakın ol.', formal: 'Resmi ve profesyonel bir üslup kullan.', academic: 'Akademik ve bilimsel terminoloji kullan, kaynak belirt.', fun: 'Eğlenceli, enerji dolu ve motive edici bir üslupla konuş.' };
  const tonePrompt = toneMap[tone] ? `ÜSLUP: ${toneMap[tone]}` : '';

  const emojiMap = { more: 'Yanıtlarında bol emoji kullan 🎉🚀✨', less: 'Yanıtlarında çok az emoji kullan.', none: 'Yanıtlarında hiç emoji KULLANMA.' };
  const emojiPrompt = emojiMap[emoji] ? `EMOJI: ${emojiMap[emoji]}` : '';

  const headingsMap = { more: 'Daha fazla başlık ve listele kullan, yapıyı netce göster.', less: 'Daha az başlık kullan, daha akıcı yaz.' };
  const headingsPrompt = headingsMap[headings] ? `FORMAT TERCİHİ: ${headingsMap[headings]}` : '';

  return `Sen BearMate AI, Türkiye MEB müfredatına uyumlu ${levelMap[level] || 'Ortaokul'} düzeyinde ${subjectMap[subject] || 'Matematik'} uzmanı öğretmensin.

ÖNEMLİ: Eğer sistem talimatında "DERS KİTABINDAN İLGİLİ BÖLÜMLER" başlığı altında ders kitabı bölümleri verilmişse, cevabını mümkün olduğunda bu bölümdeki anlatım, örnek ve terminolojiyle destekle. Kitaptaki formül ve örneklere atıf yap.

${tonePrompt}
${emojiPrompt}
${headingsPrompt}
${customInstructions ? 'ÖZEL TALİMATLAR:\n' + customInstructions : ''}

FORMAT:
- 📌 **Konu**: Sorunun konusu
- 🔑 **Gerekenler**: Bilinmesi gereken ön bilgiler (kısa bullets, her madde için standart LaTeX formülleri kullan: $n = \\frac{m}{M}$ gibi)
- 🧮 **Çözüm**: Her adımı numaralandırarak yaz. Her matematiksel ifadeyi $...$ (satır içi) veya $$...$$ (ayrı satır, önemli denklemler için) ile göster.
- ✅ **Sonuç**: Net bir cümleyle sonucu özetle.
- ⚡ **Pratik**: 2 benzer soru (cevaplarıyla birlikte)

MATEMATİK KURALLARI (KESİNLİKLE UY):
- Tüm matematiksel ifadeler KaTeX uyumlu LaTeX olmalı: $\\text{Mol sayısı} = \\frac{\\text{Kütle}}{M}$
- Satır içi formül: $E = mc^2$ — Ayrı satır formül: $$n = \\frac{m}{M}$$
- \\frac{pay}{payda} kullan, / işareti KULLANMA formüllerde
- Alt indis: $n_{X}$, üst indis: $x^{2}$
- Özel semboller: $N_A$, $\\times$, $\\cdot$, $\\text{mol}$, $\\text{g/mol}$, $\\text{L}$
- Hiçbir zaman formülü yarım bırakma veya kesme
- Cevabını ASLA yarıda kesme, her zaman tam ve eksiksiz ver

METİN KURALLARI:
- Türkçe yaz, öğrenci seviyesine uygun konuş
- Markdown kullan (**kalın**, *italik*, - liste, ## başlık)
- Ders kitabı verisi varsa ona öncelik ver
Seviye: ${levelMap[level]} | Ders: ${subjectMap[subject]}`;
}

function getApiError(msg) {
  if (msg?.includes('RATE_LIMIT')) return 'Çok hızlı istek gönderdiniz. 1 dakika bekleyip tekrar deneyin.';
  if (msg?.includes('INVALID_KEY')) return 'API anahtarı geçersiz. Lütfen sayfayı yenileyin.';
  if (msg?.includes('MISSING_SERVER_API_KEY')) return 'Sunucuda Gemini anahtarı tanımlı değil. `.env` dosyasını kontrol edin.';
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

  // Apply AI background setting
  if (isAI) {
    const aiBg = localStorage.getItem('bearly_ai_bg') || 'default';
    if (aiBg !== 'default') {
      row.dataset.aiBg = aiBg;
      if (aiBg === 'custom') {
        const customColor = localStorage.getItem('bearly_ai_bg_custom') || '#f0f4ff';
        row.style.background = customColor;
      }
    }
  }

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Sen';
  const userInitial = userName.charAt(0).toUpperCase();

  const avatarHTML = isAI
    ? `<div class="msg-avatar ai-avatar" style="background:transparent;border:1.5px solid rgba(0,113,227,0.2);">
        <img src="beareduxaimg.png" alt="BearMate" style="width:26px;height:26px;object-fit:contain;" />
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
        <div class="msg-name">${isAI ? 'BearMate AI' : escapeHtml(userName)}</div>
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

  // KaTeX ile matematik formüllerini render et
  if (isAI) {
    const msgTextEl = row.querySelector('.msg-text');
    if (msgTextEl) {
      // KaTeX defer ile yüklendiği için kısa bekleme
      setTimeout(() => applyKaTeX(msgTextEl), 150);
    }
  }

  scrollToBottom();
}

function showTyping() {
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row ai-row typing-msg';
  row.id = id;
  row.innerHTML = `
    <div class="msg-inner">
      <div class="msg-avatar ai-avatar" style="background:transparent;border:1.5px solid rgba(0,113,227,0.2);">
        <img src="" alt="BearMate" style="width:26px;height:26px;object-fit:contain;" />
      </div>
      <div class="msg-content">
        <div class="msg-name">BearMate AI</div>
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
  // 1) Math bloklarını koru (KaTeX sonradan render edecek, şimdi dokunma)
  const mathBlocks = [];
  let html = text;

  // $$...$$ display math
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    mathBlocks.push({ type: 'display', expr });
    return `%%MATH_DISPLAY_${mathBlocks.length - 1}%%`;
  });
  // $...$ inline math (tek $ ama içinde $ olmayan)
  html = html.replace(/\$([^$\n]+?)\$/g, (_, expr) => {
    mathBlocks.push({ type: 'inline', expr });
    return `%%MATH_INLINE_${mathBlocks.length - 1}%%`;
  });

  // 2) Kod bloklarını koru
  const codeBlocks = [];
  html = html.replace(/```[\w]*\n?([\s\S]+?)```/g, (_, code) => {
    codeBlocks.push(code.trim());
    return `%%CODE_${codeBlocks.length - 1}%%`;
  });

  // 3) Markdown dönüşümleri
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^#### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Numaralı liste
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li data-n="$1">$2</li>');
  // Madde işaretli liste
  html = html.replace(/^[-•*] (.+)$/gm, '<li>$1</li>');
  // Ardışık <li>'leri <ul>/<ol>'e sar
  html = html.replace(/(<li data-n[^>]*>.*<\/li>\n?)+/g, m => `<ol>${m}</ol>`);
  html = html.replace(/(<li>(?!.*data-n).*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  // 4) Paragraflara böl
  const lines = html.split('\n');
  const result = [];
  let para = [];
  const blockTags = ['<h2', '<h3', '<h4', '<h5', '<ul', '<ol', '<li', '<pre', '<hr', '<blockquote'];

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (para.length) {
        result.push(`<p>${para.join(' ')}</p>`);
        para = [];
      }
    } else if (blockTags.some(tag => t.startsWith(tag))) {
      if (para.length) { result.push(`<p>${para.join(' ')}</p>`); para = []; }
      result.push(t);
    } else {
      para.push(t);
    }
  }
  if (para.length) result.push(`<p>${para.join(' ')}</p>`);

  html = result.join('\n');

  // 5) Kod bloklarını geri yükle
  codeBlocks.forEach((code, i) => {
    html = html.replace(`%%CODE_${i}%%`, `<pre><code>${escapeHtml(code)}</code></pre>`);
  });

  // 6) Math placeholder'larını KaTeX span'larına çevir
  mathBlocks.forEach(({ type, expr }, i) => {
    const key = type === 'display' ? `%%MATH_DISPLAY_${i}%%` : `%%MATH_INLINE_${i}%%`;
    const cls = type === 'display' ? 'math-display' : 'math-inline';
    // Span içine raw LaTeX koy — KaTeX auto-render sonra işleyecek
    const safe = expr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const delimiter = type === 'display' ? `$$${expr}$$` : `$${expr}$`;
    html = html.replace(key, `<span class="${cls}">${delimiter}</span>`);
  });

  return html;
}

// KaTeX ile matematik formüllerini render et
function applyKaTeX(el) {
  // KaTeX auto-render.min.js, window.renderMathInElement olarak yüklenir
  if (typeof window.renderMathInElement === 'function') {
    window.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
      strict: false,
      output: 'htmlAndMathml',
    });
  }
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
