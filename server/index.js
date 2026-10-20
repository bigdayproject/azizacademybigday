import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express from 'express';
import multer from 'multer';
import {
  ACADEMIC_DURATION, ADMIN_PASSWORD, BRANCHES, DATA_DIR, DIST_DIR, DURATION, PORT, PROFESSIONS, STAFF_PROFESSIONS, SUBJECTS, TZ,
} from './config.js';
import {
  buildResultsWorkbook, buildTemplateWorkbook, readFirstSheetRows, seedQuestionsIfEmpty, XLSX_MIME,
} from './excel.js';
import { parseQuestionRows } from './questions.js';
import {
  attemptState, deleteAttempt, deleteSubjectQuestions, finishAttempt, getCurrent, HttpError,
  insertQuestions, queryResults, questionCounts, academicReady, saveAnswers, startAttempt, startNextStage, sweep,
} from './service.js';
import { db } from './db.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : (process.env.TRUST_PROXY ?? 'loopback'));
// Netlify orqali kelganda haqiqiy mijoz IP si shu sarlavhada bo‘ladi (CLIENT_IP_HEADER=x-nf-client-connection-ip)
const IP_HEADER = (process.env.CLIENT_IP_HEADER || '').toLowerCase();
function clientIp(req) {
  return (IP_HEADER && req.get(IP_HEADER)) || req.ip;
}
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
// API javoblari hech qachon keshlanmasin
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Bitta IP dan testni boshlash cheklovi (bir filialdagi ko‘p o‘qituvchi bitta IP dan kirishi mumkin, shuning uchun keng).
const startHits = new Map();
const START_LIMIT = Number(process.env.START_LIMIT_PER_MIN || 120);
function startLimiter(req, res, next) {
  const t = Date.now();
  const h = startHits.get(clientIp(req));
  if (!h || t - h.first > 60_000) startHits.set(clientIp(req), { first: t, count: 1 });
  else if (++h.count > START_LIMIT) {
    return res.status(429).json({ error: 'So‘rovlar juda ko‘p. Bir daqiqadan keyin qayta urinib ko‘ring.' });
  }
  next();
}
setInterval(() => {
  const t = Date.now();
  for (const [k, v] of startHits) if (t - v.first > 60_000) startHits.delete(k);
  for (const [k, v] of fails) if (t - v.first > 600_000) fails.delete(k);
}, 60_000).unref();

// ------------------------------------------------------------ admin kirish

function loadSecret() {
  if (process.env.SECRET_KEY) return process.env.SECRET_KEY;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, 'secret.key');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(file, 'utf8').trim();
}
const SECRET = loadSecret();
const COOKIE = 'adm';
const SESSION_MS = 12 * 3600 * 1000;

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

function makeToken() {
  const exp = String(Date.now() + SESSION_MS);
  return `${exp}.${sign(exp)}`;
}

function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const good = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return given.length === good.length && crypto.timingSafeEqual(given, good) && Number(exp) > Date.now();
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

const isAdmin = (req) => verifyToken(readCookie(req, COOKIE));

function adminOnly(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'Kirish talab qilinadi' });
}

// Parolni tez-tez taxmin qilishdan himoya: 10 daqiqada 8 ta xato urinish.
const fails = new Map();
function tooManyFails(ip) {
  const f = fails.get(ip);
  return f && f.count >= 8 && Date.now() - f.first < 600_000;
}

app.post('/api/admin/login', async (req, res) => {
  const ip = clientIp(req);
  if (tooManyFails(ip)) return res.status(429).json({ error: 'Juda ko‘p urinish. Bir necha daqiqadan keyin qayta urinib ko‘ring.' });

  const given = Buffer.from(String(req.body?.password ?? ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) {
    const f = fails.get(ip);
    fails.set(ip, !f || Date.now() - f.first > 600_000 ? { count: 1, first: Date.now() } : { ...f, count: f.count + 1 });
    await new Promise((r) => setTimeout(r, 700));
    return res.status(401).json({ error: 'Parol noto‘g‘ri' });
  }
  fails.delete(ip);
  res.cookie(COOKIE, makeToken(), { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_MS, path: '/' });
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => res.json({ admin: isAdmin(req) }));

// ------------------------------------------------------- o‘qituvchi API

app.get('/api/meta', async (req, res) => {
  res.json({
    professions: PROFESSIONS,
    staff_professions: STAFF_PROFESSIONS, // faqat Academic (1-bosqich) topshiradigan kasblar
    subjects: SUBJECTS,
    branches: BRANCHES,
    duration_min: DURATION / 60, // kasb (2-bosqich) testi
    academic_duration_min: ACADEMIC_DURATION / 60, // Academic (1-bosqich) testi
    academic_ready: await academicReady(),
  });
});

app.post('/api/start', startLimiter, async (req, res) => {
  const b = req.body ?? {};
  res.json(await startAttempt({
    fullName: b.full_name, profession: b.profession ?? b.subject, branch: b.branch,
    deviceModel: b.device_model, screen: b.screen,
    ua: req.get('user-agent'), ip: clientIp(req),
  }));
});

app.get('/api/attempt/:token', async (req, res) => {
  const a = await getCurrent(req.params.token);
  if (!a) throw new HttpError(404, 'Topilmadi');
  res.json(attemptState(a));
});

app.post('/api/save', async (req, res) => {
  res.json(await saveAnswers(req.body?.token, req.body?.answers));
});

app.post('/api/next', async (req, res) => {
  res.json(await startNextStage(req.body?.token, { deviceModel: req.body?.device_model, screen: req.body?.screen, ua: req.get('user-agent'), ip: clientIp(req) }));
});

app.post('/api/finish', async (req, res) => {
  res.json(await finishAttempt(req.body?.token, req.body?.answers));
});

// ------------------------------------------------------------ admin API

app.get('/api/admin/results', adminOnly, async (req, res) => {
  res.json({ ...(await queryResults({ ...req.query, limit: 1000 })), subjects: PROFESSIONS, branches: BRANCHES });
});

app.post('/api/admin/attempts/delete', adminOnly, async (req, res) => {
  await deleteAttempt(req.body?.id);
  res.json({ ok: true });
});

app.get('/api/admin/export.xlsx', adminOnly, async (req, res) => {
  const { rows } = await queryResults(req.query);
  const wb = buildResultsWorkbook(rows);
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date()).replace(/[-: ]/g, '').replace(/^(\d{8})(\d{4})$/, '$1_$2');
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="natijalar_${stamp}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

app.get('/api/admin/questions', adminOnly, async (req, res) => {
  res.json({ items: await questionCounts() });
});

app.post('/api/admin/questions/delete', adminOnly, async (req, res) => {
  await deleteSubjectQuestions(req.body?.subject);
  res.json({ ok: true });
});

app.get('/api/admin/template.xlsx', adminOnly, async (req, res) => {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', 'attachment; filename="savollar_shablon.xlsx"');
  await buildTemplateWorkbook().xlsx.write(res);
  res.end();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.post('/api/admin/questions/upload', adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Fayl tanlanmagan');
  let rows;
  try {
    rows = await readFirstSheetRows(req.file.buffer);
  } catch {
    throw new HttpError(400, 'Faylni o‘qib bo‘lmadi. .xlsx formatida yuklang.');
  }
  const { parsed, errors } = parseQuestionRows(rows);
  if (errors.length) {
    throw new HttpError(400, `Faylda ${errors.length} ta xato topildi. Hech narsa yuklanmadi.`, { errors: errors.slice(0, 30) });
  }
  if (!parsed.length) throw new HttpError(400, 'Faylda savollar topilmadi');
  res.json({ ok: true, ...(await insertQuestions(parsed, req.body?.replace === '1')) });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Topilmadi' }));

// -------------------------------------------------------------- frontend

if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), { immutable: true, maxAge: '365d' }));
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.type('text/plain; charset=utf-8').send('Frontend hali yig‘ilmagan. Avval `npm run build` buyrug‘ini ishga tushiring.');
  });
}

// ----------------------------------------------------------------- xatolar

app.use((err, req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Fayl juda katta (8 MB dan oshmasin)' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'So‘rov noto‘g‘ri' });
  console.error(err);
  res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
});

await seedQuestionsIfEmpty();

// Vaqti tugagan urinishlarni fonda yakunlab boradi (har so‘rovda emas).
setInterval(() => {
  sweep().catch((e) => console.error('sweep:', e));
}, 10_000).unref();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nTest platformasi ishga tushdi: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  if (ADMIN_PASSWORD === 'ulugbek1') {
    console.warn('\n!!! DIQQAT: admin paroli standart (ulugbek1). ADMIN_PASSWORD o‘zgaruvchisi bilan almashtiring.\n');
  }
});

// Ko‘p ulanish uchun: keep-alive ulanishlarni proksi (Nginx) dan uzoqroq ushlab turish, sekin mijozlarni uzish.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
server.requestTimeout = 60_000;

// Bitta kutilmagan xato butun serverni yiqitmasin; jarayon menejeri (pm2/systemd) baribir qayta ishga tushiradi.
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));

function shutdown() {
  server.close(() => {
    db.close().catch(() => {}).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 8000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
