<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../utils/api.js';
import { toast } from '../utils/toast.js';
import ConfirmDialog from './ConfirmDialog.vue';

const items = ref([]);
const loaded = ref(false);
const ready = ref(false);

const file = ref(null);
const replace = ref(false);
const busy = ref(false);
const drag = ref(false);
const errMsg = ref('');
const errors = ref([]);

const delTarget = ref(null);
const deleting = ref(false);

const max = computed(() => Math.max(30, ...items.value.map((i) => i.count)));
const total = computed(() => items.value.reduce((s, i) => s + i.count, 0));
const academicEmpty = computed(() => items.value.some((i) => i.academic && i.count === 0));
const empty = computed(() => items.value.filter((i) => i.count === 0).length);

async function load() {
  try {
    items.value = (await api.get('/api/admin/questions')).items;
    loaded.value = true;
    setTimeout(() => { ready.value = true; }, 60);
  } catch (e) {
    if (e.status === 401) { location.reload(); return; }
    toast(e.message, 'error');
  }
}
onMounted(load);

function setFile(f) {
  errMsg.value = '';
  errors.value = [];
  if (!f) return;
  if (!/\.xlsx$/i.test(f.name)) {
    errMsg.value = 'Faqat .xlsx formatidagi fayl yuklash mumkin.';
    return;
  }
  file.value = f;
}
function onDrop(e) {
  drag.value = false;
  setFile(e.dataTransfer?.files?.[0]);
}
function onPick(e) {
  setFile(e.target.files?.[0]);
  e.target.value = '';
}

async function upload() {
  if (!file.value || busy.value) return;
  busy.value = true;
  errMsg.value = '';
  errors.value = [];
  const fd = new FormData();
  fd.append('replace', replace.value ? '1' : '0');
  fd.append('file', file.value);
  try {
    const r = await api.upload('/api/admin/questions/upload', fd);
    toast(`${r.added} ta savol yuklandi (${r.subjects} ta fan)`, 'success');
    file.value = null;
    ready.value = false;
    await load();
  } catch (e) {
    errMsg.value = e.message;
    errors.value = e.data?.errors || [];
  } finally {
    busy.value = false;
  }
}

async function doDelete() {
  deleting.value = true;
  try {
    await api.post('/api/admin/questions/delete', { subject: delTarget.value.subject });
    toast(`“${delTarget.value.subject}” savollari o‘chirildi`, 'success');
    delTarget.value = null;
    ready.value = false;
    await load();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <section class="q">
    <div class="card up">
      <h2>Savollarni Excel orqali yuklash</h2>
      <p class="hint">Ustunlar: Fan, Savol, A, B, C, D, To‘g‘ri javob. 1-bosqich savollari uchun Fan ustuniga <b>Academic</b> deb yozing. Avval shablonni yuklab oling.</p>

      <a class="btn btn-outline sm tpl" href="/api/admin/template.xlsx" download>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Shablonni yuklab olish
      </a>

      <label class="drop" :class="{ drag, has: !!file }" @dragover.prevent="drag = true" @dragleave="drag = false" @drop.prevent="onDrop">
        <input class="sr-only" type="file" accept=".xlsx" @change="onPick" />
        <svg class="ico" viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
          <path d="M24 33V11m0 0l-9 9m9-9l9 9" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 31v6a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3v-6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
        </svg>
        <b>{{ file ? file.name : 'Excel faylni shu yerga tashlang' }}</b>
        <span>{{ file ? 'Boshqa fayl tanlash uchun bosing' : 'yoki bosib tanlang (.xlsx)' }}</span>
      </label>

      <label class="switch">
        <input v-model="replace" type="checkbox" />
        <i aria-hidden="true"></i>
        <span>Faylda uchragan fanlarning eski savollarini almashtirish</span>
      </label>

      <Transition name="msg">
        <div v-if="errMsg" class="err" role="alert">
          <b>{{ errMsg }}</b>
          <ul v-if="errors.length"><li v-for="(e, i) in errors" :key="i">{{ e }}</li></ul>
        </div>
      </Transition>

      <button class="btn btn-marker block" type="button" :disabled="!file || busy" @click="upload">
        <span v-if="busy" class="spinner" aria-hidden="true"></span>
        {{ busy ? 'Yuklanmoqda' : 'Savollarni yuklash' }}
      </button>
    </div>

    <div class="card list">
      <div class="head">
        <h2>Savollar soni</h2>
        <span class="sum"><b>{{ total }}</b> ta savol<template v-if="loaded && empty">, {{ empty }} ta fanda yo‘q</template></span>
      </div>
      <p v-if="loaded && academicEmpty" class="warn" role="status">Academic savollari hali yuklanmagan: o‘qituvchilar faqat kasb testini ishlaydi, «Tozalik xodimi» va «Boshqa» testni boshlay olmaydi.</p>
      <ul>
        <li v-for="(it, i) in items" :key="it.subject" :class="{ zero: it.count === 0 }">
          <span class="nm" :title="it.subject">{{ it.academic ? 'Academic (1-bosqich)' : it.subject }}</span>
          <span class="track"><i :style="{ width: (ready ? (it.count / max) * 100 : 0) + '%', transitionDelay: i * 35 + 'ms' }"></i></span>
          <span class="cnt">{{ it.count || 'Yo‘q' }}</span>
          <button
            v-if="it.count"
            class="del"
            type="button"
            :aria-label="`${it.subject} savollarini o‘chirish`"
            @click="delTarget = it"
          >
            <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-6 0l.7 10h6.6L14 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <span v-else class="del-gap"></span>
        </li>
      </ul>
    </div>

    <ConfirmDialog
      :open="!!delTarget"
      title="Savollarni o‘chirasizmi?"
      :text="delTarget ? `“${delTarget.subject}” fanining barcha ${delTarget.count} ta savoli o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.` : ''"
      confirm-text="O‘chirish"
      danger
      :busy="deleting"
      @confirm="doDelete"
      @cancel="delTarget = null"
    />
  </section>
</template>

<style scoped>
.q { display: grid; gap: 16px; align-items: start; }
@media (min-width: 980px) { .q { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 20px; } }

.up { padding: 22px 22px 22px; display: grid; gap: 16px; }
h2 { font-size: 1.3rem; }
.hint { color: var(--ink-soft); font-size: 0.95rem; margin-top: -8px; }
.tpl { justify-self: start; }

.drop {
  display: grid; justify-items: center; gap: 4px; text-align: center; padding: 30px 18px; cursor: pointer;
  border: 2.5px dashed #b7c3da; border-radius: 16px; background: #f8faff; color: var(--ink-soft);
  transition: border-color 0.2s, background-color 0.2s, transform 0.25s var(--ease-spring);
}
.drop:hover, .drop:focus-within { border-color: var(--pen); background: var(--pen-soft); }
.drop.drag { border-color: var(--pen); background: var(--pen-soft); transform: scale(1.02); }
.drop.has { border-style: solid; border-color: var(--green); background: #f0faf5; color: #17734a; }
.drop b { color: var(--ink); overflow-wrap: anywhere; }
.ico { color: var(--pen); margin-bottom: 4px; animation: bob 2.4s ease-in-out infinite; }
.drop.has .ico { color: var(--green); animation: none; }
.drop.drag .ico { animation-duration: 0.7s; }
@keyframes bob { 50% { transform: translateY(-6px); } }

.switch { display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 0.95rem; }
.switch input { position: absolute; opacity: 0; pointer-events: none; }
.switch i { position: relative; flex: none; width: 46px; height: 26px; border-radius: 99px; background: #cfd8e8; transition: background-color 0.25s; }
.switch i::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(21, 34, 61, 0.3); transition: transform 0.35s var(--ease-spring); }
.switch input:checked + i { background: var(--pen); }
.switch input:checked + i::after { transform: translateX(20px); }
.switch input:focus-visible + i { outline: 3px solid var(--pen); outline-offset: 3px; }

.err { padding: 12px 14px; border-radius: 12px; background: #fde9e7; color: #9b2820; font-size: 0.93rem; }
.err ul { margin: 8px 0 0; padding-left: 18px; list-style: disc; display: grid; gap: 2px; font-size: 0.88rem; }
.msg-enter-active { transition: opacity 0.25s, transform 0.4s var(--ease-out); }
.msg-leave-active { transition: opacity 0.15s; }
.msg-enter-from { opacity: 0; transform: translateY(-8px); }
.msg-leave-to { opacity: 0; }

.list { padding: 20px 20px 10px; }
.head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 14px; margin-bottom: 8px; }
.sum { color: var(--ink-soft); font-size: 0.9rem; }
.sum b { color: var(--ink); font-size: 1.05rem; }
.list ul { display: grid; }
.list li { display: grid; grid-template-columns: minmax(100px, 190px) 1fr 44px 36px; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid #edf1f7; }
.list li:last-child { border-bottom: 0; }
.nm { font-weight: 600; font-size: 0.93rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { height: 10px; border-radius: 99px; background: #eaeff7; overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 99px; background: var(--pen); transition: width 0.9s var(--ease-out); }
.cnt { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }
.warn { margin: 4px 0 8px; padding: 10px 12px; border-radius: 10px; background: #fff4d9; color: #7a5200; font-size: 0.9rem; font-weight: 600; line-height: 1.45; }
.zero .cnt { color: var(--red); font-weight: 700; font-size: 0.85rem; }
.zero .nm { color: var(--ink-soft); }
.del { width: 34px; height: 34px; display: grid; place-items: center; border: 0; border-radius: 9px; background: transparent; color: var(--ink-soft); cursor: pointer; transition: background-color 0.2s, color 0.2s, transform 0.2s var(--ease-spring); }
.del:hover { background: #fde9e7; color: var(--red); transform: scale(1.1); }
.del-gap { width: 34px; }
</style>
