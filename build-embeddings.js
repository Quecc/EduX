#!/usr/bin/env node
/* =============================================
   Bearly — Embedding Cache Oluşturucu
   Tüm ders kitabı chunk'ları için vektör embedding hesaplar
   ve data/embeddings-cache.json olarak kaydeder.
   
   Kullanım:
     node build-embeddings.js
   
   .env dosyasında GEMINI_API_KEY tanımlı olmalıdır.
   ============================================= */

const fs = require('fs');
const path = require('path');
const rag = require('./rag');

// ── .env dosyasını oku ──────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env dosyası bulunamadı! GEMINI_API_KEY tanımlayın.');
    process.exit(1);
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ── Ana İşlem ───────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Bearly — Embedding Cache Oluşturucu       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  loadEnv();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY tanımlı değil! .env dosyasını kontrol edin.');
    process.exit(1);
  }

  console.log('🔑 API Key: ...', apiKey.slice(-8));
  console.log('');

  // 1. Chunk'ları yükle
  console.log('📂 Ders kitabı verileri yükleniyor...');
  const chunks = rag.loadAndChunkData();

  if (chunks.length === 0) {
    console.error('❌ Hiç chunk bulunamadı! Önce process_pdf.py çalıştırın.');
    process.exit(1);
  }

  // İstatistikler
  const stats = rag.getStats();
  console.log('\n📊 Chunk İstatistikleri:');
  for (const [key, count] of Object.entries(stats.dersler)) {
    console.log(`   ${key}: ${count} chunk`);
  }
  console.log(`   TOPLAM: ${stats.totalChunks} chunk`);
  console.log('');

  // 2. Embedding hesapla
  console.log('🧠 Embedding hesaplama başlıyor...');
  console.log(`   Model: text-embedding-004 (768 boyut)`);
  console.log(`   Tahmini süre: ~${Math.ceil(chunks.length / 10 * 0.5)} saniye`);
  console.log('');

  const startTime = Date.now();

  await rag.buildIndex(apiKey);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log(`✅ Tamamlandı! (${elapsed} saniye)`);

  // Doğrulama
  const cacheStats = rag.getStats();
  console.log(`   İndekslenen chunk: ${cacheStats.totalChunks}`);
  console.log(`   Index hazır: ${cacheStats.indexReady ? 'Evet ✓' : 'Hayır ✗'}`);

  // Test araması
  console.log('\n🔍 Test araması yapılıyor...');
  const testQueries = [
    'üslü ifadeler ve özellikleri',
    'küre hacim formülü',
    'biyoloji hücre bölünmesi',
  ];

  for (const query of testQueries) {
    const results = await rag.searchByText(query, apiKey, { topK: 2 });
    console.log(`\n   Sorgu: "${query}"`);
    if (results.length === 0) {
      console.log('   ❌ Sonuç bulunamadı');
    } else {
      for (const { chunk, score } of results) {
        console.log(`   ✓ [${(score * 100).toFixed(1)}%] ${chunk.ders} ${chunk.sinif}.sınıf — ${chunk.konu}`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('✅ Embedding cache hazır! Sunucuyu başlatabilirsiniz:');
  console.log('   node server.js');
  console.log('════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Beklenmeyen hata:', err);
  process.exit(1);
});
