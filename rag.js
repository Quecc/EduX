/* 
   Bearly RAG — Retrieval-Augmented Generation
   Vektör embedding tabanlı ders kitabı arama modülü
  */

const fs = require('fs');
const path = require('path');

// ── Yapılandırma 
const DATA_DIR = path.join(__dirname, 'data');
const CACHE_PATH = path.join(DATA_DIR, 'embeddings-cache.json');
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIM = 768;
const CHUNK_MAX_WORDS = 400;    // Her chunk'taki max kelime sayısı
const CHUNK_OVERLAP_WORDS = 60; // Chunk'lar arası kelime örtüşmesi

// ── State 
let chunks = [];       // { id, text, ders, sinif, bolum, konu, sayfa }[]
let embeddings = [];   // Float64Array[] — her biri EMBED_DIM boyutunda
let indexReady = false;

// ── Metin Chunk'lama 


function splitIntoChunks(text, maxWords = CHUNK_MAX_WORDS, overlapWords = CHUNK_OVERLAP_WORDS) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= maxWords) return [text.trim()];

  const result = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    result.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start += maxWords - overlapWords;
  }
  return result;
}



function loadAndChunkData() {


  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== "embeddings-cache.json");
  chunks = [];
  let totalTopics = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      if (!data.konular || !Array.isArray(data.konular)) continue;

      const ders = (data.ders || '').toLowerCase();
      const sinif = data.sinif || 0;

      for (const konu of data.konular) {
        const icerik = (konu.icerik || '').trim();
        if (!icerik || icerik.length < 50) continue; // Çok kısa içerikleri atla

        totalTopics++;
        const subChunks = splitIntoChunks(icerik);

        for (let ci = 0; ci < subChunks.length; ci++) {
          const chunkText = subChunks[ci];
          // Arama sırasında meta bilgi de embed edilsin diye başlığı ekle
          const enrichedText = `${data.ders} ${sinif}. Sınıf - ${konu.bolum || ''} > ${konu.konu || ''}\n${chunkText}`;

          chunks.push({
            id: `${ders}-${sinif}-${totalTopics}-${ci}`,
            text: enrichedText,
            rawText: chunkText,
            ders,
            sinif,
            bolum: konu.bolum || '',
            konu: konu.konu || '',
            sayfa: konu.sayfa || 0,
            source: file,
          });
        }
      }
    } catch (e) {
      console.warn(`  RAG: ${file} okunamadı:`, e.message);
    }
  }

  console.log(` RAG: ${files.length} dosyadan ${totalTopics} konu, ${chunks.length} chunk yüklendi.`);
  return chunks;
}


async function getEmbedding(text, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.embedding?.values || [];
}


async function getQueryEmbedding(text, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Query embedding error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.embedding?.values || [];
}

/**
 * Birden fazla metin için batch embedding hesapla.
 * Rate limit'e takılmamak için gruplar halinde gönderir.
 */
async function batchEmbed(texts, apiKey, batchSize = 10, delayMs = 200) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const requests = batch.map(text => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    }));

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });

      if (!res.ok) {
        // Rate limit durumunda bekle ve tekrar dene
        if (res.status === 429) {
          console.log(`⏳ Rate limit, 60 saniye bekleniyor... (${i}/${texts.length})`);
          await sleep(60000);
          i -= batchSize; // Tekrar dene
          continue;
        }
        const err = await res.text();
        throw new Error(`Batch embed error (${res.status}): ${err}`);
      }

      const data = await res.json();
      const batchEmbeddings = (data.embeddings || []).map(e => e.values || []);
      allEmbeddings.push(...batchEmbeddings);

      const progress = Math.min(i + batchSize, texts.length);
      if (progress % 50 === 0 || progress >= texts.length) {
        console.log(`   🔄 Embedding: ${progress}/${texts.length}`);
      }
    } catch (e) {
      console.error(`❌ Batch embed hatası (${i}-${i + batchSize}):`, e.message);
      // Hatalı batch için boş embedding ekle
      for (let j = 0; j < batch.length; j++) {
        allEmbeddings.push(new Array(EMBED_DIM).fill(0));
      }
    }

    if (i + batchSize < texts.length) {
      await sleep(delayMs);
    }
  }

  return allEmbeddings;
}

// ── Cosine Similarity ───────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Arama ───────────────────────────────────────────────────────────────────

/**
 * Vektör veritabanında arama yap.
 * @param {number[]} queryEmbedding - Sorgu vektörü
 * @param {object} options - { topK, ders, sinif }
 * @returns {{ chunk, score }[]}
 */
function search(queryEmbedding, options = {}) {
  const { topK = 3, ders = null, sinif = null } = options;

  if (!indexReady || chunks.length === 0) return [];

  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Filtreler
    if (ders && chunk.ders !== ders.toLowerCase()) continue;
    if (sinif && chunk.sinif !== Number(sinif)) continue;

    const score = cosineSimilarity(queryEmbedding, embeddings[i]);
    results.push({ chunk, score });
  }

  // En yüksek skora göre sırala
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Metin tabanlı arama — embedding hesapla ve sonuçları döndür.
 */
async function searchByText(query, apiKey, options = {}) {
  if (!indexReady) return [];

  try {
    const queryEmb = await getQueryEmbedding(query, apiKey);
    return search(queryEmb, options);
  } catch (e) {
    console.error('RAG arama hatası:', e.message);
    return [];
  }
}

// ── Cache Yönetimi ──────────────────────────────────────────────────────────

function saveCache() {
  const cacheData = {
    version: 2,
    model: EMBED_MODEL,
    chunkCount: chunks.length,
    chunkIds: chunks.map(c => c.id),
    embeddings: embeddings,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData), 'utf8');
  const sizeMB = (fs.statSync(CACHE_PATH).size / (1024 * 1024)).toFixed(1);
  console.log(`💾 RAG: Embedding cache kaydedildi (${sizeMB} MB, ${chunks.length} chunk)`);
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return false;

  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const cache = JSON.parse(raw);

    if (cache.version !== 2 || cache.model !== EMBED_MODEL) {
      console.log('⚠️  RAG: Cache versiyonu uyumsuz, yeniden oluşturulacak.');
      return false;
    }

    // Chunk ID'lerini karşılaştır
    const currentIds = chunks.map(c => c.id);
    if (JSON.stringify(cache.chunkIds) !== JSON.stringify(currentIds)) {
      console.log('⚠️  RAG: Chunklar değişmiş, cache yeniden oluşturulacak.');
      return false;
    }

    embeddings = cache.embeddings;
    console.log(`✅ RAG: Cache'den ${embeddings.length} embedding yüklendi.`);
    return true;
  } catch (e) {
    console.warn('⚠️  RAG: Cache okunamadı:', e.message);
    return false;
  }
}

// ── Index Oluşturma ─────────────────────────────────────────────────────────

/**
 * RAG index'ini oluştur veya cache'den yükle.
 * @param {string} apiKey - Gemini API key
 */
async function buildIndex(apiKey) {
  // 1. Chunk'ları yükle
  loadAndChunkData();

  if (chunks.length === 0) {
    console.log('⚠️  RAG: Hiç chunk bulunamadı. data/ klasörünü kontrol edin.');
    return;
  }

  // 2. Cache'den yüklemeyi dene
  if (loadCache()) {
    indexReady = true;
    return;
  }

  // 3. Embedding hesapla
  if (!apiKey) {
    console.log('⚠️  RAG: API key yok, embedding hesaplanamıyor. build-embeddings.js çalıştırın.');
    return;
  }

  console.log(`🧠 RAG: ${chunks.length} chunk için embedding hesaplanıyor...`);
  const texts = chunks.map(c => c.text);
  embeddings = await batchEmbed(texts, apiKey);

  // 4. Cache'e kaydet
  saveCache();
  indexReady = true;
  console.log(`✅ RAG: Index hazır! ${chunks.length} chunk aranabilir durumda.`);
}

/**
 * RAG bağlamını oluştur — sorguyla en ilgili chunk'ları döndür.
 */
function buildRAGContext(results) {
  if (!results || results.length === 0) return '';

  let ctx = '\n\n---\n📖 **DERS KİTABINDAN İLGİLİ BÖLÜMLER (MEB — Vektör Arama):**\n';

  for (const { chunk, score } of results) {
    const dersCapitalized = chunk.ders.charAt(0).toUpperCase() + chunk.ders.slice(1);
    ctx += `\n**${dersCapitalized} ${chunk.sinif}. Sınıf — ${chunk.bolum} > ${chunk.konu} (benzerlik: ${(score * 100).toFixed(0)}%):**\n`;
    // İçeriği max 1000 karakter ile kısıtla
    const excerpt = chunk.rawText.slice(0, 1000).replace(/\s+/g, ' ').trim();
    ctx += `${excerpt}\n`;
  }

  ctx += '---\n';
  return ctx;
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isReady() {
  return indexReady;
}

function getChunkCount() {
  return chunks.length;
}

function getStats() {
  const dersler = {};
  for (const c of chunks) {
    const key = `${c.ders}-${c.sinif}`;
    dersler[key] = (dersler[key] || 0) + 1;
  }
  return { totalChunks: chunks.length, indexReady, dersler };
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  loadAndChunkData,
  buildIndex,
  search,
  searchByText,
  getQueryEmbedding,
  getEmbedding,
  batchEmbed,
  buildRAGContext,
  saveCache,
  loadCache,
  isReady,
  getChunkCount,
  getStats,
  // Test/debug için
  chunks: () => chunks,
  embeddings: () => embeddings,
};
