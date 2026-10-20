import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { ACADEMIC, SEED_FILE, SUBJECTS } from './config.js';
import { parseQuestionRows } from './questions.js';
import { insertQuestions, totalQuestions } from './service.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const BOARD = 'FF0A1163';

function cellText(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return cellText(v.result);
    if ('text' in v) return String(v.text);
    return '';
  }
  return String(v);
}

function styleHeader(row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BOARD } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  row.height = 28;
}

/** Excel faylining birinchi varag‘ini qatorlar massivi sifatida o‘qiydi. */
export async function readFirstSheetRows(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  const rows = [];
  if (!ws) return rows;
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = Array.from({ length: 8 }, (_, i) => cellText(row.getCell(i + 1).value));
  });
  return Array.from(rows, (r) => r ?? []);
}

/** Baza bo‘sh bo‘lsa, savollar.xlsx dan birinchi marta yuklaydi. */
export async function seedQuestionsIfEmpty() {
  if (!fs.existsSync(SEED_FILE) || (await totalQuestions()) > 0) return;
  const rows = await readFirstSheetRows(fs.readFileSync(SEED_FILE));
  const { parsed, errors } = parseQuestionRows(rows);
  if (errors.length) return console.warn('savollar.xlsx da xatolar bor, yuklanmadi:', errors.slice(0, 5));
  if (parsed.length) {
    await insertQuestions(parsed);
    console.log(`savollar.xlsx dan ${parsed.length} ta savol yuklandi.`);
  }
}

/** Natijalar Excel fayli (Natijalar + Xulosa varaqlari). */
export function buildResultsWorkbook(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Natijalar', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
  ws.columns = [
    { header: '№', width: 5 },
    { header: 'Ism familya', width: 28 },
    { header: 'Kasb', width: 30 },
    { header: 'Bosqich', width: 28 },
    { header: 'Filial', width: 16 },
    { header: 'Qurilma turi', width: 14 },
    { header: 'Qurilma modeli', width: 18 },
    { header: 'Operatsion tizim', width: 16 },
    { header: 'Brauzer', width: 16 },
    { header: 'Boshlagan vaqti', width: 20 },
    { header: 'Tugatgan vaqti', width: 20 },
    { header: 'Davomiyligi', width: 14 },
    { header: 'Davomiyligi (daqiqa)', width: 14 },
    { header: 'To‘g‘ri javoblar', width: 12 },
    { header: 'Jami savollar', width: 10 },
    { header: 'To‘g‘ri (%)', width: 11 },
    { header: 'Holat', width: 13 },
    { header: 'IP manzil', width: 16 },
  ];
  styleHeader(ws.getRow(1));

  rows.forEach((r, i) => {
    const done = r.status === 'finished';
    ws.addRow([
      i + 1, r.full_name, r.subject, r.stage_label, r.branch, r.device_type, r.device_model, r.os, r.browser,
      r.started, r.finished || '—', r.duration, Math.round(r.duration_sec / 6) / 10,
      done ? r.correct : '—', r.total, done ? r.percent : '—',
      done ? 'Yakunlangan' : 'Jarayonda', r.ip,
    ]);
  });
  ws.autoFilter = { from: 'A1', to: `R${Math.max(rows.length + 1, 2)}` };

  // Xulosa varag‘i
  const sm = wb.addWorksheet('Xulosa');
  sm.getColumn(1).width = 40;
  sm.getColumn(2).width = 16;
  sm.getColumn(3).width = 16;
  const fin = rows.filter((r) => r.status === 'finished');
  let at = 1;
  for (const [title, field] of [['Bosqich', 'stage_label'], ['Filial', 'branch']]) {
    sm.getCell(at, 1).value = title;
    sm.getCell(at, 1).font = { bold: true, size: 12 };
    const head = sm.getRow(at + 1);
    head.values = [title, 'Topshirganlar', 'O‘rtacha (%)'];
    styleHeader(head);
    const groups = new Map();
    for (const r of fin) groups.set(r[field], [...(groups.get(r[field]) || []), r.percent]);
    let line = at + 2;
    for (const k of [...groups.keys()].sort()) {
      const list = groups.get(k);
      sm.getRow(line++).values = [k, list.length, Math.round((list.reduce((s, x) => s + x, 0) / list.length) * 10) / 10];
    }
    at = line + 1;
  }
  return wb;
}

/** Savollarni yuklash uchun shablon. */
export function buildTemplateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Savollar');
  ws.columns = [
    { header: 'Fan', width: 34 }, { header: 'Savol', width: 60 },
    { header: 'A', width: 22 }, { header: 'B', width: 22 }, { header: 'C', width: 22 },
    { header: 'D', width: 22 }, { header: 'E', width: 22 }, { header: 'To‘g‘ri javob (A–D)', width: 20 },
  ];
  styleHeader(ws.getRow(1));
  ws.addRow(['Academic', 'Quyidagilardan qaysi biri to‘g‘ri?', 'Birinchi', 'Ikkinchi', 'Uchinchi', 'To‘rtinchi', '', 'A']);
  ws.addRow(['Matematika', '2 + 2 = ?', '3', '4', '5', '6', '', 'B']);
  ws.addRow(['Ingliz tili', 'Choose the correct form: She ___ to school every day.', 'go', 'goes', 'going', 'gone', 'went', 'B']);

  const list = wb.addWorksheet('Fanlar');
  list.getColumn(1).width = 60;
  list.addRow(['Fanlar ro‘yxati (Fan ustunida aynan shunday yozilishi kerak)']);
  [ACADEMIC, ...SUBJECTS].forEach((s) => list.addRow([s]));

  for (let r = 2; r <= 500; r++) {
    ws.getCell(`A${r}`).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`Fanlar!$A$2:$A$${SUBJECTS.length + 2}`],
    };
    ws.getCell(`H${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"A,B,C,D,E"'] };
  }
  return wb;
}
