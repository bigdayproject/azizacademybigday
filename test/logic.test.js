// Mantiq sinovlari. Ishga tushirish: npm test
// (ROWS_JSON o‘zgaruvchisi berilmasa, savollar.xlsx faylini exceljs orqali o‘qiydi)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-'));
process.env.DATA_DIR = tmp;
process.env.DB_PATH = path.join(tmp, 't.db');
// DATABASE_URL berilsa, sinovlar Postgres bilan ishlaydi (bo‘sh baza kerak)

const { parseQuestionRows } = await import('../server/questions.js');
const svc = await import('../server/service.js');
const { parseUA, dayStart, fmtTs, norm } = await import('../server/util.js');
const { db } = await import('../server/db.js');
const { SUBJECTS } = await import('../server/config.js');

let seedRows;
if (process.env.ROWS_JSON) {
  seedRows = JSON.parse(fs.readFileSync(process.env.ROWS_JSON, 'utf8'));
} else {
  const { readFirstSheetRows } = await import('../server/excel.js');
  seedRows = await readFirstSheetRows(fs.readFileSync(new URL('../savollar.xlsx', import.meta.url)));
}

test.after(() => db.close());

const HEAD8 = ['Fan', 'Savol', 'A', 'B', 'C', 'D', 'E', 'To‘g‘ri javob'];
const UA = 'Mozilla/5.0 (Linux; Android 13; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const start = (o = {}) => svc.startAttempt({
  fullName: 'Aliyev Vali', subject: 'Matematika', branch: 'Do’stobod', deviceModel: '', screen: '390x844', ua: UA, ip: '1.2.3.4', ...o,
});
const keyOf = async (token) => JSON.parse((await db.get('SELECT key FROM attempts WHERE token = ?', [token])).key);

test('savollar.xlsx: 15 fan x 30 savol, xatosiz', async () => {
  const { parsed, errors } = parseQuestionRows(seedRows);
  assert.deepEqual(errors, []);
  assert.equal(parsed.length, 470);
  assert.equal(parsed.filter((p) => p.subject === 'Academic').length, 20, 'Academic 20 ta');
  for (const s of SUBJECTS) assert.equal(parsed.filter((p) => p.subject === s).length, 30, s);
  const eng = parsed.filter((p) => p.subject === 'Ingliz tili');
  assert.ok(parsed.every((p) => p.options.length === 4), 'barcha savollar aynan 4 variantli bo‘lishi kerak');
  assert.ok(eng.length === 30);
  assert.ok(parsed.every((p) => p.correct >= 0 && p.correct < p.options.length));
  (await svc.insertQuestions(parsed));
  assert.equal((await svc.totalQuestions()), 470);
  // keyingi testlar bir bosqichli oqimni tekshiradi: Academic ni vaqtincha olib tashlaymiz
  await db.run("DELETE FROM questions WHERE subject='Academic'");
});

test('savollarni o‘qish: xatolar va eski 7 ustunli format', async () => {
  const bad = [
    ['Fan', 'Savol', 'A', 'B', 'C', 'D', 'E', 'To‘g‘ri'],
    ['Fizika', '?', '1', '2', '3', '4', '', 'A'],
    ['Matematika', '2+2', '3', '4', '5', '6', '', 'Z'],
    ['Matematika', '', '3', '4', '', '', '', 'A'],
    ['Matematika', 'x', '3', '', '', '', '', 'B'],
  ];
  const r = parseQuestionRows(bad);
  assert.equal(r.parsed.length, 0);
  assert.equal(r.errors.length, 4);

  const legacy = [
    ['Fan', 'Savol', 'A', 'B', 'C', 'D', 'To‘g‘ri javob'],
    ['Matematika', '2+2', '3', '4', '5', '6', 'b'],
    ['Ingliz tili', 'She ___ home', 'go', 'goes', 'going', '', 'C'],
  ];
  const l = parseQuestionRows(legacy);
  assert.deepEqual(l.errors, []);
  assert.equal(l.parsed[0].correct, 1);
  assert.equal(l.parsed[1].options.length, 3);
  // bo‘sh variant oralig‘ida to‘g‘ri indeks
  const gap = parseQuestionRows([HEAD8, ['Matematika', 'q', 'a', '', 'c', 'd', '', 'C']]);
  assert.deepEqual(gap.parsed[0].options, ['a', 'c', 'd']);
  assert.equal(gap.parsed[0].correct, 1);
});

test('testni boshlash: tekshiruvlar', async () => {
  await assert.rejects(() => start({ fullName: 'Vali' }), /to‘liq/);
  await assert.rejects(() => start({ subject: 'Fizika' }), /Kasbni/);
  await assert.rejects(() => start({ branch: 'Yo‘q' }), /Filialni/);
  await db.run("DELETE FROM questions WHERE subject='Kimyo'");
  await assert.rejects(() => start({ subject: 'Kimyo' }), /yuklanmagan/);
  const q = parseQuestionRows(seedRows).parsed.filter((p) => p.subject === 'Kimyo');
  (await svc.insertQuestions(q));
});

test('to‘liq oqim: javob, saqlash, tiklash, yakunlash, foiz, qurilma', async () => {
  const st = (await start());
  assert.equal(st.questions.length, 30);
  assert.ok(!JSON.stringify(st).includes('correct'), 'to‘g‘ri javoblar yashirin bo‘lishi kerak');
  assert.ok(st.expires_at - st.server_now >= 3598 && st.expires_at - st.server_now <= 3600);

  const key = (await keyOf(st.token));
  const answers = {};
  st.questions.forEach((q, i) => { answers[q.id] = i < 21 ? key[q.id] : (key[q.id] + 1) % q.options.length; });
  assert.deepEqual((await svc.saveAnswers(st.token, answers)).ok, true);
  assert.equal(Object.keys((await svc.attemptState((await svc.getAttempt(st.token)))).answers).length, 30);

  await new Promise((r) => setTimeout(r, 1100));
  assert.equal((await svc.finishAttempt(st.token, answers)).message, 'Natijangiz qabul qilindi');
  assert.equal((await svc.finishAttempt(st.token, {})).ok, true); // qayta yakunlash zarar qilmaydi
  assert.deepEqual((await svc.saveAnswers(st.token, {})), { finished: true });

  const { rows, stats } = (await svc.queryResults({}));
  const r = rows.find((x) => x.status === 'finished');
  assert.equal(r.percent, 70);
  assert.equal(r.correct, 21);
  assert.equal(r.total, 30);
  assert.deepEqual([r.device_type, r.device_model, r.os, r.browser], ['Telefon', 'SM-A525F', 'Android 13', 'Chrome']);
  assert.equal(r.ip, '1.2.3.4');
  assert.ok(r.duration_sec >= 1);
  assert.equal(stats.finished, 1);
});

test('xavfsizlik: prototip kalitlari va noto‘g‘ri indekslar e’tiborsiz', async () => {
  const st = (await start({ subject: 'Tarix' }));
  (await svc.saveAnswers(st.token, { constructor: 1, __proto__: 2, toString: 0, [st.questions[0].id]: 99, [st.questions[1].id]: -1 }));
  assert.deepEqual((await svc.attemptState((await svc.getAttempt(st.token)))).answers, {});
  await assert.rejects(() => svc.saveAnswers('yoq-token', {}), /Topilmadi/);
});

test('vaqti tugagan test avtomatik yakunlanadi, ishlayotganlar ko‘rinadi', async () => {
  const a = (await start({ fullName: 'Karimov Anvar', branch: 'Olmazor', subject: 'Biologiya' }));
  const t = Math.floor(Date.now() / 1000);
  await db.run('UPDATE attempts SET expires_at=?, started_at=? WHERE token=?', [t - 100, t - 3700, a.token]);
  const live = (await start({ fullName: 'Rustamov Bobur', branch: 'Gulbahor', subject: 'Tarix' }));

  const all = (await svc.queryResults({}));
  const k = all.rows.find((x) => x.full_name === 'Karimov Anvar');
  assert.equal(k.status, 'finished');
  assert.equal(k.duration_sec, 3600);
  assert.ok(all.rows.find((x) => x.full_name === 'Rustamov Bobur').status === 'in_progress');
  assert.ok(all.stats.in_progress >= 1);
  assert.ok(live.token);
});

test('filtrlar va qidiruv', async () => {
  assert.equal((await svc.queryResults({ branch: 'Olmazor' })).rows.length, 1);
  assert.equal((await svc.queryResults({ q: 'KARIMOV' })).rows.length, 1);
  assert.equal((await svc.queryResults({ subject: 'Biologiya', status: 'finished' })).rows.length, 1);
  assert.equal((await svc.queryResults({ date_from: '2020-01-01', date_to: '2020-01-02' })).rows.length, 0);
  const today = fmtTs(Math.floor(Date.now() / 1000)).slice(0, 10);
  assert.ok((await svc.queryResults({ date_from: today, date_to: today })).rows.length >= 3);
  assert.ok((await svc.queryResults({})).by_subject.length >= 2);
});

test('savollarni almashtirish va o‘chirish', async () => {
  const rows = [HEAD8, ['Matematika', 'Yangi savol', '1', '2', '3', '4', '', 'D']];
  const { parsed } = parseQuestionRows(rows);
  assert.deepEqual((await svc.insertQuestions(parsed, true)), { added: 1, subjects: 1 });
  assert.equal((await svc.questionCounts()).find((x) => x.subject === 'Matematika').count, 1);
  (await svc.deleteSubjectQuestions('Matematika'));
  assert.equal((await svc.questionCounts()).find((x) => x.subject === 'Matematika').count, 0);
  await assert.rejects(() => svc.deleteSubjectQuestions('Fizika'), /topilmadi/);
});

test('yordamchilar: User-Agent, sana, matn', async () => {
  assert.equal(parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit Safari/604').os, 'iOS 17.2');
  assert.equal(parseUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537').type, 'Kompyuter');
  assert.equal(parseUA('Mozilla/5.0 (Linux; Android 14; K) Chrome/120 Mobile Safari/537', 'Pixel 8').model, 'Pixel 8');
  assert.equal(parseUA('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120 Safari/537').browser, 'Edge');
  assert.equal(new Date(dayStart('2026-10-20') * 1000).toISOString(), '2026-10-19T19:00:00.000Z'); // Toshkent UTC+5
  assert.equal(norm('  Do’stobod  '), "do'stobod");
});

test('qaytib kirganda tugallanmagan test davom ettiriladi (yangisi ochilmaydi)', async () => {
  const a = (await start({ fullName: 'Qayta Kirgan', subject: 'Tarix' }));
  (await svc.saveAnswers(a.token, { [a.questions[0].id]: 1 }));
  const b = (await start({ fullName: '  qayta   KIRGAN ', subject: 'Tarix' }));
  assert.equal(b.token, a.token);
  assert.equal(b.resumed, true);
  assert.equal(b.answers[a.questions[0].id], 1);
  assert.deepEqual(b.questions.map((q) => q.id), a.questions.map((q) => q.id));
  // boshqa fan alohida test
  assert.notEqual((await start({ fullName: 'Qayta Kirgan', subject: 'Kimyo' })).token, a.token);
  // yakunlangach yangi urinish ochiladi
  (await svc.finishAttempt(a.token, {}));
  assert.notEqual((await start({ fullName: 'Qayta Kirgan', subject: 'Tarix' })).token, a.token);
});

test('2 bosqichli test: Academic → kasb; xodimlar faqat Academic', async () => {
  const acad = parseQuestionRows([
    HEAD8,
    ...Array.from({ length: 5 }, (_, i) => ['Academic', `Academic savol ${i + 1}`, 'a', 'b', 'c', 'd', '', 'B']),
  ]);
  assert.deepEqual(acad.errors, []);
  // oldingi sinovlar ba’zi fan savollarini o‘zgartirgan bo‘lishi mumkin: asl savollarni qayta yuklaymiz
  const seed = parseQuestionRows(seedRows).parsed;
  for (const s of ['Matematika', 'Kimyo']) {
    (await svc.deleteSubjectQuestions(s));
    (await svc.insertQuestions(seed.filter((p) => p.subject === s)));
  }

  // Academic yo‘q: xodim test ololmaydi, o‘qituvchi esa to‘g‘ridan-to‘g‘ri kasb testini ishlaydi
  await assert.rejects(() => start({ fullName: 'Tozalik Xodimi', subject: 'Tozalik xodimi' }), /Academic savollar hali yuklanmagan/);
  const direct = (await start({ fullName: 'Faqat Fan Kishi', subject: 'Kimyo' }));
  assert.equal(direct.kind, 'subject');
  assert.equal(direct.stages, 1);
  (await svc.finishAttempt(direct.token, {}));

  (await svc.insertQuestions(acad.parsed));
  try {
    // o‘qituvchi: 1-bosqich Academic
    const a1 = (await start({ fullName: 'Ikki Bosqich', subject: 'Matematika' }));
    assert.equal(a1.stage, 1);
    assert.equal(a1.stages, 2);
    assert.equal(a1.kind, 'academic');
    assert.equal(a1.questions.length, 5);
    assert.ok(a1.questions.every((q) => q.text.startsWith('Academic savol')));
    const fin1 = (await svc.finishAttempt(a1.token, { [a1.questions[0].id]: 1 }));
    assert.equal(fin1.next_pending, true);

    // chiqib ketib qaytsa: 2-bosqich kutayotgan oynaga tushadi
    const back = (await start({ fullName: ' ikki   bosqich ', subject: 'Matematika' }));
    assert.equal(back.resumed, true);
    assert.equal(back.finished, true);
    assert.equal(back.next_pending, true);
    assert.equal(back.next_title, 'Matematika');

    // 2-bosqich (kasb testi), takror chaqirilsa shu bosqich qaytadi
    const a2 = (await svc.startNextStage(a1.token));
    assert.equal(a2.stage, 2);
    assert.equal(a2.kind, 'subject');
    assert.equal(a2.questions.length, 30);
    assert.equal((await svc.startNextStage(a1.token)).token, a2.token);
    assert.equal((await svc.getCurrent(a1.token)).token, a2.token);
    assert.equal((await start({ fullName: 'Ikki Bosqich', subject: 'Matematika' })).token, a2.token);
    await assert.rejects(() => svc.startNextStage(a2.token), /Keyingi bosqich yo‘q/);
    assert.equal((await svc.finishAttempt(a2.token, {})).next_pending, false);

    // natijalar: ikkala bosqich alohida qatorda, bosqich nomi bilan
    const res = (await svc.queryResults({}));
    const mine = res.rows.filter((r) => r.full_name === 'Ikki Bosqich');
    assert.deepEqual(mine.map((r) => r.stage_label).sort(), ['1-bosqich: Academic', '2-bosqich: Matematika']);
    assert.ok(res.by_subject.some((x) => x.subject === 'Academic'));
    assert.equal((await svc.queryResults({ kind: 'academic' })).rows.every((r) => r.kind === 'academic'), true);

    // yakunlangach yangi urinish yangi sessiya bo‘ladi
    assert.notEqual((await start({ fullName: 'Ikki Bosqich', subject: 'Matematika' })).token, a1.token);

    // xodimlar: faqat Academic
    for (const prof of ['Tozalik xodimi', 'Boshqa']) {
      const s = (await start({ fullName: 'Oddiy Xodim', subject: prof }));
      assert.equal(s.stages, 1);
      assert.equal(s.kind, 'academic');
      assert.equal((await svc.finishAttempt(s.token, {})).next_pending, false);
      await assert.rejects(() => svc.startNextStage(s.token), /Keyingi bosqich yo‘q/);
    }
    await assert.rejects(() => start({ fullName: 'Noto‘g‘ri Kasb', subject: 'Direktor' }), /Kasbni tanlang/);
  } finally {
    (await svc.deleteSubjectQuestions('Academic'));
  }
});
