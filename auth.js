/* =============================================
   EduAI - Firebase Authentication
   Giriş / Kayıt / Google / Apple
   =============================================
   ⚠️  KURULUM: Firebase config'ini aşağıya girin!
   console.firebase.google.com → Proje Ayarları → Web App
   ============================================= */

const firebaseConfig = {
  apiKey:            "AIzaSyDv-_cjC6Ls5WpN-t3dOL0NrgcQnb14img",
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
    showSuccessToast(`Hoş geldin, ${result.user.displayName?.split(' ')[0] || ''}! 🎉`);
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
    showSuccessToast(`Hoş geldin! 🎉`);
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
    showSuccessToast(`Tekrar hoş geldin! 👋`);
  } catch (e) {
    showLoginError(getAuthErrorMsg(e));
  } finally {
    setAuthLoading(false, 'email-login');
  }
}

// ─── Kayıt Ol ────────────────────────────────────────────────────────────────
async function registerWithEmail(data) {
  if (!firebaseReady) { showSetupAlert(); return; }
  const { fullName, email, password, level, birthYear } = data;
  setAuthLoading(true, 'register');
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: fullName });
    await saveUserToFirestore(result.user, {
      provider: 'email',
      displayName: fullName,
      level: level || '',
      birthYear: birthYear || '',
    });
    closeAllModals();
    showSuccessToast(`Hoş geldin, ${fullName.split(' ')[0]}! Hesabın oluşturuldu 🎉`);
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
        const levelMap = { 'ilkokul': 'İlkokul (1-4. Sınıf)', 'ortaokul': 'Ortaokul (5-8. Sınıf)', 'lise': 'Lise (9-12. Sınıf)', 'universite': 'Üniversite' };
        userClass.textContent = levelMap[data.level] || data.level || user.email;
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

  authButtons.style.display = 'none';
  userProfile.style.display = 'flex';

  // --- Hero Section Updates (Giriş Yapıldı) ---
  const welcomeText = document.getElementById('heroWelcomeText');
  if (welcomeText) {
    welcomeText.textContent = `Hoş geldin, ${name} 👋`;
    welcomeText.style.display = 'block';
  }

  const heroStartBtn = document.getElementById('heroStartBtn');
  if (heroStartBtn) {
    heroStartBtn.innerHTML = '<img src="2.png" style="height:24px; filter:brightness(0) invert(1);" alt="EduX" />';
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
          <span>Hemen Başla</span>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
    `;
  }

  const heroSecondaryBtn = document.getElementById('heroSecondaryBtn');
  const heroSecondaryText = document.getElementById('heroSecondaryText');
  if (heroSecondaryBtn && heroSecondaryText) {
    heroSecondaryText.textContent = 'Nasıl Çalışır';
    heroSecondaryBtn.href = '#how-it-works';
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
    const birthYear = document.getElementById('regBirthYear').value;

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
    await registerWithEmail({ fullName, email, password, level, birthYear });
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

  // Ayar Butonları (Yapım Aşaması Bildirimi)
  ['navProfileBtn', 'navSettingsBtn', 'navSupportBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      showSuccessToast('Bu sayfa yakında eklenecektir! 🚀');
    });
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
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
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
    { label: 'Güçlü 💪', color: '#6C63FF', width: '100%' },
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

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  setupAuthForms();
});
