<script setup>
import { computed, ref } from 'vue';
import { api } from '../utils/api.js';
import BaseSelect from './BaseSelect.vue';
import Logo from './Logo.vue';

const props = defineProps({
  meta: { type: Object, required: true },
  loadError: { type: String, default: '' },
});
const emit = defineEmits(['started']);

const fullName = ref('');
const subject = ref(''); // tanlangan kasb
const branch = ref('');
const busy = ref(false);
const error = ref('');
const shakeKey = ref(0);
const touched = ref(false);

const isStaff = computed(() => (props.meta.staff_professions || []).includes(subject.value));
const hasAcademic = computed(() => !!props.meta.academic_ready);
const nameOk = computed(() => fullName.value.trim().split(/\s+/).filter(Boolean).length >= 2);

function fail(msg) {
  error.value = msg;
  shakeKey.value++;
}

async function submit() {
  touched.value = true;
  error.value = '';
  if (!nameOk.value) return fail('Ism va familiyangizni to‘liq yozing.');
  if (!subject.value) return fail('Kasbni tanlang.');
  if (!branch.value) return fail('Filialni tanlang.');

  busy.value = true;
  let model = '';
  try {
    if (navigator.userAgentData?.getHighEntropyValues) {
      model = (await navigator.userAgentData.getHighEntropyValues(['model'])).model || '';
    }
  } catch { /* model aniqlanmasa ham davom etamiz */ }

  try {
    const st = await api.post('/api/start', {
      full_name: fullName.value,
      profession: subject.value,
      branch: branch.value,
      device_model: model,
      screen: `${screen.width}x${screen.height}`,
    });
    emit('started', st);
  } catch (e) {
    fail(e.message);
    busy.value = false;
  }
}
</script>

<template>
  <main class="wrap">
    <RouterLink class="back" to="/">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      Bosh sahifa
    </RouterLink>

    <div class="layout">
      <aside class="rules">
        <span class="logo-mark" aria-hidden="true"><Logo :size="30" /></span>
        <h2>Test qoidalari</h2>
        <ul>
          <li>
            <b>Har bosqich alohida vaqt bilan</b>
            <span>Vaqt bosqich boshlanganda ketadi va to‘xtamaydi.</span>
          </li>
          <li>
            <b>Javoblar o‘zi saqlanadi</b>
            <span>Har bir belgilangan variant darhol serverga yoziladi.</span>
          </li>
          <li>
            <b>Chiqib ketsangiz, davom etasiz</b>
            <span>Ism, kasb va filialni qayta kiriting, test qolgan joyidan ochiladi.</span>
          </li>
        </ul>
      </aside>

    <form :key="shakeKey" class="sheet paper margin" :class="{ shake: shakeKey > 0 }" novalidate @submit.prevent="submit">
      <div class="steps" aria-hidden="true">
        <i :class="{ on: nameOk }"></i><i :class="{ on: !!subject }"></i><i :class="{ on: !!branch }"></i>
      </div>
      <h1>Testni boshlash</h1>
      <p class="sub">Ma’lumotlaringizni kiriting va kasbingizni tanlang.</p>

      <p v-if="loadError" class="err" role="alert">{{ loadError }}</p>

      <div class="field">
        <label for="fn">Ism va familiya</label>
        <input
          id="fn" v-model="fullName" class="input" type="text" maxlength="80"
          placeholder="Masalan: Aliyev Vali" autocomplete="name"
          :aria-invalid="touched && !nameOk"
          :style="touched && !nameOk ? 'border-color: var(--red); box-shadow: 0 3px 0 var(--red)' : ''"
        />
      </div>

      <div class="field">
        <label for="sb">Kasb</label>
        <BaseSelect id="sb" v-model="subject" :options="meta.professions" placeholder="Kasbingizni tanlang" :invalid="touched && !subject" />
      </div>

      <div class="field">
        <label for="br">Filial</label>
        <BaseSelect id="br" v-model="branch" :options="meta.branches" placeholder="Filialni tanlang" :invalid="touched && !branch" />
      </div>

      <div class="plan" aria-live="polite">
        <template v-if="!subject">
          <p class="plan-hint">Kasbni tanlang, test bosqichlari shu yerda ko‘rinadi.</p>
        </template>
        <ol v-else>
          <li v-if="hasAcademic || isStaff">
            <b>1-bosqich: Academic savollar</b>
            <span>{{ meta.academic_duration_min }} daqiqa</span>
          </li>
          <li v-if="!isStaff">
            <b>{{ hasAcademic ? '2-bosqich' : 'Test' }}: {{ subject }} bo‘yicha savollar</b>
            <span>{{ meta.duration_min }} daqiqa</span>
          </li>
        </ol>
      </div>

      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <button class="btn btn-marker big block" type="submit" :disabled="busy">
        <span v-if="busy" class="spinner" aria-hidden="true"></span>
        {{ busy ? 'Test tayyorlanmoqda' : 'Testni boshlash' }}
      </button>
    </form>
    </div>
  </main>
</template>

<style scoped>
.wrap { max-width: 1040px; margin: 0 auto; padding: 18px 12px 40px; min-height: 100dvh; display: flex; flex-direction: column; justify-content: center; }
@media (min-width: 380px) { .wrap { padding-inline: 16px; } }
.layout { display: grid; gap: 22px; min-width: 0; }
@media (min-width: 920px) { .layout { grid-template-columns: 0.78fr 1.22fr; gap: 48px; align-items: center; } }

/* Chap panel: qoidalar. Qiya chiziq logotipdagi chiziqlarni takrorlaydi */
.rules { min-width: 0; order: 2; padding-top: 6px; }
@media (min-width: 920px) { .rules { order: 0; } }
.logo-mark { display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: #fff; color: var(--pen); margin-bottom: 18px; }
.rules h2 { font-size: clamp(1.5rem, 5vw, 2rem); font-weight: 800; margin-bottom: 14px; }
.rules ul { display: grid; gap: 0; }
.rules li { position: relative; display: grid; gap: 2px; padding: 14px 0 14px 22px; border-top: 1.5px solid var(--chalk-line); }
.rules li::before { content: ''; position: absolute; left: 4px; top: 18px; width: 5px; height: 22px; background: #fff; transform: skewX(-14deg); border-radius: 1px; }
.rules b { font-size: 1.05rem; }
.rules li span { color: var(--chalk-dim); font-size: 0.95rem; line-height: 1.45; }

/* To‘ldirish bosqichi: ism, fan, filial */
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 4px; }
.steps i { height: 6px; border-radius: 99px; background: var(--grid); transition: background-color 0.35s, transform 0.4s var(--ease-spring); transform-origin: left; }
.steps i.on { background: var(--pen); }
.back { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; margin-bottom: 14px; padding: 6px 10px 6px 6px; border-radius: 10px; color: var(--chalk-dim); text-decoration: none; font-weight: 600; transition: color 0.2s, transform 0.2s var(--ease-out); }
.back:hover { color: var(--chalk); transform: translateX(-3px); }

.sheet { display: grid; gap: 18px; padding: 22px 14px 22px 30px; min-width: 0; }
@media (min-width: 380px) { .sheet { gap: 20px; padding: 28px 22px 26px 36px; } }
@media (min-width: 700px) { .sheet { padding: 38px 40px 34px 80px; } }
h1 { font-size: clamp(1.9rem, 6vw, 2.5rem); font-weight: 800; }
.sub { color: var(--ink-soft); margin-top: -12px; }

.plan { padding: 12px 14px; border-radius: 12px; background: var(--pen-soft); color: #1d3a8f; font-size: 0.95rem; line-height: 1.45; }
.plan-hint { color: #4a5fb0; }
.plan ol { display: grid; gap: 8px; }
.plan li { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 2px 12px; }
.plan li b { color: #0f1b66; min-width: 0; overflow-wrap: anywhere; }
.plan li span { font-weight: 700; white-space: nowrap; }
.err { padding: 11px 14px; border-radius: 12px; background: #fde9e7; color: #9b2820; font-weight: 600; font-size: 0.95rem; animation: err-in 0.35s var(--ease-out); }
@keyframes err-in { from { opacity: 0; transform: translateY(-6px); } }

.shake { animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px); }
}
</style>
