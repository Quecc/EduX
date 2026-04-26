/* =============================================
   Bearly - Firebase Authentication
   Giriş / Kayıt / Google / Apple
   =============================================
   ⚠️  KURULUM: Firebase config'ini aşağıya girin!
   console.firebase.google.com → Proje Ayarları → Web App
   ============================================= */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "edux-5afd6.firebaseapp.com",
  projectId:         "edux-5afd6",
  storageBucket:     "edux-5afd6.firebasestorage.app",
  messagingSenderId: "32991193464",
  appId:             "1:32991193464:web:652b3e374b102b73e1808d",
  measurementId:     "G-HJTYMZ9TV9"
};

// ─── Firebase Init ────────────────────────────────────────────────────────────
let auth, db, firebaseReady = false;

function initFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db   = firebase.firestore();

    // Türkçe hata mesajları için dil
    auth.languageCode = 'tr';

    firebaseReady = firebaseConfig.apiKey !== 'YOUR_API_KEY';

    if (!firebaseReady) {
      showFirebaseSetupBanner();
    }

    // Auth durum değişikliğini izle
    auth.onAuthStateChanged(onAuthStateChange);

  } catch (e) {
    console.error('Firebase başlatma hatası:', e);
    showFirebaseSetupBanner();
  }
}

// ─── Auth State ───────────────────────────────────────────────────────────────
function onAuthStateChange(user) {
  if (user) {
    showUserInNavbar(user);
  } else {
    showAuthButtonsInNavbar();
  }
}

// ─── Google ile Giriş ─────────────────────────────────────────────────────────
async function signInWithGoogle() {
  if (!firebaseReady) { showSetupAlert(); return; }
  setAuthLoading(true, 'google');
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const result = await auth.signInWithPopup(provider);
    await saveUserToFirestore(result.user, { provider: 'google' });
    closeAllModals();
    showSuccessToast(`Hoş geldin, ${result.user.displayName?.split(' ')[0] || ''}!`);
  } catch (e) {
    showAuthError(getAuthErrorMsg(e));
  } finally {
    setAuthLoading(false, 'google');
  }
}

// ─── Apple ile Giriş ─────────────────────────────────────────────────────────
async function signInWithApple() {
  if (!firebaseReady) { showSetupAlert(); return; }
  try {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    setAuthLoading(true, 'apple');
    const result = await auth.signInWithPopup(provider);
    const displayName = result.additionalUserInfo?.profile?.name
      || result.user.displayName
      || result.user.email?.split('@')[0];
    await saveUserToFirestore(result.user, { provider: 'apple', displayName });
    closeAllModals();
    showSuccessToast(`Hoş geldin!`);
  } catch (e) {
    if (e.code === 'auth/operation-not-allowed') {
      showAuthError('Apple girişi için Firebase konsolunda Apple Sign-In etkinleştirilmeli ve Apple Developer hesabı gereklidir.');
    } else {
      showAuthError(getAuthErrorMsg(e));
    }
  } finally {
    setAuthLoading(false, 'apple');
  }
}

// ─── E-posta ile Giriş ────────────────────────────────────────────────────────
async function signInWithEmail(email, password) {
  if (!firebaseReady) { showSetupAlert(); return; }
  setAuthLoading(true, 'email-login');
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    closeAllModals();
    showSuccessToast(`Tekrar hoş geldin!`);
  } catch (e) {
    showLoginError(getAuthErrorMsg(e));
  } finally {
    setAuthLoading(false, 'email-login');
  }
}

// ─── Kayıt Ol ────────────────────────────────────────────────────────────────
async function registerWithEmail(data) {
  if (!firebaseReady) { showSetupAlert(); return; }
  const { fullName, email, password, level, birthYear, track, grade } = data;
  setAuthLoading(true, 'register');
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: fullName });
    await saveUserToFirestore(result.user, {
      provider: 'email',
      displayName: fullName,
      level: level || '',
      birthYear: birthYear || '',
      track: track || 'mixed',
      grade: grade || '',
    });
    closeAllModals();
    showSuccessToast(`Hoş geldin, ${fullName.split(' ')[0]}! Hesabın oluşturuldu.`);
  } catch (e) {
    showRegisterError(getAuthErrorMsg(e));
  } finally {
    setAuthLoading(false, 'register');
  }
}

// ─── Çıkış ───────────────────────────────────────────────────────────────────
async function signOutUser() {
  try {
    await auth.signOut();
    showSuccessToast('Başarıyla çıkış yapıldı. Görüşürüz! 👋');
  } catch (e) {
    console.error('Çıkış hatası:', e);
  }
}

// ─── Firestore Kullanıcı Kaydet ───────────────────────────────────────────────
async function saveUserToFirestore(user, extra = {}) {
  if (!db) return;
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();

  const baseData = {
    uid: user.uid,
    email: user.email,
    displayName: extra.displayName || user.displayName || '',
    photoURL: user.photoURL || '',
    provider: extra.provider || 'unknown',
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (!snap.exists) {
    // İlk kayıt
    await ref.set({
      ...baseData,
      level: extra.level || '',
      birthYear: extra.birthYear || '',
      track: extra.track || 'mixed',
      grade: extra.grade || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // Güncelle
    await ref.update(baseData);
  }
}

// ─── Navbar UI ────────────────────────────────────────────────────────────────
async function showUserInNavbar(user) {
  const authButtons = document.getElementById('navAuthButtons');
  const userProfile = document.getElementById('navUserProfile');
  const userName    = document.getElementById('navUserName');
  const userClass   = document.getElementById('navUserClass');
  const userInitial = document.getElementById('navUserInitial');
  const userInitial2 = document.getElementById('navUserInitial2');
  const userPhoto   = document.getElementById('navUserPhoto');

  if (!authButtons || !userProfile) return;

  const name = user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
  const initial = name.charAt(0).toUpperCase();

  if (userName)    userName.textContent = name;
  if (userInitial) userInitial.textContent = initial;
  if (userInitial2) userInitial2.textContent = initial;

  if (userClass && db) {
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        const levelMap = { 'ilkokul': 'İlkokul', 'ortaokul': 'Ortaokul', 'lise': 'Lise', 'universite': 'Üniversite' };
        let classText = levelMap[data.level] || data.level || '';
        if (data.grade) classText += ' — ' + data.grade + '. Sınıf';
        userClass.textContent = classText || user.email;
      } else {
        userClass.textContent = user.email || '';
      }
    } catch(e) {
      userClass.textContent = user.email || '';
    }
  }

  if (userPhoto && user.photoURL) {
    userPhoto.src   = user.photoURL;
    userPhoto.style.display = 'block';
    if (userInitial) userInitial.style.display = 'none';
  } else if (userInitial) {
    userInitial.style.display = 'flex';
    if (userPhoto) userPhoto.style.display = 'none';
  }

  // Firestore profil fotoğrafını navbar'a yükle
  if (db) {
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data().profilePhoto) {
        const photoUrl = userDoc.data().profilePhoto;
        // Ana avatar butonu
        const avatarBtn = document.getElementById('navUserAvatarBtn');
        if (avatarBtn) {
          if (userInitial) userInitial.style.display = 'none';
          if (userPhoto) userPhoto.style.display = 'none';
          // Mevcut pp img varsa kaldır
          const existingImg = avatarBtn.querySelector('.nav-profile-img');
          if (existingImg) existingImg.remove();
          const img = document.createElement('img');
          img.src = photoUrl;
          img.alt = 'Profil';
          img.className = 'nav-profile-img';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
          avatarBtn.style.position = 'relative';
          avatarBtn.appendChild(img);
        }
        // Dropdown header avatar
        const dropAvatar = document.querySelector('.user-dropdown-avatar');
        if (dropAvatar && userInitial2) {
          userInitial2.style.display = 'none';
          const existingImg2 = dropAvatar.querySelector('.nav-profile-img');
          if (existingImg2) existingImg2.remove();
          const img2 = document.createElement('img');
          img2.src = photoUrl;
          img2.alt = 'Profil';
          img2.className = 'nav-profile-img';
          img2.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
          dropAvatar.style.position = 'relative';
          dropAvatar.appendChild(img2);
        }
      }
    } catch(e) { /* ignore */ }
  }

  authButtons.style.display = 'none';
  userProfile.style.display = 'flex';

  // --- Hero Section Updates (Giriş Yapıldı) ---
  const welcomeText = document.getElementById('heroWelcomeText');
  if (welcomeText) {
    welcomeText.textContent = `Hoş geldin, ${name}`;
    welcomeText.style.display = 'block';
  }

  const heroStartBtn = document.getElementById('heroStartBtn');
  if (heroStartBtn) {
    heroStartBtn.innerHTML = '<span>BearMate\'e Git</span><svg viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>';
  }

  const heroSecondaryBtn = document.getElementById('heroSecondaryBtn');
  const heroSecondaryText = document.getElementById('heroSecondaryText');
  if (heroSecondaryBtn && heroSecondaryText) {
    heroSecondaryText.textContent = 'Çalışma Programı';
    heroSecondaryBtn.href = 'calisma-programi.html';
  }
}

function showAuthButtonsInNavbar() {
  const authButtons = document.getElementById('navAuthButtons');
  const userProfile = document.getElementById('navUserProfile');
  if (authButtons) authButtons.style.display = 'flex';
  if (userProfile) userProfile.style.display = 'none';

  // --- Hero Section Restores (Çıkış Yapıldı) ---
  const welcomeText = document.getElementById('heroWelcomeText');
  if (welcomeText) welcomeText.style.display = 'none';

  const heroStartBtn = document.getElementById('heroStartBtn');
  if (heroStartBtn) {
    heroStartBtn.innerHTML = `
          <span>BearMate'e Git</span>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
    `;
  }

  const heroSecondaryBtn = document.getElementById('heroSecondaryBtn');
  const heroSecondaryText = document.getElementById('heroSecondaryText');
  if (heroSecondaryBtn && heroSecondaryText) {
    heroSecondaryText.textContent = 'Çalışma Programı';
    heroSecondaryBtn.href = 'calisma-programi.html';
  }
}

// ─── Modal Yönetimi ──────────────────────────────────────────────────────────
function openLoginModal() {
  clearModalErrors();
  document.getElementById('loginModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('loginEmail')?.focus(), 200);
}

function openRegisterModal() {
  clearModalErrors();
  document.getElementById('registerModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('regFullName')?.focus(), 200);
}

function closeAllModals() {
  document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
  clearModalErrors();
}

function switchToRegister() {
  closeAllModals();
  setTimeout(openRegisterModal, 100);
}

function switchToLogin() {
  closeAllModals();
  setTimeout(openLoginModal, 100);
}

// ─── Form Gönderimi ──────────────────────────────────────────────────────────
function setupAuthForms() {
  // Giriş formu
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      showLoginError('Lütfen tüm alanları doldurun.');
      return;
    }
    await signInWithEmail(email, password);
  });

  // Kayıt formu
  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName  = document.getElementById('regFullName').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const password  = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    const level     = document.getElementById('regLevel').value;
    const track     = document.getElementById('regTrack').value;
    const birthYear = document.getElementById('regBirthYear').value;
    const grade     = document.getElementById('regGrade')?.value || '';

    if (!fullName || !email || !password || !password2) {
      showRegisterError('Lütfen zorunlu alanları doldurun.');
      return;
    }
    if (password.length < 8) {
      showRegisterError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== password2) {
      showRegisterError('Şifreler eşleşmiyor.');
      return;
    }
    await registerWithEmail({ fullName, email, password, level, birthYear, track, grade });
  });

  // Şifremi Unuttum
  document.getElementById('forgotPasswordLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
      showLoginError('Lütfen önce e-posta adresinizi girin.');
      return;
    }
    if (!firebaseReady) { showSetupAlert(); return; }
    try {
      await auth.sendPasswordResetEmail(email);
      showLoginError('Şifre sıfırlama bağlantısı e-postanıza gönderildi! ✅', true);
    } catch (e) {
      showLoginError(getAuthErrorMsg(e));
    }
  });

  // Kullanıcı dropdown toggle
  document.getElementById('navUserAvatarBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.remove('open');
  });

  // Çıkış butonu
  document.getElementById('navSignOutBtn')?.addEventListener('click', signOutUser);

  // Profil, Ayarlar, Destek Modal Butonları
  document.getElementById('navProfileBtn')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.remove('open');
    openProfileModal();
  });
  document.getElementById('navSettingsBtn')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.remove('open');
    openSettingsModal();
  });
  document.getElementById('navSupportBtn')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.remove('open');
    openSupportModal();
  });

  // Profil → Ayarlara Git butonu
  document.getElementById('profileEditBtn')?.addEventListener('click', () => {
    closeAllModals();
    setTimeout(openSettingsModal, 150);
  });

  // Hesap Ayarları Form Submit
  document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  // Hesap Sil Butonu
  document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);

  // SSS Accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Kademe → Sınıf Dinamik Bağlantısı (Kayıt Formu)
  document.getElementById('regLevel')?.addEventListener('change', (e) => {
    populateGradeDropdown(document.getElementById('regGrade'), e.target.value);
  });

  // Kademe → Sınıf Dinamik Bağlantısı (Ayarlar)
  document.getElementById('settingsLevel')?.addEventListener('change', (e) => {
    populateGradeDropdown(document.getElementById('settingsGrade'), e.target.value);
  });

  // ── Görünüm Ayarları (index) ─────────────────────────────────────────────
  // Tema
  document.getElementById('indexSettingsTheme')?.addEventListener('change', (e) => {
    const mode = e.target.value;
    localStorage.setItem('bearly_theme', mode);
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark-mode', prefersDark);
    } else {
      document.body.classList.toggle('dark-mode', mode === 'dark');
    }
    // Navbar theme toggle güncelle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      const isDark = document.body.classList.contains('dark-mode');
      const sunIcon = '<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      const moonIcon = '<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      themeBtn.innerHTML = isDark ? sunIcon : moonIcon;
    }
  });

  // Yazı boyutu
  document.getElementById('indexSettingsFontSize')?.addEventListener('change', (e) => {
    document.body.dataset.fontSize = e.target.value;
    localStorage.setItem('bearly_font_size', e.target.value);
  });

  // Vurgu rengi
  document.querySelectorAll('.idx-accent-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.idx-accent-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const accent = swatch.dataset.accent;
      const colorMap = { blue:'#0071E3', purple:'#6C63FF', green:'#34C759', orange:'#FF9500', pink:'#FF2D55', teal:'#5AC8FA' };
      document.documentElement.style.setProperty('--primary', colorMap[accent] || colorMap.blue);
      localStorage.setItem('bearly_accent', accent);
    });
  });

  // Konuşma tonu
  document.getElementById('indexSettingsTone')?.addEventListener('change', (e) => {
    localStorage.setItem('bearly_tone', e.target.value);
  });

  // Emoji
  document.getElementById('indexSettingsEmoji')?.addEventListener('change', (e) => {
    localStorage.setItem('bearly_emoji', e.target.value);
  });

  // Özel talimatlar
  document.getElementById('indexCustomInstructions')?.addEventListener('input', (e) => {
    localStorage.setItem('bearly_custom_instructions', e.target.value);
  });

  // Modal kapatma
  document.querySelectorAll('.auth-modal-overlay, .auth-modal-close').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) closeAllModals();
    });
  });

  // Navbar butonları
  document.getElementById('navLoginBtn')?.addEventListener('click', openLoginModal);
  document.getElementById('navRegisterBtn')?.addEventListener('click', openRegisterModal);

  // Switch linkler
  document.getElementById('switchToRegister')?.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); });
  document.getElementById('switchToLogin')?.addEventListener('click',    (e) => { e.preventDefault(); switchToLogin(); });

  // Google / Apple butonları
  document.querySelectorAll('[data-auth="google"]').forEach(btn => btn.addEventListener('click', signInWithGoogle));
  document.querySelectorAll('[data-auth="apple"]').forEach(btn  => btn.addEventListener('click', signInWithApple));

  // ESC ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Şifre güç göstergesi
  document.getElementById('regPassword')?.addEventListener('input', updatePasswordStrength);

  // Şifreyi göster/gizle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/></svg>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>';
      }
    });
  });
}

// ─── Şifre Güç Göstergesi ────────────────────────────────────────────────────
function updatePasswordStrength() {
  const pw  = document.getElementById('regPassword').value;
  const bar = document.getElementById('passwordStrengthBar');
  const lbl = document.getElementById('passwordStrengthLabel');
  if (!bar || !lbl) return;

  let score = 0;
  if (pw.length >= 8)            score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: '',           color: '#444',    width: '0%' },
    { label: 'Zayıf',     color: '#ef4444', width: '25%' },
    { label: 'Orta',      color: '#f59e0b', width: '50%' },
    { label: 'İyi',       color: '#10b981', width: '75%' },
    { label: 'Güçlü', color: '#0071E3', width: '100%' },
  ];
  const lvl = levels[score] || levels[0];
  bar.style.width           = lvl.width;
  bar.style.backgroundColor = lvl.color;
  lbl.textContent           = lvl.label;
  lbl.style.color           = lvl.color;
}

// ─── Error / Loading Helpers ─────────────────────────────────────────────────
function showLoginError(msg, isSuccess = false) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = msg;
  el.className = 'auth-error-box ' + (isSuccess ? 'success' : 'error');
  el.style.display = 'block';
}

function showRegisterError(msg) {
  const el = document.getElementById('registerError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearModalErrors() {
  document.querySelectorAll('.auth-error-box').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
}

function showAuthError(msg) {
  // Giriş modalı açıksa oraya, yoksa kayıt modalına yaz
  if (document.getElementById('loginModal')?.classList.contains('active')) {
    showLoginError(msg);
  } else {
    showRegisterError(msg);
  }
}

function setAuthLoading(loading, type) {
  const map = {
    'google':       ['googleLoginBtn', 'googleRegisterBtn'],
    'apple':        ['appleLoginBtn',  'appleRegisterBtn'],
    'email-login':  ['emailLoginSubmit'],
    'register':     ['emailRegisterSubmit'],
    'settings':     ['settingsSaveBtn'],
  };
  (map[type] || []).forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.orig = btn.innerHTML;
      btn.innerHTML = '<span class="auth-spinner"></span>';
    } else if (btn.dataset.orig) {
      btn.innerHTML = btn.dataset.orig;
      delete btn.dataset.orig;
    }
  });
}

function showSuccessToast(msg) {
  let toast = document.getElementById('authToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'authToast';
    toast.className = 'auth-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Firebase Kurulum Uyarısı ────────────────────────────────────────────────
function showFirebaseSetupBanner() {
  const existing = document.getElementById('firebaseSetupBanner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'firebaseSetupBanner';
  banner.className = 'firebase-setup-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style="flex-shrink:0;">
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>
      ⚙️ <strong>Firebase kurulumu gerekli!</strong> 
      <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a>'dan ücretsiz proje oluşturun, 
      ardından <code>auth.js</code> içindeki <code>firebaseConfig</code>'i güncelleyin.
    </span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.2rem;line-height:1;padding:0 4px;">×</button>
  `;
  document.body.prepend(banner);
}

function showSetupAlert() {
  showSuccessToast('⚙️ auth.js içindeki Firebase config\'i doldurun!');
}

// ─── Hata Mesajları (Türkçe) ─────────────────────────────────────────────────
function getAuthErrorMsg(error) {
  const map = {
    'auth/user-not-found':        'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.',
    'auth/wrong-password':        'Şifreniz hatalı. Lütfen tekrar deneyin.',
    'auth/email-already-in-use':  'Bu e-posta zaten kullanımda. Giriş yapmayı deneyin.',
    'auth/weak-password':         'Şifre çok zayıf. En az 8 karakter kullanın.',
    'auth/invalid-email':         'Geçersiz e-posta adresi.',
    'auth/too-many-requests':     'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.',
    'auth/popup-closed-by-user':  'Giriş penceresi kapatıldı.',
    'auth/network-request-failed':'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.',
    'auth/cancelled-popup-request': 'İşlem iptal edildi.',
    'auth/invalid-credential':    'E-posta veya şifre hatalı.',
  };
  return map[error.code] || error.message || 'Beklenmeyen bir hata oluştu.';
}

// ─── Kademe → Sınıf Dinamik Dropdown ──────────────────────────────────────────
function populateGradeDropdown(selectEl, level) {
  if (!selectEl) return;
  const gradeMap = {
    'ilkokul':    [1, 2, 3, 4],
    'ortaokul':   [5, 6, 7, 8],
    'lise':       [9, 10, 11, 12],
    'universite': ['Hazırlık', 1, 2, 3, 4],
  };
  const grades = gradeMap[level] || [];
  selectEl.innerHTML = '';
  if (grades.length === 0) {
    selectEl.innerHTML = '<option value="">Önce kademe seçin</option>';
    return;
  }
  selectEl.innerHTML = '<option value="">Sınıf seçin</option>';
  grades.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = typeof g === 'number' ? `${g}. Sınıf` : g;
    selectEl.appendChild(opt);
  });
}

// ─── Profil Modalı ────────────────────────────────────────────────────────────
async function openProfileModal() {
  const user = auth?.currentUser;
  if (!user) { showSuccessToast('Önce giriş yapmalısınız.'); return; }

  const levelMap = { 'ilkokul': 'İlkokul', 'ortaokul': 'Ortaokul', 'lise': 'Lise', 'universite': 'Üniversite' };
  const trackMap = { 'mixed': 'Karışık', 'sayisal': 'Sayısal', 'esit_agirlik': 'Eşit Ağırlık', 'sozel': 'Sözel', 'dil': 'Dil', 'tyt': 'Sadece TYT' };
  const providerMap = { 'email': 'E-posta', 'google': 'Google', 'apple': 'Apple' };

  const name = user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
  const initial = name.charAt(0).toUpperCase();

  document.getElementById('profileDisplayName').textContent = name;
  document.getElementById('profileEmail').textContent = user.email || '';
  document.getElementById('profileInitialLarge').textContent = initial;

  // Firestore'dan veri çek
  if (db) {
    try {
      const snap = await db.collection('users').doc(user.uid).get();
      if (snap.exists) {
        const d = snap.data();
        document.getElementById('profileLevel').textContent = levelMap[d.level] || d.level || '—';
        document.getElementById('profileGrade').textContent = d.grade ? (typeof d.grade === 'number' || !isNaN(d.grade) ? d.grade + '. Sınıf' : d.grade) : '—';
        document.getElementById('profileTrack').textContent = trackMap[d.track] || d.track || '—';
        document.getElementById('profileProvider').textContent = providerMap[d.provider] || d.provider || '—';

        if (d.createdAt?.toDate) {
          document.getElementById('profileCreatedAt').textContent = d.createdAt.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        if (d.lastLogin?.toDate) {
          document.getElementById('profileLastLogin').textContent = d.lastLogin.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch(e) {
      console.error('Profil verisi yüklenemedi:', e);
    }
  }

  // Profil fotoğrafını yükle
  loadProfilePhoto(user.uid);

  // Fotoğraf yükleme event
  const avatarEl = document.getElementById('profileAvatarLarge');
  const photoInput = document.getElementById('profilePhotoInput');
  if (avatarEl && photoInput) {
    avatarEl.onclick = () => photoInput.click();
    photoInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showSuccessToast('Fotoğraf 2 MB\'dan küçük olmalı.');
        return;
      }
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        // Firestore'a kaydet
        await db.collection('users').doc(user.uid).update({ profilePhoto: base64 });
        // Avatarı güncelle
        showProfilePhotoInAvatar(base64);
        showSuccessToast('Profil fotoğrafı güncellendi.');
        // Navbar avatarını güncelle
        updateNavbarPhoto(base64);
      } catch(err) {
        console.error('Fotoğraf yükleme hatası:', err);
        showSuccessToast('Fotoğraf yüklenirken hata oluştu.');
      }
      photoInput.value = '';
    };
  }

  document.getElementById('profileModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function loadProfilePhoto(uid) {
  if (!db) return;
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists && snap.data().profilePhoto) {
      showProfilePhotoInAvatar(snap.data().profilePhoto);
    }
  } catch(e) { /* ignore */ }
}

function showProfilePhotoInAvatar(dataUrl) {
  const container = document.getElementById('profileAvatarLarge');
  if (!container) return;
  const initialSpan = document.getElementById('profileInitialLarge');
  if (initialSpan) initialSpan.style.display = 'none';
  // Remove existing img if any
  const existing = container.querySelector('img');
  if (existing) existing.remove();
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Profil';
  container.insertBefore(img, container.firstChild);
}

function updateNavbarPhoto(dataUrl) {
  // Ana avatar butonu
  const avatarBtn = document.getElementById('navUserAvatarBtn');
  if (avatarBtn) {
    const initial = document.getElementById('navUserInitial');
    const photo = document.getElementById('navUserPhoto');
    if (initial) initial.style.display = 'none';
    if (photo) photo.style.display = 'none';
    const existing = avatarBtn.querySelector('.nav-profile-img');
    if (existing) existing.remove();
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Profil';
    img.className = 'nav-profile-img';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
    avatarBtn.style.position = 'relative';
    avatarBtn.appendChild(img);
  }
  // Dropdown header avatar
  const dropAvatar = document.querySelector('.user-dropdown-avatar');
  const initial2 = document.getElementById('navUserInitial2');
  if (dropAvatar && initial2) {
    initial2.style.display = 'none';
    const existing2 = dropAvatar.querySelector('.nav-profile-img');
    if (existing2) existing2.remove();
    const img2 = document.createElement('img');
    img2.src = dataUrl;
    img2.alt = 'Profil';
    img2.className = 'nav-profile-img';
    img2.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
    dropAvatar.style.position = 'relative';
    dropAvatar.appendChild(img2);
  }
}

// ─── Hesap Ayarları Modalı ────────────────────────────────────────────────────
async function openSettingsModal() {
  const user = auth?.currentUser;
  if (!user) { showSuccessToast('Önce giriş yapmalısınız.'); return; }

  // Mevcut verileri formun alanlarına doldur
  document.getElementById('settingsName').value = user.displayName || '';

  // Hata/başarı kutularını temizle
  const errEl = document.getElementById('settingsError');
  const sucEl = document.getElementById('settingsSuccess');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  if (sucEl) { sucEl.style.display = 'none'; sucEl.textContent = ''; }

  // Şifre alanlarını temizle
  const cpw = document.getElementById('settingsCurrentPassword');
  const pw1 = document.getElementById('settingsNewPassword');
  const pw2 = document.getElementById('settingsNewPassword2');
  if (cpw) cpw.value = '';
  if (pw1) pw1.value = '';
  if (pw2) pw2.value = '';

  // Görünüm ayarlarını localStorage'dan yükle
  const themeEl = document.getElementById('indexSettingsTheme');
  if (themeEl) themeEl.value = localStorage.getItem('bearly_theme') || 'light';

  const fontEl = document.getElementById('indexSettingsFontSize');
  if (fontEl) fontEl.value = localStorage.getItem('bearly_font_size') || 'normal';

  // Vurgu rengi
  const savedAccent = localStorage.getItem('bearly_accent') || 'blue';
  document.querySelectorAll('.idx-accent-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.accent === savedAccent);
  });

  // Kişiselleştirme
  const toneEl = document.getElementById('indexSettingsTone');
  if (toneEl) toneEl.value = localStorage.getItem('bearly_tone') || 'default';

  const emojiEl = document.getElementById('indexSettingsEmoji');
  if (emojiEl) emojiEl.value = localStorage.getItem('bearly_emoji') || 'default';

  const instrEl = document.getElementById('indexCustomInstructions');
  if (instrEl) instrEl.value = localStorage.getItem('bearly_custom_instructions') || '';

  if (db) {
    try {
      const snap = await db.collection('users').doc(user.uid).get();
      if (snap.exists) {
        const d = snap.data();
        const lvlEl = document.getElementById('settingsLevel');
        const gradeEl = document.getElementById('settingsGrade');
        const trackEl = document.getElementById('settingsTrack');
        if (lvlEl) lvlEl.value = d.level || '';
        if (d.level && gradeEl) {
          populateGradeDropdown(gradeEl, d.level);
          gradeEl.value = d.grade || '';
        }
        if (trackEl) trackEl.value = d.track || 'mixed';
      }
    } catch(e) {
      console.error('Ayar verisi yüklenemedi:', e);
    }
  }

  document.getElementById('settingsModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ─── Ayarları Kaydet ──────────────────────────────────────────────────────────
async function saveSettings() {
  const user = auth?.currentUser;
  if (!user || !db) return;

  const errEl = document.getElementById('settingsError');
  const sucEl = document.getElementById('settingsSuccess');
  if (errEl) { errEl.style.display = 'none'; }
  if (sucEl) { sucEl.style.display = 'none'; }

  const name = document.getElementById('settingsName')?.value.trim();
  const level = document.getElementById('settingsLevel')?.value || '';
  const grade = document.getElementById('settingsGrade')?.value || '';
  const track = document.getElementById('settingsTrack')?.value || 'mixed';
  const currentPw = document.getElementById('settingsCurrentPassword')?.value || '';
  const newPw = document.getElementById('settingsNewPassword')?.value || '';
  const newPw2 = document.getElementById('settingsNewPassword2')?.value || '';

  // Validasyon
  if (!name) {
    showSettingsError('Ad Soyad boş olamaz.');
    return;
  }
  if (newPw && !currentPw) {
    showSettingsError('Şifre değiştirmek için mevcut şifrenizi girin.');
    return;
  }
  if (newPw && newPw.length < 8) {
    showSettingsError('Yeni şifre en az 8 karakter olmalıdır.');
    return;
  }
  if (newPw && newPw !== newPw2) {
    showSettingsError('Yeni şifreler eşleşmiyor.');
    return;
  }

  setAuthLoading(true, 'settings');

  try {
    // Şifre değiştirilecekse önce mevcut şifreyle doğrula
    if (newPw && currentPw) {
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPw);
      await user.reauthenticateWithCredential(credential);
    }

    // Profil güncelle
    if (name !== user.displayName) {
      await user.updateProfile({ displayName: name });
    }

    // Firestore güncelle
    await db.collection('users').doc(user.uid).update({
      displayName: name,
      level,
      grade,
      track,
    });

    // Şifre değiştir
    if (newPw) {
      await user.updatePassword(newPw);
      document.getElementById('settingsCurrentPassword').value = '';
      document.getElementById('settingsNewPassword').value = '';
      document.getElementById('settingsNewPassword2').value = '';
    }

    showSettingsSuccess('Değişiklikler başarıyla kaydedildi.');

    // Navbar'ı güncelle
    showUserInNavbar(user);

  } catch(e) {
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      showSettingsError('Mevcut şifreniz hatalı.');
    } else if (e.code === 'auth/requires-recent-login') {
      showSettingsError('Oturumunuz çok eski. Lütfen çıkış yapıp tekrar giriş yapın.');
    } else {
      showSettingsError(e.message || 'Bilinmeyen bir hata oluştu.');
    }
  } finally {
    setAuthLoading(false, 'settings');
  }
}

function showSettingsError(msg) {
  const el = document.getElementById('settingsError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function showSettingsSuccess(msg) {
  const el = document.getElementById('settingsSuccess');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── Hesap Sil ────────────────────────────────────────────────────────────────
async function deleteAccount() {
  const user = auth?.currentUser;
  if (!user) return;

  const confirmed = confirm('⚠️ Hesabınızı silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.');
  if (!confirmed) return;

  const doubleConfirm = prompt('Onaylamak için "SİL" yazın:');
  if (doubleConfirm !== 'SİL') {
    showSuccessToast('Hesap silme iptal edildi.');
    return;
  }

  try {
    // Firestore verisini sil
    if (db) {
      await db.collection('users').doc(user.uid).delete();
    }
    // Hesabı sil
    await user.delete();
    closeAllModals();
    showSuccessToast('Hesabınız başarıyla silindi. Hoşça kalın! 👋');
  } catch(e) {
    if (e.code === 'auth/requires-recent-login') {
      showSettingsError('Hesap silmek için tekrar giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.');
    } else {
      showSettingsError(e.message || 'Hesap silinemedi.');
    }
  }
}

// ─── Destek Modalı ────────────────────────────────────────────────────────────
function openSupportModal() {
  document.getElementById('supportModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  setupAuthForms();
});
