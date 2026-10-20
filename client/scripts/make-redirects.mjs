// Netlify build: /api so‘rovlarini Railway’dagi serverga yo‘naltiradigan _redirects faylini yaratadi.
import fs from 'node:fs';

const api = (process.env.API_URL || '').trim().replace(/\/+$/, '');
if (!/^https?:\/\/.+/.test(api)) {
  console.error('\nXATO: Netlify’da API_URL o‘zgaruvchisi berilmagan (masalan https://test-xxxx.up.railway.app)\n');
  process.exit(1);
}
fs.writeFileSync('dist/_redirects', `/api/*  ${api}/api/:splat  200!\n/*  /index.html  200\n`);
console.log('dist/_redirects yaratildi ->', api);
