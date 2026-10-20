/** Qisqa konfetti portlashi (canvas). Harakatni kamaytirish yoqilgan bo‘lsa, ishlamaydi. */
export function burst({ x = window.innerWidth / 2, y = window.innerHeight / 3, count = 90 } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);

  const colors = ['#f4c93a', '#2356d8', '#d5413b', '#1e9a62', '#eef3ec'];
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 9;
    return {
      x, y,
      vx: Math.cos(a) * s * (0.6 + Math.random()),
      vy: Math.sin(a) * s - 6,
      w: 5 + Math.random() * 7, h: 3 + Math.random() * 5,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      col: colors[(Math.random() * colors.length) | 0],
    };
  });

  const t0 = performance.now();
  let last = t0;
  function frame(t) {
    const dt = Math.min(32, t - last) / 16;
    last = t;
    g.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const age = (t - t0) / 2200;
    let alive = false;
    for (const p of parts) {
      p.vy += 0.28 * dt;
      p.vx *= 0.992;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      if (age < 1 && p.y < window.innerHeight + 30) {
        alive = true;
        g.save();
        g.globalAlpha = 1 - Math.max(0, age - 0.6) / 0.4;
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.fillStyle = p.col;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      }
    }
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
