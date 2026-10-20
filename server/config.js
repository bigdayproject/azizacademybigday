import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'data.db');
// Postgres: DATABASE_URL berilsa ishlatiladi (Railway shuni o‘zi beradi). Berilmasa, SQLite fayl (DB_PATH).
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const DATABASE_SSL = process.env.DATABASE_SSL === 'true'; // tashqi (public) Postgres manzili uchun
export const PG_POOL_MAX = Number(process.env.PG_POOL_MAX || 10);
export const DIST_DIR = path.join(ROOT, 'client', 'dist');
export const SEED_FILE = path.join(ROOT, 'savollar.xlsx');

export const PORT = Number(process.env.PORT || 3000);
export const TZ = process.env.TZ_NAME || 'Asia/Tashkent';
export const DURATION = Number(process.env.TEST_DURATION_MIN || 60) * 60; // kasb bo‘yicha (2-bosqich) test, soniya
export const ACADEMIC_DURATION = Number(process.env.ACADEMIC_DURATION_MIN || 60) * 60; // Academic (1-bosqich) test, soniya
export const GRACE = 45; // tarmoq kechikishi uchun qo‘shimcha soniyalar
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ulugbek1';
export const QUESTIONS_PER_TEST = Number(process.env.QUESTIONS_PER_TEST || 0); // 0 = barcha savollar

export const SUBJECTS = [
  'Kimyo', 'Matematika', 'Ingliz tili', 'Rus tili', 'Turk tili', 'Arab tili',
  'Mental arifmetika', 'Ona tili metodikasi', 'Tarbiya fani', 'Tarix',
  'Biologiya', 'Hamshiralik', 'Koreys tili',
  'IT Frontend', 'IT Backend',
];

// Academic savollar bazada shu nom bilan saqlanadi (1-bosqich, hamma kasblar uchun umumiy)
export const ACADEMIC = 'Academic';

// Faqat 1-bosqich (Academic) topshiradigan kasblar
export const STAFF_PROFESSIONS = ['Tozalik xodimi', 'Boshqa'];

// Tanlanadigan kasblar: fan o‘qituvchilari (2 bosqich) + xodimlar (1 bosqich)
export const PROFESSIONS = [...SUBJECTS, ...STAFF_PROFESSIONS];

export const BRANCHES = [
  'Niyozbosh', 'Xalqabod', 'Gulbahor', 'Kasblar', 'Kids1', 'Kids2',
  'Do’stobod', 'Olmazor', 'Chinoz', 'Krasin', 'Pitiletka', 'Qo’rg’oncha',
  'Kids 3', 'Oqqo’rg’on', 'Qo’shyog’och',
];
