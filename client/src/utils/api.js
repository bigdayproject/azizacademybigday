async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, { credentials: 'same-origin', ...options });
  } catch {
    const err = new Error('Serverga ulanib bo‘lmadi. Internetni tekshiring.');
    err.network = true;
    throw err;
  }
  let data = {};
  try {
    data = await res.json();
  } catch { /* javob JSON emas */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Xatolik yuz berdi');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }),
  upload: (url, formData) => request(url, { method: 'POST', body: formData }),
};
