<script setup>
import { computed, ref } from 'vue';
import { api } from '../utils/api.js';

const props = defineProps({ attempt: { type: Object, required: true } });
const emit = defineEmits(['started']);

const busy = ref(false);
const error = ref('');
const minutes = computed(() => Math.round((props.attempt.next_duration_sec || 0) / 60));

async function next() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const st = await api.post('/api/next', { token: props.attempt.token, screen: `${screen.width}x${screen.height}` });
    emit('started', st);
  } catch (e) {
    error.value = e.message;
    busy.value = false;
  }
}
</script>

<template>
  <main class="wrap">
    <section class="brk paper margin" role="status">
      <div class="seal" aria-hidden="true">
        <svg viewBox="0 0 80 80">
          <circle class="c" cx="40" cy="40" r="34" pathLength="1" />
          <path class="t" d="M24 42 L35 53 L57 29" pathLength="1" />
        </svg>
      </div>
      <h1>1-bosqich yakunlandi</h1>
      <p>Natijangiz qabul qilindi. Endi <b>{{ attempt.next_title }}</b> bo‘yicha 2-bosqichga o‘ting.</p>
      <p class="rule">2-bosqich uchun {{ minutes }} daqiqa beriladi. Vaqt tugmani bosganingizda boshlanadi.</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <button class="btn btn-marker big" type="button" :disabled="busy" @click="next">
        <span v-if="busy" class="spinner" aria-hidden="true"></span>
        2-bosqichni boshlash
      </button>
    </section>
  </main>
</template>

<style scoped>
.wrap { min-height: 100dvh; display: grid; place-items: center; padding: 20px 12px; }
.brk {
  width: 100%; max-width: 560px; padding: 40px 16px 32px 30px; text-align: center; display: grid; justify-items: center; gap: 14px; min-width: 0;
  animation: land 0.8s var(--ease-out) both;
}
@media (min-width: 380px) { .brk { padding: 44px 24px 36px 36px; } }
@media (min-width: 700px) { .brk { padding: 52px 44px 44px 84px; } }
h1 { font-size: clamp(1.7rem, 6vw, 2.5rem); font-weight: 800; }
p { color: var(--ink-soft); max-width: 27em; overflow-wrap: anywhere; }
p b { color: var(--ink); }
.rule { font-size: 0.95rem; }
.err { padding: 10px 14px; border-radius: 12px; background: #fde9e7; color: #9b2820; font-weight: 600; font-size: 0.95rem; }
.btn { margin-top: 8px; }

.seal { width: 92px; height: 92px; }
.seal svg { width: 100%; height: 100%; overflow: visible; }
.c { fill: #e9f8f0; stroke: var(--green); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; transform: rotate(-90deg); transform-origin: center; animation: draw 0.7s var(--ease-out) 0.2s forwards; }
.t { fill: none; stroke: var(--green); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 0.45s var(--ease-out) 0.8s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes land { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .brk, .c, .t { animation: none; stroke-dashoffset: 0; } }
</style>
