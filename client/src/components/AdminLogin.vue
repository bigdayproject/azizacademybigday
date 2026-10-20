<script setup>
import { ref } from 'vue';
import { api } from '../utils/api.js';
import ChalkBackdrop from './ChalkBackdrop.vue';

const emit = defineEmits(['ok']);
const password = ref('');
const busy = ref(false);
const error = ref('');
const shake = ref(0);
const unlocked = ref(false);
const show = ref(false);

async function submit() {
  if (!password.value || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await api.post('/api/admin/login', { password: password.value });
    unlocked.value = true;
    setTimeout(() => emit('ok'), 700);
  } catch (e) {
    error.value = e.message;
    shake.value++;
    password.value = '';
    busy.value = false;
  }
}
</script>

<template>
  <main class="login">
    <ChalkBackdrop />
    <form :key="shake" class="box paper margin" :class="{ shake: shake > 0 }" @submit.prevent="submit">
      <div class="lock" :class="{ open: unlocked }" aria-hidden="true">
        <svg viewBox="0 0 48 52" width="58" height="62">
          <path class="shackle" d="M14 24v-7a10 10 0 0 1 20 0v7" fill="none" stroke="#15223d" stroke-width="5" stroke-linecap="round" />
          <rect x="6" y="23" width="36" height="25" rx="7" fill="#c9ceff" stroke="#15223d" stroke-width="3" />
          <circle cx="24" cy="34.5" r="3.6" fill="#15223d" />
          <path d="M24 36v5" stroke="#15223d" stroke-width="3" stroke-linecap="round" />
        </svg>
      </div>
      <h1>Admin panel</h1>
      <p class="sub">Davom etish uchun parolni kiriting.</p>

      <div class="field">
        <label for="pw">Parol</label>
        <div class="pw">
          <input id="pw" v-model="password" class="input" :type="show ? 'text' : 'password'" autocomplete="current-password" autofocus />
          <button type="button" class="eye" :aria-label="show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'" @click="show = !show">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
              <path v-if="!show" d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <button class="btn btn-marker big block" type="submit" :disabled="busy || !password">
        <span v-if="busy && !unlocked" class="spinner" aria-hidden="true"></span>
        {{ unlocked ? 'Ochildi' : 'Kirish' }}
      </button>
      <RouterLink class="home" to="/">Bosh sahifaga qaytish</RouterLink>
    </form>
  </main>
</template>

<style scoped>
.login { position: relative; min-height: 100dvh; display: grid; place-items: center; padding: 20px 16px; }
.box { position: relative; z-index: 1; width: 100%; max-width: 440px; display: grid; gap: 16px; padding: 30px 24px 26px 38px; }
@media (min-width: 700px) { .box { padding: 38px 38px 30px 80px; } }
h1 { font-size: 2rem; font-weight: 800; }
.sub { color: var(--ink-soft); margin-top: -8px; }

.lock { width: 58px; height: 62px; }
.shackle { transition: transform 0.5s var(--ease-spring); transform-origin: 34px 24px; }
.lock.open .shackle { transform: translateY(-6px) rotate(24deg); }
.lock.open { animation: nod 0.6s var(--ease-out); }
@keyframes nod { 40% { transform: rotate(-6deg); } }

.pw { position: relative; }
.pw .input { padding-right: 3.2em; }
.eye { position: absolute; right: 6px; top: 50%; transform: translateY(-52%); width: 40px; height: 40px; display: grid; place-items: center; border: 0; background: transparent; color: var(--ink-soft); border-radius: 10px; cursor: pointer; transition: color 0.2s, background-color 0.2s; }
.eye:hover { color: var(--ink); background: var(--pen-soft); }

.err { padding: 10px 14px; border-radius: 12px; background: #fde9e7; color: #9b2820; font-weight: 600; font-size: 0.95rem; animation: err-in 0.35s var(--ease-out); }
@keyframes err-in { from { opacity: 0; transform: translateY(-6px); } }
.home { text-align: center; color: var(--ink-soft); font-weight: 600; font-size: 0.92rem; text-decoration: none; padding: 4px; }
.home:hover { color: var(--ink); text-decoration: underline; }

.shake { animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px); }
}
</style>
