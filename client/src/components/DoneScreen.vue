<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { burst } from '../utils/confetti.js';

const router = useRouter();
onMounted(() => setTimeout(() => burst(), 500));
</script>

<template>
  <main class="wrap">
    <section class="done paper margin" role="status">
      <div class="seal" aria-hidden="true">
        <svg viewBox="0 0 80 80">
          <circle class="c" cx="40" cy="40" r="34" pathLength="1" />
          <path class="t" d="M24 42 L35 53 L57 29" pathLength="1" />
        </svg>
      </div>
      <h1>Natijangiz qabul qilindi</h1>
      <p>Ishtirokingiz uchun rahmat. Javoblaringiz saqlandi, natijani admin ko‘radi.</p>
      <button class="btn btn-marker big" type="button" @click="router.push('/')">Bosh sahifaga qaytish</button>
    </section>
  </main>
</template>

<style scoped>
.wrap { min-height: 100dvh; display: grid; place-items: center; padding: 20px 16px; }
.done {
  width: 100%; max-width: 560px; padding: 44px 24px 36px 36px; text-align: center; display: grid; justify-items: center; gap: 16px;
  animation: land 0.9s var(--ease-out) both;
}
@media (min-width: 700px) { .done { padding: 52px 44px 44px 84px; } }
h1 { font-size: clamp(1.9rem, 6vw, 2.6rem); font-weight: 800; }
p { color: var(--ink-soft); max-width: 26em; }
.btn { margin-top: 10px; }

.seal { width: 104px; height: 104px; margin-bottom: 4px; }
.seal svg { width: 100%; height: 100%; overflow: visible; }
.c { fill: #e9f8f0; stroke: var(--green); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; transform: rotate(-90deg); transform-origin: center; animation: draw 0.7s var(--ease-out) 0.35s forwards; }
.t { fill: none; stroke: var(--green); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 0.45s var(--ease-out) 0.95s forwards; }
.seal { animation: seal-pop 0.5s var(--ease-spring) 1.3s both; }

@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes land {
  0% { opacity: 0; transform: translateY(-46px) rotate(-3.5deg); }
  55% { opacity: 1; transform: translateY(8px) rotate(0.8deg); }
  100% { transform: none; }
}
@keyframes seal-pop { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } }
</style>
