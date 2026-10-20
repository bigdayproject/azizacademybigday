import crypto from 'node:crypto';
import { db, tx } from './db.js';
import {
  ACADEMIC, ACADEMIC_DURATION, BRANCHES, DURATION, GRACE, PROFESSIONS, QUESTIONS_PER_TEST, STAFF_PROFESSIONS, SUBJECTS,
} from './config.js';
import { dayStart, fmtDur, fmtTs, norm, now, parseUA, shuffle } from './util.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ------------------------------------------------------------ baholash

function grade(a) {
  const key = JSON.parse(a.key);
  const answers = JSON.parse(a.answers);
  const total = Object.keys(key).length;
  let correct = 0;
  for (const [qid, right] of Object.entries(key)) if (answers[qid] === right) correct++;
  const percent = total ? Math.round((correct * 100 * 10) / total) / 10 : 0;
  return { correct, total, percent };
}

async function finalize(a, finishedAt, conn = db) {
  const { correct, total, percent } = grade(a);
  const fin = Math.min(finishedAt || now(), a.expires_at);
  await conn.run(
    "UPDATE attempts SET status='finished', finished_at=?, correct_count=?, total=?, percent=? WHERE id=? AND status='in_progress'",
    [fin, correct, total, percent, a.id],
  );
}

/** Vaqti tugagan, lekin yakunlanmagan urinishlarni avtomatik yakunlaydi (taymer va admin so‘rovlarida). */
export async function sweep() {
  const rows = await db.all("SELECT * FROM attempts WHERE status='in_progress' AND expires_at + ? < ?", [GRACE, now()]);
  if (!rows.length) return;
  await tx(async (c) => { for (const a of rows) await finalize(a, a.expires_at, c); });
}

/** Bitta urinishni oladi; vaqti o‘tgan bo‘lsa, shu zahoti yakunlaydi (butun jadvalni skanerlamaydi). */
export async function getAttempt(token) {
  let a = await db.get('SELECT * FROM attempts WHERE token = ?', [String(token ?? '')]);
  if (a && a.status === 'in_progress' && a.expires_at + GRACE < now()) {
    await finalize(a, a.expires_at);
    a = await db.get('SELECT * FROM attempts WHERE id = ?', [a.id]);
  }
  return a;
}

// Urinishning o‘zgarmas qismi (kalit va variantlar soni) xotirada saqlanadi: har saqlashda JSON qayta o‘qilmaydi.
const metaCache = new Map();
const META_MAX = 5000;
function attemptMeta(token, a) {
  let m = metaCache.get(token);
  if (!m) {
    const sizes = Object.fromEntries(JSON.parse(a.payload).map((q) => [String(q.id), q.options.length]));
    m = { key: JSON.parse(a.key), sizes };
    if (metaCache.size >= META_MAX) metaCache.delete(metaCache.keys().next().value);
    metaCache.set(token, m);
  }
  return m;
}

// Savollar fan bo‘yicha xotirada (o‘zgarganda tozalanadi).
const qCache = new Map();
async function questionsOf(subject) {
  let list = qCache.get(subject);
  if (!list) {
    list = (await db.all('SELECT * FROM questions WHERE subject = ? ORDER BY id', [subject])).map((q) => ({
      id: q.id, text: q.text, options: JSON.parse(q.options), correct: q.correct,
    }));
    qCache.set(subject, list);
  }
  return list;
}

/** Academic savollar yuklanganmi (xotiradagi keshdan, har so‘rovda bazaga bormaydi). */
export async function academicReady() {
  return (await questionsOf(ACADEMIC)).length > 0;
}

/** Shu urinishdan keyin 2-bosqich kutilyaptimi (1-bosqich yakunlangan, 2-bosqich hali boshlanmagan)? */
async function nextPending(a) {
  if (a.status !== 'finished' || a.stage >= a.stages) return false;
  return !(await db.get('SELECT 1 AS x FROM attempts WHERE session = ? AND stage = ?', [a.session, a.stage + 1]));
}

export async function attemptState(a) {
  const pending = await nextPending(a);
  return {
    token: a.token,
    full_name: a.full_name,
    subject: a.subject, // tanlangan kasb
    branch: a.branch,
    stage: a.stage,
    stages: a.stages,
    kind: a.kind, // 'academic' | 'subject'
    title: a.kind === 'academic' ? ACADEMIC : a.subject,
    duration_sec: a.expires_at - a.started_at,
    questions: JSON.parse(a.payload),
    answers: JSON.parse(a.answers),
    expires_at: a.expires_at,
    server_now: now(),
    finished: a.status === 'finished',
    next_pending: pending,
    next_title: pending ? a.subject : '',
    next_duration_sec: pending ? DURATION : 0,
  };
}

/** Kalit bo‘yicha urinishning "hozirgi" holatini topadi: 1-bosqich tugab, 2-bosqich boshlangan bo‘lsa, 2-bosqichni qaytaradi. */
export async function getCurrent(token) {
  let a = await getAttempt(token);
  for (let i = 0; a && i < 3 && a.status === 'finished' && a.stage < a.stages; i++) {
    const n = await db.get('SELECT token FROM attempts WHERE session = ? AND stage = ?', [a.session, a.stage + 1]);
    if (!n) break;
    a = await getAttempt(n.token);
  }
  return a;
}

function cleanAnswers(a, incoming) {
  const { key, sizes } = attemptMeta(a.token, a);
  const out = JSON.parse(a.answers);
  if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
    for (const [qid, idx] of Object.entries(incoming)) {
      if (Object.hasOwn(key, qid) && Number.isInteger(idx) && idx >= 0 && idx < (sizes[qid] || 0)) out[qid] = idx;
    }
  }
  return out;
}

// -------------------------------------------------- o‘qituvchi amallari

/** Bitta bosqich uchun urinish yaratadi. */
async function createAttempt({ session, stage, stages, kind, pool, name, profession, branch, deviceModel, screen, ua, ip }) {
  let qs = await questionsOf(pool);
  if (!qs.length) {
    throw new HttpError(400, kind === 'academic' ? 'Academic savollar hali yuklanmagan' : 'Bu kasb bo‘yicha savollar hali yuklanmagan');
  }
  qs = shuffle([...qs]);
  if (QUESTIONS_PER_TEST > 0) qs = qs.slice(0, QUESTIONS_PER_TEST);

  const payload = qs.map((q) => ({ id: q.id, text: q.text, options: q.options }));
  const key = Object.fromEntries(qs.map((q) => [String(q.id), q.correct]));

  const agent = String(ua ?? '').slice(0, 400);
  const dev = parseUA(agent, deviceModel);
  const t = now();
  const token = crypto.randomBytes(18).toString('base64url');
  const dur = kind === 'academic' ? ACADEMIC_DURATION : DURATION;

  await db.run(
    `INSERT INTO attempts(token, full_name, subject, branch, started_at, expires_at, payload, key, total,
       device_type, device_model, os, browser, user_agent, ip, screen, session, stage, stages, kind)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      token, name, profession, branch, t, t + dur, JSON.stringify(payload), JSON.stringify(key), qs.length,
      dev.type, dev.model, dev.os, dev.browser, agent, String(ip ?? ''), String(screen ?? '').replace(/[^0-9x]/g, '').slice(0, 15),
      session, stage, stages, kind,
    ],
  );
  return getAttempt(token);
}

/**
 * Testni boshlaydi.
 * Fan o‘qituvchilari: 1) Academic, 2) kasb (fan) savollari. Tozalik xodimi va Boshqa: faqat Academic.
 * Academic savollar yuklanmagan bo‘lsa, o‘qituvchilar to‘g‘ridan-to‘g‘ri kasb testini ishlaydi.
 */
export async function startAttempt({ fullName, profession, subject, branch, deviceModel, screen, ua, ip }) {
  profession = profession ?? subject;
  const name = String(fullName ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < 5 || !name.includes(' ') || name.length > 80) {
    throw new HttpError(400, 'Ism va familiyangizni to‘liq kiriting');
  }
  if (!PROFESSIONS.includes(profession)) throw new HttpError(400, 'Kasbni tanlang');
  if (!BRANCHES.includes(branch)) throw new HttpError(400, 'Filialni tanlang');

  // Shu odam shu kasb va filialda tugallanmagan test (yoki 2-bosqichga o‘tmay qolgan 1-bosqich) bilan bo‘lsa
  // (brauzer yopilgan, telefon almashgan, kalit yo‘qolgan), yangisini ochmay, o‘shani davom ettiramiz.
  const me = norm(name);
  const open = await db.all(
    "SELECT * FROM attempts WHERE subject = ? AND branch = ? AND (status='in_progress' OR (status='finished' AND stage < stages)) ORDER BY started_at DESC",
    [profession, branch],
  );
  const t = now();
  let same = null;
  for (const r of open) {
    if (norm(r.full_name) !== me) continue;
    if (r.status === 'in_progress') {
      if (r.expires_at + GRACE >= t) { same = r; break; }
    } else if ((r.finished_at || 0) > t - 12 * 3600 && (await nextPending(r))) { // 1-bosqich tugagan, 2-bosqich kutmoqda
      same = r;
      break;
    }
  }
  if (same) return { ...(await attemptState(same)), resumed: true };

  const staff = STAFF_PROFESSIONS.includes(profession);
  const hasAcademic = await academicReady();
  const common = { name, profession, branch, deviceModel, screen, ua, ip, session: crypto.randomBytes(9).toString('base64url') };

  let a;
  if (staff) {
    a = await createAttempt({ ...common, stage: 1, stages: 1, kind: 'academic', pool: ACADEMIC });
  } else if (hasAcademic) {
    if (!(await questionsOf(profession)).length) throw new HttpError(400, 'Bu kasb bo‘yicha savollar hali yuklanmagan');
    a = await createAttempt({ ...common, stage: 1, stages: 2, kind: 'academic', pool: ACADEMIC });
  } else {
    a = await createAttempt({ ...common, stage: 1, stages: 1, kind: 'subject', pool: profession });
  }
  return attemptState(a);
}

/** 1-bosqich tugagach, 2-bosqichni (kasb testi) boshlaydi. Qayta chaqirilsa, mavjud 2-bosqichni qaytaradi. */
export async function startNextStage(token, { deviceModel, screen, ua, ip } = {}) {
  const a = await getAttempt(token);
  if (!a) throw new HttpError(404, 'Topilmadi');
  if (a.stage >= a.stages) throw new HttpError(400, 'Keyingi bosqich yo‘q');
  if (a.status !== 'finished') throw new HttpError(400, 'Avval 1-bosqichni yakunlang');
  const existing = await db.get('SELECT token FROM attempts WHERE session = ? AND stage = ?', [a.session, a.stage + 1]);
  if (existing) return attemptState(await getAttempt(existing.token));
  const n = await createAttempt({
    session: a.session, stage: a.stage + 1, stages: a.stages, kind: 'subject', pool: a.subject,
    name: a.full_name, profession: a.subject, branch: a.branch, deviceModel: deviceModel ?? a.device_model, screen: screen ?? a.screen, ua: ua ?? a.user_agent, ip: ip ?? a.ip,
  });
  return attemptState(n);
}

export async function saveAnswers(token, answers) {
  const a = await getAttempt(token);
  if (!a) throw new HttpError(404, 'Topilmadi');
  if (a.status === 'finished') return { finished: true };
  const next = JSON.stringify(cleanAnswers(a, answers));
  if (next !== a.answers) await db.run('UPDATE attempts SET answers = ? WHERE id = ?', [next, a.id]);
  return { ok: true, server_now: now() };
}

export async function finishAttempt(token, answers) {
  let a = await getAttempt(token);
  if (!a) throw new HttpError(404, 'Topilmadi');
  if (a.status === 'in_progress') {
    const merged = JSON.stringify(cleanAnswers(a, answers));
    await tx(async (c) => {
      await c.run('UPDATE attempts SET answers = ? WHERE id = ?', [merged, a.id]);
      a = await c.get('SELECT * FROM attempts WHERE id = ?', [a.id]);
      await finalize(a, undefined, c);
    });
  }
  return {
    ok: true,
    message: 'Natijangiz qabul qilindi',
    next_pending: await nextPending(await db.get('SELECT * FROM attempts WHERE id = ?', [a.id])),
  };
}

// ------------------------------------------------------------- admin

function rowDict(a) {
  const t = now();
  const finished = a.status === 'finished';
  const dur = (finished ? a.finished_at : Math.min(t, a.expires_at)) - a.started_at;
  return {
    id: a.id,
    full_name: a.full_name,
    subject: a.subject, // kasb
    branch: a.branch,
    stage: a.stage,
    stages: a.stages,
    kind: a.kind,
    stage_label: a.kind === 'academic' ? '1-bosqich: Academic' : a.stages > 1 ? `${a.stage}-bosqich: ${a.subject}` : `Kasb testi: ${a.subject}`,
    started: fmtTs(a.started_at),
    finished: fmtTs(a.finished_at),
    duration_sec: dur,
    duration: fmtDur(dur),
    remaining: finished ? '' : fmtDur(a.expires_at - t),
    remaining_sec: finished ? 0 : Math.max(0, a.expires_at - t),
    answered: Object.keys(JSON.parse(a.answers || '{}')).length,
    correct: a.correct_count,
    total: a.total,
    percent: a.percent,
    status: a.status,
    device_type: a.device_type || '',
    device_model: a.device_model || '',
    os: a.os || '',
    browser: a.browser || '',
    ip: a.ip || '',
    screen: a.screen || '',
  };
}

export async function queryResults(f = {}) {
  await sweep();
  const where = [];
  const params = [];
  if (f.subject) { where.push('subject = ?'); params.push(f.subject); }
  if (f.branch) { where.push('branch = ?'); params.push(f.branch); }
  if (f.kind === 'academic' || f.kind === 'subject') { where.push('kind = ?'); params.push(f.kind); }
  if (f.status === 'in_progress' || f.status === 'finished') { where.push('status = ?'); params.push(f.status); }
  const from = f.date_from && dayStart(f.date_from);
  const to = f.date_to && dayStart(f.date_to);
  if (from) { where.push('started_at >= ?'); params.push(from); }
  if (to) { where.push('started_at < ?'); params.push(to + 86400); }

  // Og‘ir ustunlar (savollar matni, javoblar kaliti) o‘qilmaydi; javoblar (kichik JSON) soni sanaladi.
  const sql = `SELECT id, full_name, subject, branch, stage, stages, kind, started_at, expires_at, finished_at, status,
      correct_count, total, percent, device_type, device_model, os, browser, ip, screen, answers
    FROM attempts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY started_at DESC`;
  let rows = (await db.all(sql, params)).map(rowDict);
  if (f.q && String(f.q).trim()) {
    const q = norm(f.q);
    rows = rows.filter((r) => norm(r.full_name).includes(q));
  }

  const fin = rows.filter((r) => r.status === 'finished');
  const avg = (list) => (list.length ? Math.round((list.reduce((s, r) => s + r.percent, 0) / list.length) * 10) / 10 : null);
  // O‘rtacha natijalar: avval Academic (barcha kasblar), so‘ng har bir kasb bo‘yicha 2-bosqich (kasb testi)
  const bySubject = [
    { subject: ACADEMIC, list: fin.filter((r) => r.kind === 'academic') },
    ...SUBJECTS.map((s) => ({ subject: s, list: fin.filter((r) => r.kind === 'subject' && r.subject === s) })),
  ].map(({ subject, list }) => ({ subject, count: list.length, avg_percent: avg(list) })).filter((x) => x.count > 0);

  const shown = f.limit > 0 && rows.length > f.limit ? rows.slice(0, f.limit) : rows;
  return {
    rows: shown,
    truncated: shown.length < rows.length,
    stats: {
      total: rows.length,
      in_progress: rows.length - fin.length,
      finished: fin.length,
      avg_percent: avg(fin),
    },
    by_subject: bySubject,
  };
}

export async function deleteAttempt(id) {
  await db.run('DELETE FROM attempts WHERE id = ?', [Number(id) || 0]);
}

// ----------------------------------------------------- savollar (admin)

export async function questionCounts() {
  const counts = Object.fromEntries(
    (await db.all('SELECT subject, COUNT(*) AS c FROM questions GROUP BY subject')).map((r) => [r.subject, Number(r.c)]),
  );
  return [ACADEMIC, ...SUBJECTS].map((subject) => ({ subject, count: counts[subject] || 0, academic: subject === ACADEMIC }));
}

export async function deleteSubjectQuestions(subject) {
  if (subject !== ACADEMIC && !SUBJECTS.includes(subject)) throw new HttpError(400, 'Fan topilmadi');
  await db.run('DELETE FROM questions WHERE subject = ?', [subject]);
  qCache.clear();
}

export async function totalQuestions() {
  return Number((await db.get('SELECT COUNT(*) AS c FROM questions')).c);
}

/** Savollarni bazaga yozadi. `replace` bo‘lsa, faylda uchragan fanlarning eski savollari o‘chiriladi. */
export async function insertQuestions(parsed, replace = false) {
  await tx(async (c) => {
    if (replace) {
      for (const s of new Set(parsed.map((p) => p.subject))) await c.run('DELETE FROM questions WHERE subject = ?', [s]);
    }
    for (const p of parsed) {
      await c.run('INSERT INTO questions(subject, text, options, correct) VALUES(?,?,?,?)', [p.subject, p.text, JSON.stringify(p.options), p.correct]);
    }
  });
  qCache.clear();
  return { added: parsed.length, subjects: new Set(parsed.map((p) => p.subject)).size };
}
