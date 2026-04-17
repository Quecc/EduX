# EduX

BearEdu / EduX, MEB uyumlu yapay zeka destekli ogrenme asistani projesidir.

## Calistirma

1. `.env.example` dosyasini kopyalayip `.env` olusturun.
2. `.env` icine `GEMINI_API_KEY` degerini ekleyin.
3. Sunucuyu baslatin:

```bash
cp .env.example .env
npm start
```

Uygulama varsayilan olarak `http://localhost:8000` adresinde acilir.

## Mimari

- `server.js`: Statik dosyalari sunar ve `/api/ai/generate` endpoint'i ile Gemini cagrisini sunucu tarafindan yapar.
- `index.html`, `chat.html`, `calisma-programi.html`: Kullanici arayuzleri.
- `app.js`, `chat.js`, `schedule.js`: Frontend davranislari.
- `auth.js`: Firebase auth ve kullanici profili akislarini yonetir.

## Guvenlik

- Gemini API key artik frontend dosyalarina gomulu degildir.
- Yeni key'leri repo icindeki takip edilen JS dosyalarina yazmayin.
- Daha once sizan key'leri mutlaka revoke/rotate edin.
