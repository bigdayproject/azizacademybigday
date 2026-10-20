<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../utils/api.js';
import Logo from '../components/Logo.vue';
import ChalkBackdrop from '../components/ChalkBackdrop.vue';
import HeroEmblem from '../components/HeroEmblem.vue';

const subjects = ref([]);

onMounted(async () => {
  try {
    const m = await api.get('/api/meta');
    subjects.value = m.professions || m.subjects || [];
  } catch { /* ma’lumot kelmasa, fanlar ro‘yxati ko‘rsatilmaydi */ }
});
</script>

<template>
  <main class="home">
    <ChalkBackdrop />
    <div class="stripes" aria-hidden="true"></div>

    <div class="inner">
      <header class="brand">
        <span class="mark" aria-hidden="true"><Logo :size="26" /></span>
        <span class="name">Al Aziz Academy</span>
      </header>

      <section class="hero">
        <div class="copy">
          <h1 class="title">
            <span class="ln" style="--i: 0">Bilimingizni</span>
            <span class="ln" style="--i: 1">sinab ko‘ring.</span>
          </h1>
          <div class="cta">
            <RouterLink class="btn btn-marker big" to="/test">Testni boshlash</RouterLink>
            <RouterLink class="btn btn-chalk big" to="/admin">Admin</RouterLink>
          </div>
        </div>

        <div class="art"><HeroEmblem /></div>
      </section>

      <section v-if="subjects.length" class="subjects" aria-label="Mavjud kasblar">
        <h2>Test topshirish mumkin bo‘lgan {{ subjects.length }} ta kasb</h2>
        <ul>
          <li v-for="s in subjects" :key="s">{{ s }}</li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style scoped>
.home { position: relative; min-height: 100dvh; overflow: hidden; }
/* Fondagi qiya yo‘l-yo‘l logotipdagi qiya chiziqlarni takrorlaydi */
.stripes {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: repeating-linear-gradient(105deg, transparent 0 150px, rgba(255, 255, 255, 0.045) 150px 215px);
  mask-image: linear-gradient(90deg, transparent 0%, #000 45%, #000 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 45%, #000 100%);
}
.inner { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; padding: 22px 22px 56px; }

.brand { display: flex; align-items: center; gap: 12px; }
.mark { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; background: #fff; color: var(--pen); }
.name { font-family: var(--f-display); font-weight: 700; font-size: 1.2rem; letter-spacing: -0.01em; }

.hero { display: grid; gap: 36px; align-items: center; padding-top: clamp(24px, 6vh, 72px); }
@media (min-width: 920px) { .hero { grid-template-columns: 1.05fr 0.95fr; gap: 40px; } }

.title { font-size: clamp(2.25rem, 9.5vw, 5.8rem); font-weight: 800; line-height: 0.96; letter-spacing: -0.04em; color: #fff; }
.ln { display: block; padding-bottom: 0.08em; clip-path: inset(0 100% 0 0); animation: write 0.9s var(--ease-out) forwards; animation-delay: calc(0.35s + var(--i) * 0.28s); }
@keyframes write { to { clip-path: inset(0 -2% 0 0); } }

.cta { margin-top: 34px; display: flex; flex-wrap: wrap; gap: 16px; opacity: 0; animation: rise 0.6s var(--ease-out) 1.15s forwards; }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.art { width: min(100%, 470px); justify-self: center; padding-right: 26px; }
@media (max-width: 919px) { .art { order: -1; width: min(70%, 300px); padding-right: 22px; } .hero { padding-top: 22px; } }

/* Kichik ekranlarda hamma narsa o‘rtada */
@media (max-width: 919px) {
  .inner { padding: 20px 16px 44px; }
  .brand { justify-content: center; }
  .hero { gap: 22px; text-align: center; }
  .cta { justify-content: center; }
  .subjects { text-align: center; }
  .subjects ul { justify-content: center; }
}
@media (max-width: 480px) {
  .hero { gap: 14px; }
  .cta { flex-direction: column; align-items: stretch; gap: 12px; max-width: 320px; margin-inline: auto; margin-top: 26px; }
  .cta .btn { justify-content: center; text-align: center; }
  .subjects { margin-top: 36px; padding-top: 22px; }
  .subjects h2 { font-size: 0.98rem; }
  .subjects li { padding: 6px 13px; font-size: 0.9rem; }
}

.subjects { margin-top: clamp(44px, 9vh, 96px); padding-top: 26px; border-top: 1.5px solid var(--chalk-line); opacity: 0; animation: rise 0.6s var(--ease-out) 1.35s forwards; }
.subjects h2 { font-size: 1.05rem; font-weight: 600; letter-spacing: 0; color: var(--chalk-dim); font-family: var(--f-body); margin-bottom: 16px; }
.subjects ul { display: flex; flex-wrap: wrap; gap: 10px; }
.subjects li { padding: 7px 15px; border-radius: 99px; border: 1.5px solid var(--chalk-line); color: var(--chalk); font-weight: 600; font-size: 0.95rem; transition: background-color 0.2s, border-color 0.2s, color 0.2s; }
.subjects li:hover { background: #fff; color: var(--pen); border-color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .ln, .cta, .subjects { animation: none; opacity: 1; clip-path: none; }
}
</style>
