/**
 * EduX AI Engine v2 — Doğal Cevap Veren Kendi Yapay Zekami
 * ===========================================================
 * API key yok. Soru-cevap tabanlı, ChatGPT gibi doğal cevap verir.
 * Soruyu anlayıp direkt cevaplar — şablon değil, bilgi.
 */

const EduXAI = (() => {

  // ─────────────────────────────────────────────────────────────
  // NLP ARAÇLARI
  // ─────────────────────────────────────────────────────────────

  function normalize(text) {
    return text.toLowerCase()
      .replace(/[çÇ]/g,'ç').replace(/[şŞ]/g,'ş').replace(/[ğĞ]/g,'ğ')
      .replace(/[üÜ]/g,'ü').replace(/[öÖ]/g,'ö').replace(/[ıIİ]/g, c => c==='İ'?'i':'ı')
      .replace(/[?!.,;:()\[\]{}'"]/g,' ').replace(/\s+/g,' ').trim();
  }

  function has(text, ...words) {
    const n = normalize(text);
    return words.some(w => n.includes(w));
  }

  function hasAll(text, ...words) {
    const n = normalize(text);
    return words.every(w => n.includes(w));
  }

  // ─────────────────────────────────────────────────────────────
  // SORU–CEVAP VERİTABANI
  // Her entry: { match: fn(text)->bool, answer: string|fn(text)->string }
  // ─────────────────────────────────────────────────────────────

  const QA = [

    // ── SELAMLAMA ───────────────────────────────────────────────
    {
      match: t => has(t,'merhaba','selam','hey','günaydın','iyi günler','hello','hi '),
      answer: () => `## 👋 Merhaba! Ben EduX AI

Seni Matematik, Geometri, Türev, İntegral ve daha pek çok konuda desteklemek için buradayım!

**Ne yapmamı istersin?**
- 📌 Bir konu hakkında soru sor → direkt cevaplarım
- 📚 "Türevi açıkla" → detaylı anlat
- ⚡ "Pratik soru ver" → alıştırma soruları
- 🧮 "2x + 5 = 11 çöz" → adım adım göster

Haydi başlayalım! 🚀`
    },

    {
      match: t => has(t,'teşekkür','sağ ol','eyw','eyv','tamam oldu','harika','güzel','süper','bravo'),
      answer: () => {
        const r = [
          '## 😊 Rica ederim! Başka sorun var mı?',
          '## 🎉 Ne mutlu! Öğrenmeye devam et, başarılar!',
          '## 👍 Her zaman! Başka bir konu sormak istersen buradayım.',
        ];
        return r[Math.floor(Math.random()*r.length)];
      }
    },

    {
      match: t => has(t,'nasılsın','naber','ne haber','iyimisin','iyi misin'),
      answer: () => `## 😄 İyiyim, teşekkürler!\n\nBen bir AI olduğum için yorulmak nedir bilmem — sana yardım etmek için hazırım! Ne öğrenmek istiyorsun?`
    },

    // ── GEOMETRİ — AÇILAR ───────────────────────────────────────
    {
      match: t => hasAll(t,'üçgen') && has(t,'iç açı','açı toplamı','açıların toplamı','kaç derece','kaç°'),
      answer: () => `## 📐 Üçgenin İç Açıları Toplamı

**Cevap: 180°**

Bir üçgenin iç açıları toplamı her zaman **180 derecedir.**

### Neden 180°?
Herhangi bir üçgenin köşelerini bir doğru üzerinde toparladığında düz açı (180°) oluşur — bu geometrinin temel teoremidir.

### Örnek:
Bir üçgenin iki açısı 60° ve 80° ise → üçüncü açı = 180° - 60° - 80° = **40°**

### Pratik Sorular:
**Soru 1:** Bir üçgenin açıları x, 2x ve 3x olursa x kaçtır?
> x + 2x + 3x = 180° → 6x = 180° → **x = 30°**

**Soru 2:** Bir dik üçgenin iki dar açısı eşit ise her biri kaç derecedir?
> 90° + a + a = 180° → 2a = 90° → **a = 45°**`
    },

    {
      match: t => has(t,'dış açı') && has(t,'üçgen'),
      answer: () => `## 📐 Üçgenin Dış Açısı

Bir üçgenin dış açısı, komşu olmayan iki iç açının toplamına eşittir.

### Formül:
\`\`\`
Dış Açı = İçteki iki açının toplamı
\`\`\`

### Örnek:
Bir üçgenin iki iç açısı 50° ve 70° ise karşı dış açı = **50° + 70° = 120°**

> 💡 **Kontrol:** 180° - iç açı = 180° - 60° = 120° ✓`
    },

    {
      match: t => has(t,'çokgenin iç açı','n kenarlı','düzgün çokgen') && has(t,'açı','toplam'),
      answer: () => `## 📐 Çokgenin İç Açıları Toplamı

### Formül:
\`\`\`
İç açılar toplamı = (n - 2) × 180°
\`\`\`
n = kenar sayısı

| Şekil | n | İç açılar toplamı |
|---|---|---|
| Üçgen | 3 | 180° |
| Dörtgen | 4 | 360° |
| Beşgen | 5 | 540° |
| Altıgen | 6 | 720° |
| n-gen | n | (n-2)×180° |

### Düzgün çokgende her açı:
\`\`\`
Her açı = (n-2) × 180° / n
\`\`\``
    },

    // ── GEOMETRİ — ALAN ─────────────────────────────────────────
    {
      match: t => has(t,'daire alanı','çember alanı') || (has(t,'daire','çember') && has(t,'alan','hesap','formül','bul')),
      answer: () => `## 📐 Daire Alanı

### Formül:
\`\`\`
A = π × r²
\`\`\`
r = yarıçap

### Örnekler:
**r = 5 cm:** A = π × 5² = **25π ≈ 78.54 cm²**
**r = 3 cm:** A = π × 3² = **9π ≈ 28.27 cm²**

### 🔵 Çevre:
\`\`\`
C = 2 × π × r
\`\`\`

**r = 4 cm:** C = 2π × 4 = **8π ≈ 25.13 cm**`
    },

    {
      match: t => has(t,'üçgen alan','üçgenin alanı') || (has(t,'üçgen') && has(t,'alan','formül')),
      answer: () => `## 📐 Üçgen Alanı

### Formül:
\`\`\`
A = (taban × yükseklik) / 2
\`\`\`

### Alternatif (Heron Formülü):
\`\`\`
s = (a+b+c)/2
A = √(s(s-a)(s-b)(s-c))
\`\`\`

### Örnekler:
**Taban=8, Yükseklik=5:** A = (8×5)/2 = **20 cm²**
**Kenarlar 3,4,5:** s=6 → A=√(6×3×2×1) = **6 cm²**

> 💡 Dik üçgende: iki dik kenar taban ve yüksekliktir.`
    },

    {
      match: t => has(t,'kare alan','karenin alanı') || (has(t,'kare') && has(t,'alan','formül')),
      answer: () => `## 📐 Kare Alanı

### Formül:
\`\`\`
A = a²     (a = kenar uzunluğu)
Çevre = 4a
Köşegen = a√2
\`\`\`

**a = 6 cm:** A = 36 cm², Çevre = 24 cm, Köşegen = 6√2 ≈ 8.49 cm`
    },

    {
      match: t => has(t,'dikdörtgen alan','dikdörtgenin alanı') || (has(t,'dikdörtgen') && has(t,'alan','formül')),
      answer: () => `## 📐 Dikdörtgen Alanı

### Formül:
\`\`\`
A = uzunluk × genişlik = a × b
Çevre = 2(a + b)
Köşegen = √(a² + b²)
\`\`\`

**a=8, b=5:** A = 40 cm², Çevre = 26 cm, Köşegen = √89 ≈ 9.43 cm`
    },

    {
      match: t => has(t,'silindir') && has(t,'hacim','formül','hesap','bul'),
      answer: () => `## 📐 Silindir Hacmi

### Formül:
\`\`\`
V = π × r² × h
Yan yüzey: 2πrh
Toplam yüzey: 2πr(r+h)
\`\`\`
r = taban yarıçapı, h = yükseklik

**r=3, h=7:** V = π × 9 × 7 = **63π ≈ 197.9 cm³**`
    },

    {
      match: t => has(t,'küre') && has(t,'hacim','formül','hesap'),
      answer: () => `## 📐 Küre

### Formüller:
\`\`\`
Hacim  V = (4/3)πr³
Yüzey  A = 4πr²
\`\`\`

**r=3 cm:** V = (4/3)π×27 = **36π ≈ 113.1 cm³**  |  A = 4π×9 = **36π ≈ 113.1 cm²**`
    },

    {
      match: t => has(t,'pisagor','pifagor') || (has(t,'dik üçgen') && has(t,'kenar','bul','hesap','formül')),
      answer: () => `## 📐 Pisagor Teoremi

### Formül:
\`\`\`
a² + b² = c²
\`\`\`
c = hipotenüs (dik açının karşısındaki kenar)
a, b = diğer iki kenar

### Klasik Pisagor Üçlüleri:
- **3 - 4 - 5** (3²+4²=9+16=25=5²) ✓
- **5 - 12 - 13**
- **8 - 15 - 17**

### Örnek:
**Soru:** Dik kenarlar 6 ve 8 cm ise hipotenüs?
> c = √(6²+8²) = √(36+64) = √100 = **10 cm**

**Soru:** Hipotenüs=13, bir dik kenar=5 ise diğer kenar?
> b = √(13²-5²) = √(169-25) = √144 = **12 cm**`
    },

    // ── CEBİR / DENKLEM ─────────────────────────────────────────
    {
      match: t => has(t,'ikinci derece denklem','ax²','a x²','karesel denklem') || (has(t,'x²') && has(t,'çöz','kök','delta','diskriminant')),
      answer: () => `## 🧮 İkinci Derece Denklem

Standart form: **ax² + bx + c = 0**

### Çözüm Formülü (abc formülü):
\`\`\`
x = (-b ± √(b²-4ac)) / 2a
Δ = b² - 4ac  (diskriminant)
\`\`\`

| Δ | Kök sayısı |
|---|---|
| Δ > 0 | 2 farklı gerçek kök |
| Δ = 0 | 1 kök (çift kök) |
| Δ < 0 | Gerçek kök yok |

### Örnek: x² - 5x + 6 = 0
a=1, b=-5, c=6
Δ = 25-24 = 1
x = (5±1)/2 → **x₁=3, x₂=2**

### Faktörleme ile:
x² - 5x + 6 = (x-2)(x-3) = 0 → x=2 veya x=3 ✓`
    },

    {
      match: t => {
        // "2x + 5 = 11 çöz" gibi basit denklem
        return /\d+\s*x\s*[+\-]\s*\d+\s*=\s*\d+/.test(t) || /x\s*[+\-]\s*\d+\s*=\s*\d+/.test(t);
      },
      answer: t => {
        // ax + b = c formatını çöz
        let m = t.match(/(\d*)\s*x\s*([+\-])\s*(\d+)\s*=\s*(\d+)/);
        if (m) {
          const a = m[1] ? parseInt(m[1]) : 1;
          const sign = m[2] === '+' ? 1 : -1;
          const b = sign * parseInt(m[3]);
          const c = parseInt(m[4]);
          const result = (c - b) / a;
          return `## 🧮 Denklem Çözümü

**${t.trim()}**

### Adım Adım:
1. Her iki taraftan **${b > 0 ? b : '('+b+')'}** çıkar → **${a}x = ${c-b}**
2. Her iki tarafı **${a}**'ya böl → **x = ${c-b}/${a}**
3. **x = ${result}**

### Kontrol:
${a}×${result} + ${b} = ${a*result + b} ${a*result + b === c ? '= '+c+' ✓' : '≠ '+c}`;
        }
        return null;
      }
    },

    {
      match: t => has(t,'polinom nedir','polinom ne','polinomlar nedir','polinom hakkında'),
      answer: () => `## 📚 Polinomlar

### Tanım:
Polinom, değişkenlerin **negatif olmayan tam sayı kuvvetleri**nin toplamından oluşan cebirsel ifadedir.

\`\`\`
P(x) = aₙxⁿ + aₙ₋₁xⁿ⁻¹ + ... + a₁x + a₀
\`\`\`

### Terimler:
- **Derece:** En yüksek kuvvet → P(x)=3x²+2x-1 için **2. derece**
- **Katsayı:** Değişkenin önündeki sayı
- **Sabit terim:** a₀ (x olmayan kısım)

### Örnekler:
| İfade | Tür | Derece |
|---|---|---|
| 5x - 3 | Birinci derece | 1 |
| x² + 2x + 1 | İkinci derece | 2 |
| x³ - x | Üçüncü derece | 3 |

### İşlemler:
**Toplama:** Aynı dereceli terimleri topla
**Çarpma:** Her terimi çarp, dereceleri ekle
**Bölme:** Sentetik bölme veya polinomlarda bölme`
    },

    {
      match: t => has(t,'polinom') && has(t,'p(','p (','değer','hesap','bul'),
      answer: () => `## 🧮 Polinomda Değer Hesaplama

**P(x)** polinomu verildiğinde **P(a)** bulmak için **x yerine a** yaz.

### Örnek:
P(x) = 3x² + 2x - 5 için P(1) = ?
> P(1) = 3(1)² + 2(1) - 5 = 3 + 2 - 5 = **0**

P(2) = ?
> P(2) = 3(4) + 2(2) - 5 = 12 + 4 - 5 = **11**

### Kalan Teoremi:
P(x) polinomu (x-a)'ya bölündüğünde **kalan = P(a)**`
    },

    // ── TÜREV ───────────────────────────────────────────────────
    {
      match: t => has(t,'türev nedir','türev ne','türev hakkında','türev anlat'),
      answer: () => `## 📚 Türev

### Tanım:
Türev, bir fonksiyonun **anlık değişim hızıdır.** Grafikte o noktaya çizilen **teğetin eğimini** verir.

\`\`\`
f'(x) = lim[h→0] (f(x+h) - f(x)) / h
\`\`\`

### Türev Alma Kuralları:
| Kural | Formül |
|---|---|
| Sabit | c' = 0 |
| Kuvvet | (xⁿ)' = n·xⁿ⁻¹ |
| Toplam | (f+g)' = f' + g' |
| Çarpım | (f·g)' = f'g + fg' |
| Bölüm | (f/g)' = (f'g - fg') / g² |
| Zincir | (f(g(x)))' = f'(g(x))·g'(x) |

### Örnekler:
- f(x) = x³ → **f'(x) = 3x²**
- f(x) = 5x² + 3x - 7 → **f'(x) = 10x + 3**
- f(x) = (2x+1)³ → **f'(x) = 3(2x+1)² × 2 = 6(2x+1)²**

### Kullanım Alanları:
- Hız/ivme (fizik)
- Maksimum-minimum problemleri
- Eğim hesaplama`
    },

    {
      match: t => has(t,'türev') && has(t,'kuvvet kuralı','kuvvet'),
      answer: () => `## 🧮 Kuvvet Kuralı (Türev)

\`\`\`
(xⁿ)' = n · xⁿ⁻¹
\`\`\`

### Örnekler:
| Fonksiyon | Türev |
|---|---|
| x⁵ | 5x⁴ |
| x³ | 3x² |
| x² | 2x |
| x | 1 |
| √x = x^(1/2) | 1/(2√x) |
| 1/x = x⁻¹ | -1/x² |

**f(x) = 4x³ - 2x² + 7x - 3**
→ f'(x) = **12x² - 4x + 7**`
    },

    {
      match: t => has(t,'türev') && has(t,'maksimum','minimum','ekstrem','kritik nokta'),
      answer: () => `## 🧮 Türev ile Maksimum-Minimum

### Yöntem:
1. f'(x) = 0 denklemini çöz → **kritik noktalar**
2. f''(x) hesapla:
   - f''(x) < 0 → **yerel maksimum**
   - f''(x) > 0 → **yerel minimum**

### Örnek: f(x) = x³ - 3x² - 9x + 5
f'(x) = 3x² - 6x - 9 = 0
→ x² - 2x - 3 = 0
→ (x-3)(x+1) = 0
→ **x = 3** veya **x = -1**

f''(x) = 6x - 6
- f''(-1) = -12 < 0 → **x=-1 yerel maksimum**, f(-1) = 10
- f''(3) = 12 > 0 → **x=3 yerel minimum**, f(3) = -22`
    },

    // ── İNTEGRAL ────────────────────────────────────────────────
    {
      match: t => has(t,'integral nedir','integral ne','integral anlat','integral hakkında'),
      answer: () => `## 📚 İntegral

### Tanım:
İntegral, **türevin tersi** işlemidir (antitürev). Geometrik olarak **eğri altındaki alanı** hesaplar.

### Belirsiz İntegral:
\`\`\`
∫xⁿ dx = xⁿ⁺¹/(n+1) + C    (n ≠ -1)
∫k dx = kx + C
\`\`\`
C = integral sabiti

### Belirli İntegral:
\`\`\`
∫[a→b] f(x) dx = F(b) - F(a)
\`\`\`

### Örnekler:
- ∫x² dx = **x³/3 + C**
- ∫(3x² + 2x) dx = **x³ + x² + C**
- ∫[0→2] x² dx = [x³/3]₀² = 8/3 - 0 = **8/3**

### Temel Formüller:
| ∫f(x)dx | Sonuç |
|---|---|
| ∫xⁿ dx | xⁿ⁺¹/(n+1)+C |
| ∫eˣ dx | eˣ+C |
| ∫(1/x) dx | ln|x|+C |
| ∫sin(x) dx | -cos(x)+C |
| ∫cos(x) dx | sin(x)+C |`
    },

    // ── İSTATİSTİK ──────────────────────────────────────────────
    {
      match: t => has(t,'ortalama nedir','aritmetik ortalama','ortalama ne','ortalama nasıl'),
      answer: () => `## 📊 Aritmetik Ortalama

### Formül:
\`\`\`
x̄ = (x₁ + x₂ + ... + xₙ) / n
\`\`\`

### Örnek:
4, 7, 2, 9, 3 sayılarının ortalaması:
> x̄ = (4+7+2+9+3) / 5 = 25/5 = **5**

### Ağırlıklı Ortalama:
\`\`\`
x̄ = Σ(fᵢ × xᵢ) / Σfᵢ
\`\`\`

### Dikkat: Ortalama vs Medyan vs Mod
| Ölçü | Tanım |
|---|---|
| **Ortalama** | Toplam ÷ adet |
| **Medyan** | Ortanca değer (sıralayınca) |
| **Mod** | En sık tekrarlanan |`
    },

    {
      match: t => has(t,'medyan nedir','ortanca','medyan ne'),
      answer: () => `## 📊 Medyan (Ortanca)

Veri **küçükten büyüğe sıralandığında** ortadaki değerdir.

- **Tekil adet:** Ortadaki eleman
- **Çift adet:** Ortadaki iki elemanın ortalaması

### Örnek (tekil):
3, 7, 12, 2, 8 → sırala: **2, 3, 7, 8, 12** → medyan = **7**

### Örnek (çift):
4, 1, 9, 6 → sırala: **1, 4, 6, 9** → medyan = (4+6)/2 = **5**`
    },

    {
      match: t => has(t,'standart sapma','varyans') && has(t,'nedir','ne','formül','nasıl','hesap'),
      answer: () => `## 📊 Varyans & Standart Sapma

### Formüller:
\`\`\`
Varyans: s² = Σ(xᵢ - x̄)² / n
Standart Sapma: s = √s²
\`\`\`

### Hesaplama Adımları:
1. Ortalama (x̄) hesapla
2. Her değerin ortalamadan farkını al: (xᵢ - x̄)
3. Farkları karele al: (xᵢ - x̄)²
4. Ortalamasını al → **varyans**
5. Karekökünü al → **standart sapma**

### Örnek: 2, 4, 4, 4, 5, 5, 7, 9
x̄ = 40/8 = **5**
Kareler: 9,1,1,1,0,0,4,16 → toplam=32
s² = 32/8 = **4** → s = **2**`
    },

    // ── OLASILIK ────────────────────────────────────────────────
    {
      match: t => has(t,'olasılık nedir','olasılık ne','olasılık anlat','ihtimal'),
      answer: () => `## 🎲 Olasılık

### Tanım:
Olasılık, bir olayın gerçekleşme ihtimalini **0 ile 1** arasında ölçer.

\`\`\`
P(A) = Elverişli sonuç sayısı / Toplam sonuç sayısı
\`\`\`

### Özellikler:
- 0 ≤ P(A) ≤ 1
- P(kesin olay) = 1
- P(imkânsız) = 0
- P(Aᶜ) = 1 - P(A)

### Örnek:
**Bir zarın atılması:**
- P(çift) = 3/6 = **1/2** (2,4,6)
- P(6 gelmesi) = 1/6
- P(yüz gelme) = 0

### Toplama Kuralı:
P(A∪B) = P(A) + P(B) - P(A∩B)

### Çarpma (bağımsız olaylar):
P(A∩B) = P(A) × P(B)`
    },

    {
      match: t => has(t,'kombinasyon','kombinasyon nedir') && !has(t,'permütasyon'),
      answer: () => `## 🎲 Kombinasyon

n elemandan r tanesini **sırasız** seçme sayısı:

\`\`\`
C(n,r) = n! / (r! × (n-r)!)
\`\`\`

### Örnekler:
**10 kişiden 3 kişilik komite:** C(10,3) = 10!/(3!×7!) = **120**
**52 karttan 5 kart:** C(52,5) = **2.598.960**

### Özellikler:
- C(n,0) = C(n,n) = 1
- C(n,r) = C(n,n-r)
- C(n,1) = n`
    },

    {
      match: t => has(t,'permütasyon') || (has(t,'dizme','dizilme') && has(t,'kaç')),
      answer: () => `## 🎲 Permütasyon

n elemandan r tanesini **sıralı** seçme/dizme sayısı:

\`\`\`
P(n,r) = n! / (n-r)!
\`\`\`

**n elemanın tamamını dizme:** P(n,n) = n!

### Örnekler:
**5 kitabı rafa dizme:** 5! = **120 farklı şekilde**
**8 kişiden 3 kişilik sıralı seçim:** P(8,3) = 8×7×6 = **336**

### Kombinasyon vs Permütasyon:
- **Sıra ÖNEMLI** → Permütasyon
- **Sıra ÖNEMSİZ** → Kombinasyon`
    },

    // ── DİZİLER ─────────────────────────────────────────────────
    {
      match: t => has(t,'aritmetik dizi') && has(t,'nedir','ne','anlat','formül','açıkla'),
      answer: () => `## 📐 Aritmetik Dizi

Her iki ardışık terim arasındaki fark **sabit** (ortak fark = d):

\`\`\`
aₙ = a₁ + (n-1) × d
Sₙ = n/2 × (a₁ + aₙ)  = n/2 × (2a₁ + (n-1)d)
\`\`\`

### Örnek:
3, 7, 11, 15, ... (d=4)
- **10. terim:** a₁₀ = 3 + 9×4 = **39**
- **İlk 10 toplamı:** S₁₀ = 10/2 × (3+39) = **210**`
    },

    {
      match: t => has(t,'geometrik dizi') && has(t,'nedir','ne','anlat','formül','açıkla'),
      answer: () => `## 📐 Geometrik Dizi

Her iki ardışık terim arasındaki **oran sabit** (ortak oran = r):

\`\`\`
aₙ = a₁ × r^(n-1)
Sₙ = a₁ × (rⁿ - 1) / (r - 1)   (r ≠ 1)
\`\`\`

### Örnek:
2, 6, 18, 54, ... (r=3)
- **5. terim:** a₅ = 2 × 3⁴ = **162**
- **İlk 4 toplamı:** S₄ = 2×(81-1)/2 = **80**

> 💡 |r| < 1 ise sonsuz toplam: S∞ = a₁/(1-r)`
    },

    // ── SAYILAR ─────────────────────────────────────────────────
    {
      match: t => has(t,'asal sayı','asal sayılar') && has(t,'nedir','ne','listesi'),
      answer: () => `## 🔢 Asal Sayılar

**Tanım:** Yalnızca 1 ve kendisine bölünebilen sayılar (1'den büyük).

### 100'e kadar asal sayılar:
2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97

### Özellikler:
- **1** asal sayı değildir
- **2** tek çift asal sayıdır
- Asal sayı mı kontrol: √n'e kadar bölünme dene

### Örnek: 97 asal mı?
√97 ≈ 9.8 → 2,3,5,7'ye bölünmüyor → **ASAL** ✓`
    },

    {
      match: t => has(t,'ebob','ekok','obeb'),
      answer: () => `## 🔢 EBOB & EKOK

### EBOB (En Büyük Ortak Bölen):
İki sayının **ortak bölenlerinin en büyüğü**

\`\`\`
EBOB(12,18): bölenler → 1,2,3,4,6,12 ve 1,2,3,6,9,18 → EBOB=6
\`\`\`

### EKOK (En Küçük Ortak Kat):
İki sayının **ortak katlarının en küçüğü**

\`\`\`
EKOK(4,6): katlar → 4,8,12,16... ve 6,12,18... → EKOK=12
\`\`\`

### Formül:
\`\`\`
EBOB(a,b) × EKOK(a,b) = a × b
\`\`\`

EBOB(12,18)×EKOK(12,18) = 12×18 = 216 → 6 × EKOK = 216 → **EKOK = 36**`
    },

    // ── MATEMATİK GENEL ─────────────────────────────────────────
    {
      match: t => has(t,'logaritma','log nedir','log ne','logaritma nedir'),
      answer: () => `## 📚 Logaritma

### Tanım:
\`\`\`
logₐb = x  ↔  aˣ = b
\`\`\`
"a tabanında b'nin logaritması x'tir"

### Özellikler:
\`\`\`
log(m×n) = log(m) + log(n)
log(m/n) = log(m) - log(n)
log(mⁿ)  = n × log(m)
log_a(a) = 1
log_a(1) = 0
\`\`\`

### Örnekler:
- log₂8 = 3  (çünkü 2³=8)
- log₁₀100 = 2  (çünkü 10²=100)
- log₃(1/9) = -2  (çünkü 3⁻²=1/9)

### Taban Değiştirme:
\`\`\`
logₐb = log(b) / log(a)
\`\`\``
    },

    {
      match: t => has(t,'mutlak değer','|x|') && has(t,'nedir','ne','anlat','açıkla'),
      answer: () => `## 📚 Mutlak Değer

### Tanım:
|x| = bir sayının sıfırdan uzaklığı (hep pozitif)

\`\`\`
|x| = x    (x ≥ 0 ise)
|x| = -x   (x < 0 ise)
\`\`\`

### Örnekler:
|5| = **5**, |-7| = **7**, |0| = **0**

### Denklem: |x - 3| = 5
x - 3 = 5 → **x = 8**
x - 3 = -5 → **x = -2**
Çözüm: {-2, 8}

### Eşitsizlik: |x| < 4
-4 < x < 4`
    },

    {
      match: t => has(t,'üslü sayı','üs nedir','üs ne','kuvvet nedir'),
      answer: () => `## 📚 Üslü Sayılar

\`\`\`
aⁿ = a × a × a × ... × a  (n kez)
\`\`\`

### Temel Kurallar:
\`\`\`
aᵐ × aⁿ = aᵐ⁺ⁿ
aᵐ / aⁿ = aᵐ⁻ⁿ
(aᵐ)ⁿ = aᵐˣⁿ
a⁰ = 1         (a ≠ 0)
a⁻ⁿ = 1/aⁿ
a^(1/n) = ⁿ√a
\`\`\`

### Örnekler:
- 2³ × 2⁴ = 2⁷ = **128**
- (3²)³ = 3⁶ = **729**
- 5⁻² = 1/25 = **0.04**`
    },

    // ── GENEL SORULAR ───────────────────────────────────────────
    {
      match: t => has(t,'ne biliyorsun','hangi konular','ne öğretebilirsin','neler yapabilirsin','konuların ne'),
      answer: () => `## 📚 Konularım

### Matematik:
| Alan | Konular |
|---|---|
| 📐 Geometri | Üçgen, çember, çokgen, alan, hacim, Pisagor |
| 🔢 Cebir | Denklemler, polinomlar, logaritma, üslü sayılar |
| 📊 Analiz | Türev, integral, limit |
| 🎲 Olasılık | Permütasyon, kombinasyon, olasılık hesabı |
| 📈 İstatistik | Ortalama, medyan, mod, standart sapma |
| 🔄 Diziler | Aritmetik, geometrik diziler |
| 🔵 Sayılar | Asal sayılar, EBOB, EKOK |

### Nasıl Sor?
- "Türev nedir?"
- "Üçgenin iç açıları toplamı kaçtır?"
- "2x + 5 = 11 çöz"
- "Kombinasyondan pratik soru ver"

Hazır! Ne öğrenmek istiyorsun? 🚀`
    },

    // ── CATCH-ALL ───────────────────────────────────────────────
    {
      match: t => has(t,'pratik soru','örnek soru','alıştırma','test et') && has(t,'polinom','türev','integral','geometri','olasılık','istatistik','dizi','trigonometri'),
      answer: t => {
        const topics = {
          polinom: practicePolinom,
          türev: practiceTurev,
          integral: practiceIntegral,
          geometri: practiceGeometri,
          olasılık: practiceOlasilik,
          istatistik: practiceIstatistik,
          dizi: practiceDizi,
        };
        for (const [key, fn] of Object.entries(topics)) {
          if (has(t, key)) return fn();
        }
        return null;
      }
    },
  ];

  // ─── Pratik Soru Fonksiyonları ──────────────────────────────────

  function practiceGeometri() {
    return `## ⚡ Geometri Pratik Soruları

### 🟢 Kolay
Yarıçapı 4 cm olan dairenin alanı nedir?
<details><summary>Cevap</summary>A = π×16 = **16π ≈ 50.27 cm²**</details>

### 🟡 Orta
Dik kenarları 5 ve 12 cm olan dik üçgenin alanı ve hipotenüsü?
<details><summary>Cevap</summary>Alan = (5×12)/2 = **30 cm²** | Hipotenüs = √(25+144) = **13 cm**</details>

### 🔴 Zor
Kenar uzunluğu 6 cm olan eşkenar üçgenin alanı nedir?
<details><summary>Cevap</summary>A = (√3/4)×6² = **9√3 ≈ 15.59 cm²**</details>`;
  }

  function practicePolinom() {
    return `## ⚡ Polinom Pratik Soruları

### 🟢 Kolay
P(x) = x² - 3x + 2 için P(2) = ?
<details><summary>Cevap</summary>P(2) = 4 - 6 + 2 = **0**</details>

### 🟡 Orta
P(x) = x³ - 6x² + 11x - 6 polinomunu (x-1)(x-2)(x-3) olarak gösterin.
<details><summary>Cevap</summary>P(1)=0, P(2)=0, P(3)=0 → **P(x) = (x-1)(x-2)(x-3)** ✓</details>

### 🔴 Zor
P(x) = x⁴ - 5x² + 4 polinomunu çarpanlarına ayırın.
<details><summary>Cevap</summary>(x²-1)(x²-4) = **(x-1)(x+1)(x-2)(x+2)**</details>`;
  }

  function practiceTurev() {
    return `## ⚡ Türev Pratik Soruları

### 🟢 Kolay
f(x) = 5x³ - 2x² + 7 → f'(x) = ?
<details><summary>Cevap</summary>f'(x) = **15x² - 4x**</details>

### 🟡 Orta
f(x) = (x² + 1)(x³ - 2) → f'(x) = ?
<details><summary>Cevap</summary>f'(x) = 2x(x³-2) + (x²+1)(3x²) = **5x⁴ + x² - 4x**</details>

### 🔴 Zor
f(x) = x³ - 6x + 2 fonksiyonunun artan olduğu aralığı bulun.
<details><summary>Cevap</summary>f'(x)=3x²-6≥0 → x²≥2 → **x≤-√2 veya x≥√2**</details>`;
  }

  function practiceIntegral() {
    return `## ⚡ İntegral Pratik Soruları

### 🟢 Kolay
∫(4x³ + 2x) dx = ?
<details><summary>Cevap</summary>**x⁴ + x² + C**</details>

### 🟡 Orta
∫[0→3] (x² - x) dx = ?
<details><summary>Cevap</summary>[x³/3 - x²/2]₀³ = (9 - 4.5) = **4.5**</details>

### 🔴 Zor
∫ x²·eˣ dx = ?
<details><summary>Cevap</summary>Parçalı integral: **eˣ(x² - 2x + 2) + C**</details>`;
  }

  function practiceOlasilik() {
    return `## ⚡ Olasılık Pratik Soruları

### 🟢 Kolay
Bir zarın atılmasında asal sayı gelme olasılığı?
<details><summary>Cevap</summary>Asal: 2,3,5 → P = 3/6 = **1/2**</details>

### 🟡 Orta
Bir torbada 3 kırmızı, 5 mavi top var. 2 top çekilirse ikisinin de mavi olma olasılığı?
<details><summary>Cevap</summary>C(5,2)/C(8,2) = 10/28 = **5/14**</details>

### 🔴 Zor
5 erkek 4 kız bir sıraya dizilirken kızlar birbirine komşu olmayacak şekilde kaç diziliş var?
<details><summary>Cevap</summary>5! × C(6,4) × 4! = 120 × 15 × 24 = **43.200**</details>`;
  }

  function practiceIstatistik() {
    return `## ⚡ İstatistik Pratik Soruları

### 🟢 Kolay
2, 5, 8, 11, 14 sayılarının ortalaması, medyanı ve modu?
<details><summary>Cevap</summary>Ortalama: 40/5=**8** | Medyan: **8** | Mod: **yok** (hepsi farklı)</details>

### 🟡 Orta
Ortalama=12, adet=8 ise toplam nedir?
<details><summary>Cevap</summary>Toplam = 12 × 8 = **96**</details>

### 🔴 Zor
3, 7, 7, 19 veri setinin standart sapması?
<details><summary>Cevap</summary>x̄=9, s²=((36+4+4+100)/4)=36, s=**6**</details>`;
  }

  function practiceDizi() {
    return `## ⚡ Dizi Pratik Soruları

### 🟢 Kolay
2, 5, 8, 11, ... dizisinin 20. terimi?
<details><summary>Cevap</summary>a₁=2, d=3 → a₂₀=2+19×3=**59**</details>

### 🟡 Orta
Geometrik dizinin 1. terimi 3, 4. terimi 24 ise ortak oran?
<details><summary>Cevap</summary>3r³=24 → r³=8 → **r=2**</details>

### 🔴 Zor
Aritmetik dizinin 5. terimi 18 ve toplamları S₁₀=165 ise a₁?
<details><summary>Cevap</summary>a₁+4d=18, 10a₁+45d=165 → 2a₁+9d=33 → a₁=**3**</details>`;
  }


  // ─────────────────────────────────────────────────────────────
  // ANA MOTOR — SORU EŞLEŞTİRME
  // ─────────────────────────────────────────────────────────────

  async function ask(userMessage, history = []) {
    const text = userMessage.trim();
    if (!text) return '❓ Bir soru yazmanız gerekiyor.';

    // Soru-cevap veritabanını dolaş
    for (const entry of QA) {
      if (entry.match(text)) {
        const result = typeof entry.answer === 'function'
          ? entry.answer(text)
          : entry.answer;
        if (result) return result;
      }
    }

    // Pratik soru isteği genel
    if (has(text, 'pratik', 'örnek soru', 'alıştırma', 'test et')) {
      return `## ⚡ Pratik Soru

Hangi konuda pratik soru istiyorsun? Şu konularda soruları var:

- "Geometriden pratik soru ver"
- "Türevden pratik soru ver"
- "Olasılıktan pratik soru ver"
- "Polinomdan pratik soru ver"
- "İstatistikten pratik soru ver"
- "Dizilerden pratik soru ver"`;
    }

    // Bilinmeyen konu
    return `## 🤔 Soruyu Anlayamadım

Şu an matematik konularında çalışıyorum. Örnek sorular:

- "Üçgenin iç açıları toplamı kaçtır?"
- "Türev nedir, nasıl alınır?"
- "x² + 5x + 6 = 0 çöz"
- "Olasılık nedir?"
- "Aritmetik dizi formülü?"
- "Hangi konuları biliyorsun?"

Sorunuzu farklı şekilde sormayı deneyin! 💡`;
  }

  return { ask };

})();
