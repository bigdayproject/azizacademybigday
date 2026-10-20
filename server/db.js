// Ma’lumotlar bazasi: DATABASE_URL berilsa Postgres, aks holda SQLite (node:sqlite).
// Ikkala holatda ham bir xil asinxron interfeys: db.all / db.get / db.run / db.tx.
// So‘rovlarda `?` belgisi ishlatiladi (Postgres uchun avtomatik $1, $2 ... ga aylantiriladi).
import fs from 'node:fs';
import path from 'node:path';
import { DATABASE_SSL, DATABASE_URL, DB_PATH, PG_POOL_MAX } from './config.js';

export const isPg = Boolean(DATABASE_URL);

const RENAMES = [
  ['Matematika metodikasi', 'Mental arifmetika'],
  ['Hamshiralik va birinchi tez tibbiy yordam', 'Hamshiralik'],
];

let impl;

if (isPg) {
  const pg = (await import('pg')).default;
  pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT (vaqt va COUNT) oddiy son bo‘lsin
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: PG_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  });
  pool.on('error', (e) => console.error('Postgres pool:', e.message));

  const conv = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
  const wrap = (q) => ({
    all: async (sql, params = []) => (await q.query(conv(sql), params)).rows,
    get: async (sql, params = []) => (await q.query(conv(sql), params)).rows[0] ?? null,
    run: async (sql, params = []) => ({ changes: (await q.query(conv(sql), params)).rowCount }),
  });
  impl = {
    ...wrap(pool),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const r = await fn(wrap(client));
        await client.query('COMMIT');
        return r;
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch { /* e'tiborsiz */ }
        throw e;
      } finally {
        client.release();
      }
    },
    async close() { await pool.end(); },
  };

  await impl.run(`CREATE TABLE IF NOT EXISTS questions(
    id SERIAL PRIMARY KEY, subject TEXT NOT NULL, text TEXT NOT NULL, options TEXT NOT NULL, correct INTEGER NOT NULL)`);
  await impl.run('CREATE INDEX IF NOT EXISTS idx_q_subject ON questions(subject)');
  await impl.run(`CREATE TABLE IF NOT EXISTS attempts(
    id SERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    branch TEXT NOT NULL,
    started_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    finished_at BIGINT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    payload TEXT NOT NULL,
    key TEXT NOT NULL,
    answers TEXT NOT NULL DEFAULT '{}',
    correct_count INTEGER,
    total INTEGER NOT NULL,
    percent DOUBLE PRECISION,
    device_type TEXT, device_model TEXT, os TEXT, browser TEXT,
    user_agent TEXT, ip TEXT, screen TEXT,
    session TEXT NOT NULL DEFAULT '',
    stage INTEGER NOT NULL DEFAULT 1,
    stages INTEGER NOT NULL DEFAULT 1,
    kind TEXT NOT NULL DEFAULT 'subject')`);
  await impl.run('CREATE INDEX IF NOT EXISTS idx_a_started ON attempts(started_at)');
  await impl.run('CREATE INDEX IF NOT EXISTS idx_a_status ON attempts(status)');
  await impl.run('CREATE INDEX IF NOT EXISTS idx_a_session ON attempts(session, stage)');
} else {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sdb = new DatabaseSync(DB_PATH);
  sdb.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000; PRAGMA synchronous = NORMAL; PRAGMA cache_size = -65536; PRAGMA temp_store = MEMORY; PRAGMA wal_autocheckpoint = 2000;');

  sdb.exec(`
CREATE TABLE IF NOT EXISTS questions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_q_subject ON questions(subject);

CREATE TABLE IF NOT EXISTS attempts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  branch TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress',
  payload TEXT NOT NULL,
  key TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',
  correct_count INTEGER,
  total INTEGER NOT NULL,
  percent REAL,
  device_type TEXT, device_model TEXT, os TEXT, browser TEXT,
  user_agent TEXT, ip TEXT, screen TEXT
);
CREATE INDEX IF NOT EXISTS idx_a_started ON attempts(started_at);
CREATE INDEX IF NOT EXISTS idx_a_status ON attempts(status);
`);

  // Eski bazalar uchun: 2 bosqichli test ustunlari
  const cols = new Set(sdb.prepare('PRAGMA table_info(attempts)').all().map((c) => c.name));
  for (const [name, ddl] of [
    ['session', "TEXT NOT NULL DEFAULT ''"],
    ['stage', 'INTEGER NOT NULL DEFAULT 1'],
    ['stages', 'INTEGER NOT NULL DEFAULT 1'],
    ['kind', "TEXT NOT NULL DEFAULT 'subject'"],
  ]) if (!cols.has(name)) sdb.exec(`ALTER TABLE attempts ADD COLUMN ${name} ${ddl}`);
  sdb.exec('CREATE INDEX IF NOT EXISTS idx_a_session ON attempts(session, stage)');

  const stmts = new Map();
  const stmt = (sql) => {
    let s = stmts.get(sql);
    if (!s) { s = sdb.prepare(sql); stmts.set(sql, s); }
    return s;
  };
  const conn = {
    all: async (sql, params = []) => stmt(sql).all(...params),
    get: async (sql, params = []) => stmt(sql).get(...params) ?? null,
    run: async (sql, params = []) => ({ changes: Number(stmt(sql).run(...params).changes) }),
  };
  // SQLite bitta ulanish: tranzaksiyalar navbat bilan bajariladi
  let chain = Promise.resolve();
  impl = {
    ...conn,
    tx(fn) {
      const p = chain.then(async () => {
        sdb.exec('BEGIN');
        try {
          const r = await fn(conn);
          sdb.exec('COMMIT');
          return r;
        } catch (e) {
          try { sdb.exec('ROLLBACK'); } catch { /* e'tiborsiz */ }
          throw e;
        }
      });
      chain = p.catch(() => {});
      return p;
    },
    async close() {
      try { sdb.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* e'tiborsiz */ }
      sdb.close();
    },
  };
}

// Fan nomlari o‘zgargan: mavjud ma’lumotlarni yangi nomga o‘tkazamiz
for (const [oldName, newName] of RENAMES) {
  await impl.run('UPDATE questions SET subject=? WHERE subject=?', [newName, oldName]);
  await impl.run('UPDATE attempts SET subject=? WHERE subject=?', [newName, oldName]);
}

export const db = impl;
export const tx = (fn) => impl.tx(fn);
