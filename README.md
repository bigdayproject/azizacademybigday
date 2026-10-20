# Al Aziz Academy — test platformasi (Vue 3 + Node.js)

O‘qituvchilar uchun test platformasi. Frontend: Vue 3 + Vite. Backend: Node.js (Express 5, `node:sqlite`).

## Talablar
- Node.js **22.13 yoki yangiroq**

## Ishga tushirish
```bash
npm install          # backend + client bog‘liqliklarini o‘rnatadi
npm run build        # client/dist ni yig‘adi
ADMIN_PASSWORD=maxfiy_parol npm start
```
Brauzerda: http://localhost:3000 — admin paneli: `/admin`.

Birinchi ishga tushishda `savollar.xlsx` (470 ta savol: 15 fan x 30 + 20 ta Academic) bazaga avtomatik yuklanadi.

## Dev rejim
```bash
npm run dev          # backend :3000 va Vite dev-server (/api proksi qilinadi)
```

## Sozlamalar (muhit o‘zgaruvchilari)
| O‘zgaruvchi | Standart | Tavsif |
|---|---|---|
| `PORT` | 3000 | Server porti |
| `ADMIN_PASSWORD` | ulugbek1 | **Albatta o‘zgartiring** |
| `TEST_DURATION_MIN` | 60 | Kasb (2-bosqich) testi davomiyligi, daqiqa |
| `ACADEMIC_DURATION_MIN` | 60 | Academic (1-bosqich) testi davomiyligi, daqiqa |
| `QUESTIONS_PER_TEST` | hammasi | Har urinishda nechta savol berilishi |

## Savollarni boshqarish
## Kasblar va bosqichlar

- Fan ustozlari (15 kasb) 2 bosqichli test topshiradi: 1-bosqich **Academic**, 2-bosqich o‘z fani. Har bosqichning alohida taymeri bor.
- **Tozalik xodimi** va **Boshqa** faqat 1-bosqich (Academic) topshiradi.
- Academic savollari «Fan» ustuniga `Academic` deb yoziladi. Ular yuklanmagan bo‘lsa, ustozlar faqat kasb testini topshiradi, Tozalik xodimi/Boshqa boshlay olmaydi.
- Baza allaqachon mavjud bo‘lsa, `savollar.xlsx` qayta yuklanmaydi — Academic savollarini admin panel → «Savollar» orqali yuklang.

Admin panel → «Savollar»: shablonni yuklab oling (Fan, Savol, A–D (E ixtiyoriy), To‘g‘ri javob), to‘ldirib yuklang. Xato bo‘lsa hech narsa yuklanmaydi va qator xatolari ko‘rsatiladi.

## Testlar
```bash
npm test
```

Ma’lumotlar `data/` papkasida (SQLite). Uni zaxiralab turing.

## Ko‘p foydalanuvchi uchun (production)
Server bir vaqtda minglab o‘qituvchiga mo‘ljallangan: savollar xotirada keshlanadi, javoblarni saqlash bitta yengil so‘rov, vaqti tugagan testlar fonda yakunlanadi, admin jadvali 1000 qatorgacha ko‘rsatadi (Excel esa hammasini yuklaydi).
Sinov (bitta jarayon): 2000 test boshlash ~0.6 s, 20 000 ta javob saqlash ~2.8 s (≈7000/s).

Tavsiya etilgan tartib (VPS):
```bash
npm install -g pm2
ADMIN_PASSWORD=parol pm2 start server/index.js --name test --max-memory-restart 600M
pm2 save && pm2 startup      # server qayta yonsa o‘zi ko‘tariladi
```
Nginx orqali 80/443 portga chiqaring (HTTPS uchun certbot) va `TRUST_PROXY=1` qo‘ying, shunda IP lar to‘g‘ri aniqlanadi.
Muhim: **bitta jarayon** ishga tushiring (pm2 cluster rejimini ishlatmang), `data/` papkasini muntazam zaxiralang.

Qo‘shimcha o‘zgaruvchi: `START_LIMIT_PER_MIN` (standart 120) — bitta IP dan bir daqiqada nechta testni boshlash mumkin.

## Ma’lumotlar bazasi

- `DATABASE_URL` berilsa — **Postgres** ishlatiladi (jadvallar o‘zi yaratiladi).
- Berilmasa — SQLite fayl (`data/data.db`), mahalliy ishlash uchun qulay.
- Tashqi (public) Postgres manzili uchun `DATABASE_SSL=true`. Ulanishlar soni: `PG_POOL_MAX` (standart 10).

## Railway (backend + Postgres) + Netlify (frontend)

**1. Railway**
1. Loyihani GitHub’ga yuklang. Railway’da *New Project → Deploy from GitHub repo*.
2. Shu loyihada *+ New → Database → Add PostgreSQL*.
3. Server xizmati → *Variables*:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Postgres xizmati nomiga qarab)
   - `ADMIN_PASSWORD` = o‘z parolingiz
   - `SECRET_KEY` = uzun tasodifiy matn (admin sessiyasi har deployda uzilmasligi uchun)
   - `TRUST_PROXY` = `true`
   - `CLIENT_IP_HEADER` = `x-nf-client-connection-ip`
4. *Settings → Networking → Generate Domain*, manzilni nusxalang. `/api/health` ochilsa — tayyor.
   Volume kerak emas: hamma narsa Postgres’da saqlanadi.

**2. Netlify**
1. O‘sha reponi ulang (`netlify.toml` dan sozlamalar olinadi).
2. *Environment variables*: `API_URL` = `https://xxx.up.railway.app` (Railway manzili, oxirida `/`siz).
3. Deploy. `/api/*` so‘rovlari Netlify orqali Railway’ga uzatiladi (CORS va cookie muammosi yo‘q).

Birinchi ishga tushishda baza bo‘sh bo‘lsa, `savollar.xlsx` dagi savollar avtomatik yuklanadi.
