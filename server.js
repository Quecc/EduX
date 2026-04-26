const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const rag = require('./rag');

loadEnvFile();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = __dirname;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ─── Güvenlik: Rate Limiting ──────────────────────────────────────────────────
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX = 20;           // dakikada max istek
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Her 5 dakikada eski kayıtları temizle
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// ─── Güvenlik: Body Boyut Limiti ──────────────────────────────────────────────
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

// ─── Güvenlik: Yasaklı dosya/dizin listesi ────────────────────────────────────
const BLOCKED_PATHS = ['.env', '.git', 'node_modules', '.gitignore', 'package-lock.json', '.venv', '__pycache__', 'process_pdf.py', 'build-embeddings.js', 'rag.js', 'server.js'];

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ─── Güvenlik Başlıkları ──────────────────────────────────────────────────────
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.gstatic.com https://*.googleapis.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com; " +
    "frame-src https://*.firebaseapp.com;"
  );
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let totalSize = 0;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_SIZE) {
      throw new Error('BODY_TOO_LARGE');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function getSafeFilePath(requestPathname) {
  const normalizedPath = decodeURIComponent(requestPathname === '/' ? '/index.html' : requestPathname);
  const candidatePath = path.normalize(path.join(ROOT_DIR, normalizedPath));

  // Path traversal koruması
  if (!candidatePath.startsWith(ROOT_DIR)) {
    return null;
  }

  // Yasaklı dosya/dizin koruması
  const relativePath = path.relative(ROOT_DIR, candidatePath);
  const relLower = relativePath.toLowerCase();
  for (const blocked of BLOCKED_PATHS) {
    const bLower = blocked.toLowerCase();
    if (relLower === bLower || relLower.startsWith(bLower + path.sep) || relLower.startsWith(bLower + '/')) {
      return null;
    }
  }

  // Gizli dosya koruması (. ile başlayan)
  const parts = relativePath.split(path.sep);
  if (parts.some(p => p.startsWith('.') && p !== '.')) {
    return null;
  }

  return candidatePath;
}

function serveStaticFile(req, res, pathname) {
  const filePath = getSafeFilePath(pathname);
  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      sendText(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=300',
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

async function handleGeminiGenerate(req, res) {
  if (!GEMINI_API_KEY) {
    sendJson(res, 503, {
      error: {
        code: 'MISSING_SERVER_API_KEY',
        message: 'Sunucuda GEMINI_API_KEY tanimli degil.',
      },
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    if (error.message === 'BODY_TOO_LARGE') {
      sendJson(res, 413, { error: { code: 'BODY_TOO_LARGE', message: 'İstek boyutu çok büyük (max 5 MB).' } });
      return;
    }
    sendJson(res, 400, {
      error: {
        code: 'INVALID_JSON',
        message: 'Gecersiz JSON gonderildi.',
      },
    });
    return;
  }

  const payload = body?.payload;
  const requestedModels = Array.isArray(body?.models) ? body.models.filter(Boolean) : [];
  const models = requestedModels.length > 0
    ? requestedModels
    : ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash'];

  // RAG parametreleri (opsiyonel)
  const ragSubject = body?.subject || null;
  const ragSinif = body?.sinif || null;

  if (!payload || typeof payload !== 'object') {
    sendJson(res, 400, {
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'payload alani zorunludur.',
      },
    });
    return;
  }

  // ── RAG: Kullanıcı sorusunu bul ve ilgili ders kitabı bölümlerini ekle ──
  if (rag.isReady()) {
    try {
      const contents = payload.contents || [];
      const lastUserMsg = [...contents].reverse().find(c => c.role === 'user');
      const queryText = lastUserMsg?.parts?.map(p => p.text).filter(Boolean).join(' ') || '';

      if (queryText.length > 5) {
        const ragResults = await rag.searchByText(queryText, GEMINI_API_KEY, {
          topK: 3,
          ders: ragSubject,
          sinif: ragSinif,
        });

        if (ragResults.length > 0) {
          const ragContext = rag.buildRAGContext(ragResults);

          if (payload.systemInstruction?.parts?.length > 0) {
            payload.systemInstruction.parts[0].text += ragContext;
          } else if (payload.systemInstruction) {
            payload.systemInstruction.parts = [{ text: ragContext }];
          } else {
            payload.systemInstruction = { parts: [{ text: ragContext }] };
          }

          console.log(`📖 RAG: "${queryText.slice(0, 50)}..." → ${ragResults.length} sonuç eklendi`);
        }
      }
    } catch (ragErr) {
      console.error('⚠️  RAG arama hatası (devam ediliyor):', ragErr.message);
    }
  }

  let upstreamResponse;
  let upstreamText = '';

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    try {
      upstreamResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      sendJson(res, 502, {
        error: {
          code: 'UPSTREAM_NETWORK_ERROR',
          message: error.message,
        },
      });
      return;
    }

    upstreamText = await upstreamResponse.text();
    if (upstreamResponse.status !== 404) {
      break;
    }
  }

  let data;
  try {
    data = upstreamText ? JSON.parse(upstreamText) : {};
  } catch {
    data = { raw: upstreamText };
  }

  if (!upstreamResponse.ok) {
    sendJson(res, upstreamResponse.status, data);
    return;
  }

  sendJson(res, 200, data);
}

// ─── Ana Sunucu ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // Güvenlik başlıklarını her yanıta ekle
  setSecurityHeaders(res);

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const requestUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  // API endpoint — Rate limiting uygula
  if (req.method === 'POST' && requestUrl.pathname === '/api/ai/generate') {
    if (!checkRateLimit(clientIp)) {
      sendJson(res, 429, { error: { code: 'RATE_LIMIT', message: 'Çok fazla istek. Lütfen 1 dakika bekleyin.' } });
      return;
    }
    await handleGeminiGenerate(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  serveStaticFile(req, res, requestUrl.pathname);
});

server.listen(PORT, HOST, async () => {
  console.log(`Bearly server running at http://localhost:${PORT}`);
  console.log('🔒 Güvenlik: Rate limiting, security headers, path protection aktif');

  // RAG index'ini arka planda oluştur
  if (GEMINI_API_KEY) {
    console.log('📚 RAG index yükleniyor...');
    try {
      await rag.buildIndex(GEMINI_API_KEY);
      const stats = rag.getStats();
      console.log(`✅ RAG hazır: ${stats.totalChunks} chunk indekslendi`);
      for (const [key, count] of Object.entries(stats.dersler)) {
        console.log(`   ${key}: ${count} chunk`);
      }
    } catch (e) {
      console.error('⚠️  RAG başlatma hatası:', e.message);
    }
  }
});
