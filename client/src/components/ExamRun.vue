<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api } from '../utils/api.js';
import { toast } from '../utils/toast.js';
import ConfirmDialog from './ConfirmDialog.vue';
import TimerRing from './TimerRing.vue';

const props = defineProps({
  attempt: { type: Object, required: true },
  durationSec: { type: Number, default: 3600 },
});
const emit = defineEmits(['done']);

const LETTERS = 'ABCDE';
const token = props.attempt.token;
const questions = props.attempt.questions;
const answers = ref({ ...props.attempt.answers });
// Qaytib kirganda o‘sha savoldan davom etish: avval saqlangan joy, bo‘lmasa birinchi javobsiz savol.
const POS_KEY = 'tt_pos_' + token;
function startIndex() {
  try {
    const n = Number(localStorage.getItem(POS_KEY));
    if (Number.isInteger(n) && n >= 0 && n < questions.length) return n;
  } catch { /* localStorage yo‘q bo‘lishi mumkin */ }
  const i = questions.findIndex((x) => props.attempt.answers[x.id] === undefined);
  return i < 0 ? 0 : i;
}
const cur = ref(startIndex());
watch(cur, (n) => {
  try { localStorage.setItem(POS_KEY, String(n)); } catch { /* e'tiborsiz */ }
});
const dir = ref('next');
const confirmOpen = ref(false);
const finishing = ref(false);

// Server vaqti bilan soat farqi (foydalanuvchi soati noto‘g‘ri bo‘lsa ham taymer to‘g‘ri ishlaydi)
const offset = props.attempt.server_now - Date.now() / 1000;
const remaining = ref(Math.max(0, props.attempt.expires_at - props.attempt.server_now));

const q = computed(() => questions[cur.value]);
const answered = computed(() => Object.keys(answers.value).length);
const pct = computed(() => (questions.length ? (answered.value / questions.length) * 100 : 0));
const unanswered = computed(() => questions.length - answered.value);

// ------------------------------------------------------ javoblarni saqlash
const saveState = ref('idle'); // idle | saving | saved | error
let dirty = false;
let saving = false;
let saveTimer = null;

function scheduleSave() {
  dirty = true;
  saveState.value = 'saving';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 500);
}

async function flush() {
  if (finishing.value || saving || !dirty) return;
  saving = true;
  dirty = false;
  try {
    await api.post('/api/save', { token, answers: answers.value });
    saveState.value = dirty ? 'saving' : 'saved';
  } catch {
    dirty = true;
    saveState.value = 'error';
  } finally {
    saving = false;
    if (dirty && saveState.value !== 'error') scheduleSave();
  }
}

const saveText = computed(() => ({
  saving: 'Saqlanmoqda',
  saved: 'Saqlandi',
  error: 'Saqlanmadi, qayta urinaman',
}[saveState.value] || ''));

// ------------------------------------------------------------- harakat
function pick(i) {
  answers.value = { ...answers.value, [q.value.id]: i };
  scheduleSave();
}

function goto(n) {
  if (n < 0 || n >= questions.length || n === cur.value) return;
  dir.value = n > cur.value ? 'next' : 'prev';
  cur.value = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onKey(e) {
  if (confirmOpen.value || finishing.value || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowRight') goto(cur.value + 1);
  else if (e.key === 'ArrowLeft') goto(cur.value - 1);
  else {
    const k = e.key.toUpperCase();
    const idx = LETTERS.includes(k) && k.length === 1 ? LETTERS.indexOf(k) : '12345'.indexOf(e.key);
    if (idx > -1 && idx < q.value.options.length) pick(idx);
  }
}

// -------------------------------------------------------------- yakunlash
async function finish(auto = false) {
  if (finishing.value) return;
  finishing.value = true;
  confirmOpen.value = false;
  clearTimeout(saveTimer);
  try {
    const res = await api.post('/api/finish', { token, answers: answers.value });
    emit('done', res);
  } catch (e) {
    finishing.value = false;
    toast('Internet bilan muammo bor. Aloqani tekshirib, qayta urinib ko‘ring.', 'error', 5200);
    if (auto) setTimeout(() => finish(true), 3000);
  }
}

// ------------------------------------------------------------------ taymer
let tick = null;
let retry = null;
function beforeUnload(e) {
  if (!finishing.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => {
  tick = setInterval(() => {
    remaining.value = Math.max(0, props.attempt.expires_at - (Date.now() / 1000 + offset));
  }, 250);
  retry = setInterval(() => { if (dirty && !saving) flush(); }, 8000);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('pagehide', onPageHide);
});

function onHidden() {
  if (document.hidden) flush();
}

// Oyna/vkladka yopilayotganda saqlanmagan javoblarni yuborib qo‘yish (sahifa yopilsa ham ketadi).
function onPageHide() {
  if (!dirty || finishing.value || !navigator.sendBeacon) return;
  const body = new Blob([JSON.stringify({ token, answers: answers.value })], { type: 'application/json' });
  if (navigator.sendBeacon('/api/save', body)) dirty = false;
}

onBeforeUnmount(() => {
  clearInterval(tick);
  clearInterval(retry);
  clearTimeout(saveTimer);
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('visibilitychange', onHidden);
  window.removeEventListener('beforeunload', beforeUnload);
  window.removeEventListener('pagehide', onPageHide);
});

watch(remaining, (r) => {
  if (r <= 0 && !finishing.value) finish(true);
});
</script>

<template>
  <div class="exam">
    <header class="bar">
      <div class="who">
        <b><i v-if="attempt.stages > 1" class="stage">{{ attempt.stage }}-bosqich</i>{{ attempt.title }}</b>
        <span>{{ attempt.full_name }}, {{ attempt.branch }}</span>
      </div>
      <div class="right">
        <Transition name="state" mode="out-in">
          <span v-if="saveState !== 'idle'" :key="saveState" class="save" :class="saveState" role="status">
            <svg v-if="saveState === 'saved'" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span v-else-if="saveState === 'saving'" class="spinner" aria-hidden="true"></span>
            {{ saveText }}
          </span>
        </Transition>
        <TimerRing :remaining="remaining" :total="durationSec" />
      </div>
    </header>

    <div class="progress" role="progressbar" :aria-valuenow="answered" :aria-valuemax="questions.length" aria-label="Javob berilgan savollar">
      <i :style="{ width: pct + '%' }"></i>
    </div>

    <div class="layout">
      <section class="qcard paper margin">
        <div class="qtop">
          <span class="qn">{{ cur + 1 }}-savol</span>
          <span class="of">{{ answered }} / {{ questions.length }} javob berildi</span>
        </div>

        <Transition :name="dir" mode="out-in">
          <div :key="cur" class="qbody">
            <p class="qtext" dir="auto">{{ q.text }}</p>
            <div class="opts" role="group" aria-label="Javob variantlari">
              <button
                v-for="(o, i) in q.options"
                :key="i"
                type="button"
                class="opt"
                :class="{ sel: answers[q.id] === i }"
                :aria-pressed="answers[q.id] === i"
                @click="pick(i)"
              >
                <span class="letter">
                  {{ LETTERS[i] }}
                  <svg class="ring" viewBox="0 0 40 36" aria-hidden="true">
                    <path pathLength="1" d="M6 20 C4 9 14 3 23 4 C33 5 38 14 35 23 C32 32 20 34 12 30 C6 27 4 21 5 15 C6 11 9 8 13 6" />
                  </svg>
                </span>
                <span class="otext" dir="auto">{{ o }}</span>
              </button>
            </div>
          </div>
        </Transition>

        <div class="nav">
          <button class="btn btn-outline" type="button" :disabled="cur === 0" @click="goto(cur - 1)">Oldingi</button>
          <button v-if="cur < questions.length - 1" class="btn btn-ink" type="button" @click="goto(cur + 1)">Keyingi</button>
          <button v-else class="btn btn-marker" type="button" @click="confirmOpen = true">Yakunlash</button>
        </div>
      </section>

      <aside class="navi paper">
        <h2>Savollar</h2>
        <div class="chips">
          <button
            v-for="(qq, i) in questions"
            :key="qq.id"
            type="button"
            class="chip"
            :class="{ done: answers[qq.id] !== undefined, now: i === cur }"
            :style="{ '--i': i }"
            :aria-label="`${i + 1}-savol${answers[qq.id] !== undefined ? ', javob berilgan' : ''}`"
            :aria-current="i === cur ? 'true' : undefined"
            @click="goto(i)"
          >{{ i + 1 }}</button>
        </div>
        <button class="btn btn-danger block" type="button" :disabled="finishing" @click="confirmOpen = true">Testni yakunlash</button>
      </aside>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      :title="attempt.stages > 1 && attempt.stage < attempt.stages ? '1-bosqichni yakunlaysizmi?' : 'Testni yakunlaysizmi?'"
      :text="(unanswered > 0 ? `Javob berilmagan savollar: ${unanswered} ta. ` : 'Barcha savollarga javob berdingiz. ') + 'Yakunlagandan keyin o‘zgartirib bo‘lmaydi.'"
      confirm-text="Yakunlash"
      cancel-text="Testga qaytish"
      :busy="finishing"
      @confirm="finish(false)"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.exam { min-height: 100dvh; padding-bottom: 40px; }

.bar {
  position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 16px; background: rgba(10, 17, 99, 0.92); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--chalk-line);
}
.who { min-width: 0; display: grid; line-height: 1.25; }
.who b { font-family: var(--f-display); font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stage { font-style: normal; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; margin-right: 8px; border-radius: 6px; background: #fff; color: var(--pen); vertical-align: 2px; font-family: var(--f-body); }
.who span { font-size: 0.84rem; color: var(--chalk-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.right { display: flex; align-items: center; gap: 12px; flex: none; }

.save { display: none; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; color: var(--chalk-dim); }
@media (min-width: 560px) { .save { display: inline-flex; } }
.save.saved { color: #7fe0b3; }
.save.error { color: #ff9d96; }
.save .spinner { width: 0.85em; height: 0.85em; border-width: 2px; }
.state-enter-active, .state-leave-active { transition: opacity 0.18s, transform 0.18s; }
.state-enter-from { opacity: 0; transform: translateY(5px); }
.state-leave-to { opacity: 0; transform: translateY(-5px); }

.progress { height: 5px; background: var(--chalk-line); overflow: hidden; }
.progress i { display: block; height: 100%; background: var(--marker); border-radius: 0 4px 4px 0; transition: width 0.5s var(--ease-out); }

.layout { max-width: 1120px; margin: 0 auto; padding: 18px 14px 0; display: grid; gap: 16px; align-items: start; }
@media (min-width: 960px) { .layout { grid-template-columns: minmax(0, 1fr) 300px; padding-top: 24px; } .navi { position: sticky; top: 92px; } }

/* savol varag‘i */
.qcard { padding: 22px 18px 20px 34px; min-height: 420px; display: flex; flex-direction: column; overflow: hidden; }
@media (min-width: 700px) { .qcard { padding: 30px 34px 28px 82px; min-height: 480px; } }
.qtop { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.qn { font-family: var(--f-display); font-weight: 800; font-size: 1.1rem; background: var(--pen); color: #fff; padding: 2px 12px; border-radius: 6px; transform: rotate(-1.2deg); box-shadow: 0 2px 0 rgba(26, 34, 54, 0.85); }
.of { font-size: 0.85rem; color: var(--ink-soft); font-weight: 600; }
.qbody { flex: 1; }
.qtext { font-size: clamp(1.12rem, 3.2vw, 1.4rem); line-height: 1.5; font-weight: 600; white-space: pre-wrap; overflow-wrap: anywhere; margin-bottom: 22px; }

.opts { display: grid; gap: 11px; }
.opt {
  position: relative; display: flex; align-items: flex-start; gap: 14px; width: 100%; padding: 12px 14px; text-align: left; cursor: pointer;
  background: #fff linear-gradient(var(--pen-soft), var(--pen-soft)) no-repeat left / 0% 100%;
  border: 1.5px solid var(--line); border-radius: 14px; line-height: 1.45;
  transition: background-size 0.35s var(--ease-out), border-color 0.2s, transform 0.12s var(--ease-out), box-shadow 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.opt:hover { border-color: #a9b9d9; transform: translateX(3px); }
.opt:active { transform: scale(0.985); }
.opt.sel { background-size: 100% 100%; border-color: var(--pen); box-shadow: 0 3px 0 var(--pen); }
.letter {
  position: relative; flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  background: var(--grid); font-weight: 800; font-size: 0.9rem; transition: background-color 0.25s, color 0.25s;
}
.opt.sel .letter { background: var(--pen); color: #fff; animation: pop 0.45s var(--ease-spring); }
.ring { position: absolute; left: -6px; top: -3px; width: 42px; height: 38px; overflow: visible; pointer-events: none; }
.ring path { fill: none; stroke: var(--pen); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; }
.opt.sel .ring path { opacity: 1; animation: draw 0.5s var(--ease-out) forwards; }
.otext { padding-top: 3px; white-space: pre-wrap; overflow-wrap: anywhere; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes pop { 0% { transform: scale(0.7); } 100% { transform: scale(1); } }

.nav { display: flex; gap: 12px; margin-top: 26px; }
.nav .btn { flex: 1; }

/* savoldan savolga o‘tish: varaq varaqlanadi */
.next-enter-active, .next-leave-active, .prev-enter-active, .prev-leave-active { transition: opacity 0.2s ease, transform 0.3s var(--ease-out); }
.next-enter-from { opacity: 0; transform: translateX(34px) rotate(0.8deg); }
.next-leave-to { opacity: 0; transform: translateX(-34px) rotate(-0.8deg); }
.prev-enter-from { opacity: 0; transform: translateX(-34px) rotate(-0.8deg); }
.prev-leave-to { opacity: 0; transform: translateX(34px) rotate(0.8deg); }

/* navigator */
.navi { padding: 20px 18px 18px; display: grid; gap: 16px; }
.navi h2 { font-size: 1.25rem; }
.chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(42px, 1fr)); gap: 8px; }
.chip {
  height: 42px; border-radius: 10px; cursor: pointer; font-weight: 700; color: var(--ink-soft);
  background: #fff; border: 1.5px solid var(--line);
  transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.15s var(--ease-spring);
  animation: chip-in 0.45s var(--ease-spring) backwards; animation-delay: calc(var(--i) * 16ms);
}
.chip:hover { transform: translateY(-2px); border-color: var(--pen); }
.chip.done { background: var(--pen); border-color: var(--pen); color: #fff; }
.chip.now { background: var(--pen); border-color: #0a1163; color: #fff; box-shadow: 0 3px 0 #0a1163; transform: translateY(-2px); }
@keyframes chip-in { from { opacity: 0; transform: scale(0.5); } }
</style>
