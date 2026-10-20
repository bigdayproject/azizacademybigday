import { ACADEMIC, SUBJECTS } from './config.js';
import { norm } from './util.js';

const SUBJECT_MAP = new Map([...SUBJECTS, ACADEMIC].map((s) => [norm(s), s]));
for (const alias of ['akademik', 'academy', 'akademiya']) SUBJECT_MAP.set(alias, ACADEMIC);
// eski nomlar (eski Excel fayllar uchun)
SUBJECT_MAP.set(norm('Matematika metodikasi'), 'Mental arifmetika');
SUBJECT_MAP.set(norm('Hamshiralik va birinchi tez tibbiy yordam'), 'Hamshiralik');

const LETTERS = {
  A: 0, B: 1, C: 2, D: 3, E: 4,
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4,
  'А': 0, 'В': 1, 'С': 2, 'Д': 3, 'Е': 4, // kirill harflari
};

/**
 * Excel qatorlaridan savollarni o‘qiydi. `rows` — qatorlar massivi (har biri massiv).
 *
 * Yangi format: Fan | Savol | A | B | C | D | E | To‘g‘ri javob
 * Eski format:  Fan | Savol | A | B | C | D | To‘g‘ri javob   (E ustuni yo‘q)
 * Format sarlavhadan aniqlanadi: 7-ustun sarlavhasi "E" bo‘lsa — yangi format.
 *
 * Qaytaradi: { parsed: [{subject, text, options, correct}], errors: [string] }
 */
export function parseQuestionRows(rows) {
  const cellAt = (row, i) => (row && row[i] != null ? String(row[i]).trim() : '');
  const newLayout = rows.length > 0 && norm(cellAt(rows[0], 6)) === 'e';
  const parsed = [];
  const errors = [];

  rows.forEach((row, idx) => {
    const n = idx + 1;
    const c = Array.from({ length: 8 }, (_, i) => cellAt(row, i));
    if (!c.some(Boolean)) return;
    if (n === 1 && norm(c[0]) === 'fan') return;

    const [subjRaw, text, a, b, cc, d] = c;
    const e = newLayout ? c[6] : '';
    const corr = newLayout ? c[7] : c[6];

    const subject = SUBJECT_MAP.get(norm(subjRaw));
    if (!subject) return errors.push(`${n}-qator: fan nomi noto‘g‘ri (“${subjRaw}”)`);
    if (!text) return errors.push(`${n}-qator: savol matni bo‘sh`);

    const letter = LETTERS[corr.trim().toUpperCase().slice(0, 1)];
    if (letter === undefined) return errors.push(`${n}-qator: to‘g‘ri javob A, B, C, D yoki E bo‘lishi kerak (“${corr}”)`);

    const raw = [a, b, cc, d, e];
    if (!raw[letter]) return errors.push(`${n}-qator: to‘g‘ri javob sifatida ko‘rsatilgan variant bo‘sh`);

    const filled = raw.map((o, i) => [o, i]).filter(([o]) => o);
    if (filled.length < 2) return errors.push(`${n}-qator: kamida 2 ta variant bo‘lishi kerak`);

    parsed.push({
      subject,
      text,
      options: filled.map(([o]) => o),
      correct: filled.findIndex(([, i]) => i === letter),
    });
  });

  return { parsed, errors };
}
