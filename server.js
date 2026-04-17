const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

loadEnvFile();

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = __dirname;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function getSafeFilePath(requestPathname) {
  const normalizedPath = decodeURIComponent(requestPathname === '/' ? '/index.html' : requestPathname);
  const candidatePath = path.normalize(path.join(ROOT_DIR, normalizedPath));

  if (!candidatePath.startsWith(ROOT_DIR)) {
    return null;
  }

  if (path.basename(candidatePath).startsWith('.env')) {
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

  if (!payload || typeof payload !== 'object') {
    sendJson(res, 400, {
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'payload alani zorunludur.',
      },
    });
    return;
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

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  if (req.method === 'POST' && requestUrl.pathname === '/api/ai/generate') {
    await handleGeminiGenerate(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  serveStaticFile(req, res, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`BearEdu server running at http://localhost:${PORT}`);
});
