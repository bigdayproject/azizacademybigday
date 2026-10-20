import { TZ } from './config.js';

export const now = () => Math.floor(Date.now() / 1000);

const dtf = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** 2026-10-20 13:45:12 ko‘rinishida (TZ vaqt mintaqasida). */
export function fmtTs(ts) {
  return ts ? dtf.format(new Date(ts * 1000)) : '';
}

export function fmtDur(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)} daq ${String(s % 60).padStart(2, '0')} s`;
}

/** 'YYYY-MM-DD' kunining TZ dagi yarim kechasi (epoch soniya). */
export function dayStart(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  const guess = Date.UTC(y, m - 1, d) / 1000;
  const parts = Object.fromEntries(dtf.formatToParts(new Date(guess * 1000)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) / 1000;
  return guess - (asUtc - guess);
}

export function norm(s) {
  return String(s ?? '')
    .replace(/[’‘`ʻʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** User-Agent dan qurilma turi, model, tizim va brauzerni ajratadi. */
export function parseUA(ua = '', modelHint = '') {
  const low = ua.toLowerCase();
  let type = 'Kompyuter';
  if (low.includes('ipad') || low.includes('tablet') || (low.includes('android') && !low.includes('mobile'))) type = 'Planshet';
  else if (low.includes('iphone') || low.includes('android') || low.includes('mobile')) type = 'Telefon';

  let os = 'Noma’lum';
  let model = '';
  if (/iphone|ipad|ipod/.test(low)) {
    const m = ua.match(/OS (\d+)[_.](\d+)/);
    os = 'iOS' + (m ? ` ${m[1]}.${m[2]}` : '');
    model = low.includes('iphone') ? 'iPhone' : 'iPad';
  } else if (low.includes('android')) {
    const m = ua.match(/Android ([\d.]+)/);
    os = 'Android' + (m ? ` ${m[1]}` : '');
    const mm = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|;|\))/);
    model = mm ? mm[1].trim() : '';
  } else if (low.includes('windows')) os = 'Windows';
  else if (low.includes('mac os x') || low.includes('macintosh')) os = 'macOS';
  else if (low.includes('cros')) os = 'ChromeOS';
  else if (low.includes('linux')) os = 'Linux';

  const hint = String(modelHint || '').replace(/[^\p{L}\p{N} .\-+/]/gu, '').slice(0, 60).trim();
  if (hint && (model.length < 3 || model.toUpperCase() === 'K')) model = hint;

  let browser = 'Noma’lum';
  if (/edg\/|edga\/|edgios/.test(low)) browser = 'Edge';
  else if (/opr\/|opera/.test(low)) browser = 'Opera';
  else if (low.includes('samsungbrowser')) browser = 'Samsung Internet';
  else if (low.includes('yabrowser')) browser = 'Yandex';
  else if (/firefox\/|fxios/.test(low)) browser = 'Firefox';
  else if (low.includes('telegram')) browser = 'Telegram';
  else if (/chrome\/|crios/.test(low)) browser = 'Chrome';
  else if (low.includes('safari')) browser = 'Safari';

  return { type, model, os, browser };
}
