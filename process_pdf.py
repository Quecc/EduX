"""
EduX - MEB Ders Kitabı PDF İşleyici v2 (Surya + pdfplumber)
============================================================
Kullanım:
  python process_pdf.py                  → pdf-input/ klasörünün tamamını işle
  python process_pdf.py dosya.pdf        → tek dosya işle
"""

import sys, os, json, re, glob
from pathlib import Path

# ── Kütüphane Yükleme ──────────────────────────────────────────────────────────

def try_import(mod):
    try:
        return __import__(mod)
    except ImportError:
        return None

pdfplumber = try_import('pdfplumber')
surya_available = False

try:
    from PIL import Image as PILImage
    import pypdfium2 as pdfium
    from surya.recognition import RecognitionPredictor
    from surya.detection import DetectionPredictor
    surya_available = True
    print("✅ Surya OCR aktif (v0.17+)")
except ImportError as e:
    print(f"⚠️  Surya yüklenemedi, pdfplumber kullanılacak: {e}")
    surya_available = False

# ── Metin Temizleme ─────────────────────────────────────────────────────────────

def clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'[^\w\s\n.,;:!?%()\-+×÷=<>°²³αβγπσμλ/\\\'\"çşğüöıÇŞĞÜÖİ]', ' ', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

# ── Bölüm & Konu Tespiti ────────────────────────────────────────────────────────

BOLUM_PATTERNS = [
    r'(?:BÖLÜM|ÜNİTE|UNITE|BOLUM)\s*\d+[:\s.]+(.{3,60})',
    r'^\d+\.\s+(?:BÖLÜM|ÜNİTE)[:\s]+(.{3,60})',
    r'^(?:Bölüm|Ünite)\s+\d+[:\s]+(.{3,60})',
]

KONU_PATTERNS = [
    r'^\d+\.\d+\s+(.{3,60})$',
    r'^[A-ZÇŞĞÜÖİ][A-ZÇŞĞÜÖİ\s]{4,50}$',
    r'^(?:KONU|KAZANIM)[:\s]+(.{3,60})',
]

def detect_chapter(text):
    for line in text.split('\n')[:8]:
        line = line.strip()
        for p in BOLUM_PATTERNS:
            m = re.search(p, line, re.IGNORECASE)
            if m:
                return m.group(1).strip()[:80]
    return None

def detect_topic(text):
    for line in text.split('\n')[:5]:
        line = line.strip()
        for p in KONU_PATTERNS:
            m = re.match(p, line)
            if m:
                try:
                    return m.group(1).strip()[:80]
                except:
                    return line[:80]
    return None

# ── Dosya Adından Bilgi Çıkarma ─────────────────────────────────────────────────

DERS_MAP = {
    'matematik': 'Matematik', 'math': 'Matematik',
    'kimya': 'Kimya', 'fizik': 'Fizik',
    'biyoloji': 'Biyoloji', 'bio': 'Biyoloji',
    'turkce': 'Türkçe', 'türkçe': 'Türkçe',
    'tarih': 'Tarih', 'cografya': 'Coğrafya',
    'edebiyat': 'Edebiyat', 'ingilizce': 'İngilizce',
    'felsefe': 'Felsefe', 'geometri': 'Geometri',
    'mantik': 'Mantık', 'din': 'Din Kültürü',
}

def parse_filename(filepath):
    name = Path(filepath).stem.lower()
    name_normalized = name.replace('ı', 'i').replace('ö', 'o').replace('ü', 'u').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')
    ders = 'Genel'
    for key, val in DERS_MAP.items():
        if key in name_normalized or key in name:
            ders = val
            break
    sinif_m = re.search(r'(\d+)', name)
    sinif = int(sinif_m.group(1)) if sinif_m else 0
    return ders, sinif

# ── PDF'den Metin Çıkarma ────────────────────────────────────────────────────────

def extract_with_pdfplumber(pdf_path):
    """pdfplumber ile metin çıkar — dijital PDF için ideal"""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            if i % 30 == 0:
                print(f"   [{i+1}/{total}] sayfa okunuyor...")
            try:
                text = page.extract_text() or ""
                pages.append(clean_text(text))
            except:
                pages.append("")
    return pages

def extract_with_surya_new(pdf_path):
    """Surya yeni API ile OCR"""
    import pypdfium2 as pdfium
    from PIL import Image
    from surya.recognition import RecognitionPredictor
    from surya.detection import DetectionPredictor

    print("   🤖 Surya modelleri yükleniyor (ilk seferde yavaş olabilir)...")
    det_predictor = DetectionPredictor()
    rec_predictor = RecognitionPredictor()

    doc = pdfium.PdfDocument(pdf_path)
    total = len(doc)
    pages_text = []

    for i in range(total):
        if i % 20 == 0:
            print(f"   [{i+1}/{total}] Surya OCR işliyor...")
        try:
            page = doc[i]
            bitmap = page.render(scale=2)
            pil_img = bitmap.to_pil()

            # Surya detection + recognition
            preds = det_predictor([pil_img])
            rec_preds = rec_predictor([pil_img], [['tr']], preds)

            text = ""
            for line in rec_preds[0].text_lines:
                text += line.text + "\n"
            pages_text.append(clean_text(text))
        except Exception as e:
            pages_text.append("")

    return pages_text

def extract_with_surya_legacy(pdf_path):
    """Surya eski API ile OCR"""
    from surya.ocr import run_ocr
    from surya.model.detection.model import load_model as load_det, load_processor as load_det_proc
    from surya.model.recognition.model import load_model as load_rec
    from surya.model.recognition.processor import load_processor as load_rec_proc
    import pypdfium2 as pdfium
    from PIL import Image

    print("   🤖 Surya modelleri yükleniyor...")
    det_model, det_proc = load_det(), load_det_proc()
    rec_model, rec_proc = load_rec(), load_rec_proc()

    doc = pdfium.PdfDocument(pdf_path)
    pages_text = []
    langs = [['tr']]

    for i in range(len(doc)):
        if i % 20 == 0:
            print(f"   [{i+1}/{len(doc)}] Surya OCR işliyor...")
        try:
            page = doc[i]
            bitmap = page.render(scale=2)
            pil_img = bitmap.to_pil()
            result = run_ocr([pil_img], langs, det_model, det_proc, rec_model, rec_proc)
            text = "\n".join([line.text for line in result[0].text_lines])
            pages_text.append(clean_text(text))
        except:
            pages_text.append("")
    return pages_text

def extract_pages(pdf_path):
    """En iyi yöntemi seçerek metin çıkar"""
    if surya_available == True:
        try:
            print("   📡 Surya OCR kullanılıyor...")
            return extract_with_surya_new(pdf_path)
        except Exception as e:
            print(f"   ⚠️  Surya hatası, pdfplumber'a geçiliyor: {e}")
    elif surya_available == 'legacy':
        try:
            print("   📡 Surya OCR (eski) kullanılıyor...")
            return extract_with_surya_legacy(pdf_path)
        except Exception as e:
            print(f"   ⚠️  Surya hatası, pdfplumber'a geçiliyor: {e}")

    print("   📄 pdfplumber kullanılıyor...")
    return extract_with_pdfplumber(pdf_path)

# ── Ana İşleme Fonksiyonu ────────────────────────────────────────────────────────

def process_pdf(pdf_path):
    print(f"\n{'='*55}")
    print(f"🔍 İşleniyor: {os.path.basename(pdf_path)}")
    print(f"{'='*55}")

    if not os.path.exists(pdf_path):
        print(f"❌ Dosya bulunamadı: {pdf_path}")
        return None

    ders, sinif = parse_filename(pdf_path)
    print(f"📚 Ders: {ders} | Sınıf: {sinif}")

    os.makedirs('data', exist_ok=True)

    # Sayfaları oku
    pages = extract_pages(pdf_path)
    total_pages = len(pages)
    print(f"   Toplam sayfa: {total_pages}")

    # Konulara ayır
    konular = []
    current_bolum = "Genel"
    current_konu = "Giriş"
    current_icerik = []

    for i, text in enumerate(pages):
        if not text.strip():
            continue

        bolum = detect_chapter(text)
        if bolum:
            if current_icerik:
                konular.append({
                    "bolum": current_bolum,
                    "konu": current_konu,
                    "icerik": ' '.join(current_icerik)[:4000],
                    "sayfa": i,
                })
            current_bolum = bolum
            current_konu = bolum
            current_icerik = [text]
            continue

        konu = detect_topic(text)
        if konu and konu != current_konu:
            if current_icerik:
                konular.append({
                    "bolum": current_bolum,
                    "konu": current_konu,
                    "icerik": ' '.join(current_icerik)[:4000],
                    "sayfa": i,
                })
            current_konu = konu
            current_icerik = [text]
        else:
            current_icerik.append(text)

    # Son konuyu kaydet
    if current_icerik:
        konular.append({
            "bolum": current_bolum,
            "konu": current_konu,
            "icerik": ' '.join(current_icerik)[:4000],
            "sayfa": total_pages,
        })

    # Eğer çok az konu bulunduysa chunk bazlı böl
    if len(konular) < 5:
        print("⚠️  Az konu tespit edildi, sayfa bazlı bölünüyor...")
        konular = []
        chunk_size = 8
        for start in range(0, total_pages, chunk_size):
            chunk = pages[start:start+chunk_size]
            icerik = ' '.join([p for p in chunk if p.strip()])[:4000]
            if icerik.strip():
                konular.append({
                    "bolum": f"Sayfa {start+1}-{min(start+chunk_size, total_pages)}",
                    "konu": f"Sayfa {start+1}-{min(start+chunk_size, total_pages)} içeriği",
                    "icerik": icerik,
                    "sayfa": start,
                })

    # JSON kaydet
    safe_name = ders.lower().replace(' ', '-').replace('ç','c').replace('ş','s').replace('ğ','g').replace('ü','u').replace('ö','o').replace('ı','i').replace('İ','i')
    output_path = f"data/{safe_name}-{sinif}.json"

    output = {
        "ders": ders,
        "sinif": sinif,
        "kaynak": "MEB Ders Kitabı",
        "toplam_sayfa": total_pages,
        "toplam_konu": len(konular),
        "isleme_yontemi": "Surya OCR" if surya_available else "pdfplumber",
        "konular": konular,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"\n✅ {os.path.basename(pdf_path)} tamamlandı!")
    print(f"   📁 Çıktı : {output_path}")
    print(f"   📊 Konular: {len(konular)}")
    print(f"   💾 Boyut  : {size_kb:.1f} KB")
    return output_path

# ── Batch İşleme ────────────────────────────────────────────────────────────────

def process_all():
    """pdf-input/ klasöründeki tüm PDF'leri işle"""
    pdf_files = glob.glob('pdf-input/*.pdf') + glob.glob('pdf-input/*.PDF')

    if not pdf_files:
        print("❌ pdf-input/ klasöründe PDF bulunamadı.")
        print("   PDF dosyalarını pdf-input/ klasörüne koyun ve tekrar çalıştırın.")
        return

    print(f"📦 {len(pdf_files)} PDF bulundu:")
    for f in pdf_files:
        print(f"   - {os.path.basename(f)}")

    results = []
    for pdf_path in pdf_files:
        result = process_pdf(pdf_path)
        if result:
            results.append(result)

    print(f"\n{'='*55}")
    print(f"🎉 Tüm işlemler tamamlandı!")
    print(f"   İşlenen: {len(results)}/{len(pdf_files)} PDF")
    print(f"   Çıktılar: data/ klasöründe")
    print(f"{'='*55}")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        process_pdf(sys.argv[1])
    else:
        process_all()
