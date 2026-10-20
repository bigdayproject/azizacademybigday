<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { api } from '../utils/api.js';
import { toast } from '../utils/toast.js';
import AnimatedNumber from './AnimatedNumber.vue';
import BaseSelect from './BaseSelect.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import ResultDrawer from './ResultDrawer.vue';

const data = ref({
  rows: [],
  stats: { total: 0, in_progress: 0, finished: 0, avg_percent: null },
  by_subject: [],
  subjects: [],
  branches: [],
});
const loaded = ref(false);
const refreshing = ref(false);
const updatedAt = ref('');
const barsReady = ref(false);

const f = reactive({ q: '', subject: '', branch: '', status: '', date_from: '', date_to: '' });
const statusOptions = [
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'finished', label: 'Yakunlangan' },
];
const hasFilter = computed(() => Object.values(f).some(Boolean));
const qs = computed(() => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p.toString();
});
const exportHref = computed(() => '/api/admin/export.xlsx' + (qs.value ? '?' + qs.value : ''));

// Ishlayotgan testlarning qolgan vaqti har soniyada yangilanib turadi
let fetchedAt = Date.now();
const clock = ref(Date.now());
function remain(r) {
  const s = Math.max(0, r.remaining_sec - Math.floor((clock.value - fetchedAt) / 1000));
  return `${Math.floor(s / 60)} daq ${String(s % 60).padStart(2, '0')} s`;
}
const tone = (p) => (p >= 70 ? 'g' : p >= 50 ? 'y' : 'r');

async function load(silent = false) {
  refreshing.value = true;
  try {
    data.value = await api.get('/api/admin/results' + (qs.value ? '?' + qs.value : ''));
    fetchedAt = Date.now();
    clock.value = fetchedAt;
    updatedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    loaded.value = true;
  } catch (e) {
    if (e.status === 401) { location.reload(); return; }
    if (!silent) toast(e.message, 'error');
  } finally {
    refreshing.value = false;
  }
}

let debounce = null;
watch(f, () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => load(), 250);
});

let refreshTimer = null;
let clockTimer = null;
onMounted(async () => {
  await load();
  setTimeout(() => { barsReady.value = true; }, 60);
  refreshTimer = setInterval(() => load(true), 15000);
  clockTimer = setInterval(() => { clock.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => {
  clearInterval(refreshTimer);
  clearInterval(clockTimer);
  clearTimeout(debounce);
});

function clearFilters() {
  Object.keys(f).forEach((k) => { f[k] = ''; });
}

// ------------------------------------------------ batafsil va o‘chirish
const selected = ref(null);
const delTarget = ref(null);
const deleting = ref(false);

async function doDelete() {
  deleting.value = true;
  try {
    await api.post('/api/admin/attempts/delete', { id: delTarget.value.id });
    toast('Natija o‘chirildi', 'success');
    delTarget.value = null;
    selected.value = null;
    await load(true);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <section class="res">
    <div class="stats">
      <div class="stat card">
        <span class="k">Jami urinishlar</span>
        <b><AnimatedNumber :value="data.stats.total" /></b>
      </div>
      <div class="stat card live" :class="{ on: data.stats.in_progress > 0 }">
        <span class="k"><i class="dot" aria-hidden="true"></i>Hozir ishlayotganlar</span>
        <b><AnimatedNumber :value="data.stats.in_progress" /></b>
      </div>
      <div class="stat card">
        <span class="k">Yakunlaganlar</span>
        <b><AnimatedNumber :value="data.stats.finished" /></b>
      </div>
      <div class="stat card">
        <span class="k">O‘rtacha natija</span>
        <b><AnimatedNumber :value="data.stats.avg_percent" :decimals="1" suffix="%" /></b>
      </div>
    </div>

    <div v-if="data.by_subject.length" class="card bars">
      <h2>O‘rtacha natija: Academic va kasblar bo‘yicha</h2>
      <ul>
        <li v-for="(s, i) in data.by_subject" :key="s.subject">
          <span class="nm" :title="s.subject">{{ s.subject }}</span>
          <span class="track"><i :class="tone(s.avg_percent)" :style="{ width: (barsReady ? s.avg_percent : 0) + '%', transitionDelay: i * 40 + 'ms' }"></i></span>
          <span class="val">{{ s.avg_percent }}%<small>{{ s.count }} ta</small></span>
        </li>
      </ul>
    </div>

    <div class="card filters">
      <div class="fld wide"><label for="fq">Ism bo‘yicha qidirish</label><input id="fq" v-model="f.q" class="input compact" type="search" placeholder="Ism yoki familiya" autocomplete="off" /></div>
      <div class="fld"><label for="fs">Kasb</label><BaseSelect id="fs" v-model="f.subject" :options="data.subjects" all-label="Barcha kasblar" compact /></div>
      <div class="fld"><label for="fb">Filial</label><BaseSelect id="fb" v-model="f.branch" :options="data.branches" all-label="Barcha filiallar" compact /></div>
      <div class="fld"><label for="fh">Holat</label><BaseSelect id="fh" v-model="f.status" :options="statusOptions" all-label="Barchasi" compact /></div>
      <div class="fld"><label for="fd1">Sanadan</label><input id="fd1" v-model="f.date_from" class="input compact" type="date" /></div>
      <div class="fld"><label for="fd2">Sanagacha</label><input id="fd2" v-model="f.date_to" class="input compact" type="date" /></div>
    </div>

    <div class="toolbar">
      <span class="upd" aria-live="polite">
        <span v-if="refreshing" class="spinner" aria-hidden="true"></span>
        <template v-else-if="updatedAt">Yangilandi: {{ updatedAt }}</template>
      </span>
      <div class="acts">
        <button v-if="hasFilter" class="btn btn-outline sm" type="button" @click="clearFilters">Filtrlarni tozalash</button>
        <a class="btn btn-marker sm" :href="exportHref" download>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          Excelga yuklash
        </a>
      </div>
    </div>

    <div class="card tablebox">
      <table>
        <thead>
          <tr>
            <th class="n">№</th><th>Ism familya</th><th>Kasb</th><th>Bosqich</th><th>Filial</th><th>Qurilma</th>
            <th>Boshlagan vaqti</th><th>Sarflagan vaqt</th><th>To‘g‘ri</th><th>Foiz</th><th>Holat</th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="row">
          <tr
            v-for="(r, i) in data.rows"
            :key="r.id"
            :style="{ '--i': Math.min(i, 14) }"
            tabindex="0"
            @click="selected = r"
            @keydown.enter="selected = r"
          >
            <td class="n">{{ i + 1 }}</td>
            <td><b>{{ r.full_name }}</b></td>
            <td>{{ r.subject }}</td>
            <td><span class="stg" :class="r.kind">{{ r.stage_label }}</span></td>
            <td>{{ r.branch }}</td>
            <td>
              {{ r.device_type }} {{ r.device_model }}
              <small>{{ r.os }}, {{ r.browser }}</small>
            </td>
            <td>{{ r.started }}<small v-if="r.finished">Tugagan: {{ r.finished.slice(11) }}</small></td>
            <td>{{ r.duration }}<small v-if="r.status === 'in_progress'">Qoldi: {{ remain(r) }}</small></td>
            <td>
              <template v-if="r.status === 'finished'">{{ r.correct }} / {{ r.total }}</template>
              <small v-else class="plain">{{ r.answered }} / {{ r.total }} javob</small>
            </td>
            <td>
              <span v-if="r.status === 'finished'" class="pct">
                <span class="pbar"><i :class="tone(r.percent)" :style="{ width: r.percent + '%' }"></i></span>
                <b>{{ r.percent }}%</b>
              </span>
              <span v-else class="muted">—</span>
            </td>
            <td>
              <span v-if="r.status === 'in_progress'" class="chip live"><i class="dot" aria-hidden="true"></i>Jarayonda</span>
              <span v-else class="chip done">Yakunlangan</span>
            </td>
          </tr>
        </TransitionGroup>
      </table>

      <div v-if="!loaded" class="skel" aria-hidden="true"><i v-for="n in 5" :key="n"></i></div>
      <div v-else-if="!data.rows.length" class="empty">
        <b>{{ hasFilter ? 'Filtrga mos natija topilmadi' : 'Hozircha natijalar yo‘q' }}</b>
        <span>{{ hasFilter ? 'Filtrlarni o‘zgartirib ko‘ring.' : 'Ustozlar test yechishni boshlaganda, ularning natijalari shu yerda paydo bo‘ladi.' }}</span>
      </div>
    </div>

    <ResultDrawer :row="selected" @close="selected = null" @delete="delTarget = $event" />
    <ConfirmDialog
      :open="!!delTarget"
      title="Natijani o‘chirasizmi?"
      :text="delTarget ? `${delTarget.full_name} (${delTarget.subject}) natijasi butunlay o‘chiriladi.` : ''"
      confirm-text="O‘chirish"
      danger
      :busy="deleting"
      @confirm="doDelete"
      @cancel="delTarget = null"
    />
  </section>
</template>

<style scoped>
.res { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; }

.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (min-width: 820px) { .stats { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
.stat { padding: 16px 18px; display: grid; gap: 4px; }
.stat .k { display: inline-flex; align-items: center; gap: 8px; font-size: 0.88rem; min-width: 0; overflow-wrap: anywhere; font-weight: 600; color: var(--ink-soft); }
.stat b { font-family: var(--f-display); font-size: clamp(1.9rem, 5vw, 2.6rem); line-height: 1.05; letter-spacing: -0.02em; }
.stat.live .dot { display: none; }
.stat.live.on .dot { display: inline-block; }
.stat.live.on { border-color: #b9cdf6; background: linear-gradient(#f5f8ff, #fff); }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #2f6fdc; position: relative; }
.dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #2f6fdc; animation: ping 1.6s ease-out infinite; }
@keyframes ping { from { transform: scale(0.5); opacity: 0.9; } to { transform: scale(1.6); opacity: 0; } }

.bars { padding: 18px 20px 12px; }
.bars h2 { font-size: 1.15rem; margin-bottom: 10px; }
.bars ul { display: grid; gap: 4px 36px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); }
.bars li { display: grid; grid-template-columns: minmax(90px, 160px) 1fr 74px; align-items: center; gap: 12px; padding: 6px 0; }
.nm { font-size: 0.92rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { height: 12px; border-radius: 99px; background: #eaeff7; overflow: hidden; }
.track i, .pbar i { display: block; height: 100%; border-radius: 99px; transition: width 0.9s var(--ease-out); }
.g { background: var(--green); } .y { background: #e5a416; } .r { background: var(--red); }
.val { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
.val small { display: block; font-weight: 500; font-size: 0.74rem; color: var(--ink-soft); }

.filters { padding: 14px 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; overflow: visible; }
.fld { display: grid; gap: 4px; min-width: 0; }
.fld.wide { grid-column: 1 / -1; }
.fld label { font-size: 0.78rem; font-weight: 700; color: var(--ink-soft); }
@media (max-width: 440px) { .filters { grid-template-columns: minmax(0, 1fr); padding: 12px; } }
@media (min-width: 1000px) { .filters { grid-template-columns: 1.6fr 1.3fr 1.1fr 1fr 0.9fr 0.9fr; } .fld.wide { grid-column: auto; } }

.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.upd { display: inline-flex; align-items: center; gap: 8px; min-height: 24px; font-size: 0.85rem; color: var(--ink-soft); }
.upd .spinner { width: 0.9em; height: 0.9em; border-width: 2px; }
.acts { display: flex; gap: 12px; flex-wrap: wrap; }

.tablebox { overflow-x: auto; position: relative; }
table { width: 100%; min-width: 1040px; border-collapse: collapse; font-size: 0.92rem; }
th { position: sticky; top: 0; text-align: left; padding: 12px 14px; font-size: 0.8rem; font-weight: 700; color: var(--ink-soft); background: #f6f8fc; border-bottom: 1.5px solid var(--line); white-space: nowrap; }
td { padding: 11px 14px; border-bottom: 1px solid #edf1f7; vertical-align: top; }
td small { display: block; font-size: 0.78rem; color: var(--ink-soft); margin-top: 1px; }
td small.plain { display: inline; font-size: 0.88rem; margin: 0; }
.n { width: 44px; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
tbody tr { cursor: pointer; transition: background-color 0.15s; }
tbody tr:hover, tbody tr:focus-visible { background: #f4f7fd; outline: none; }
tbody tr:last-child td { border-bottom: 0; }
.muted { color: var(--ink-soft); }

.pct { display: inline-flex; align-items: center; gap: 10px; }
.pbar { width: 64px; height: 8px; border-radius: 99px; background: #eaeff7; overflow: hidden; }
.chip { display: inline-flex; align-items: center; gap: 8px; padding: 3px 11px; border-radius: 99px; font-weight: 700; font-size: 0.82rem; white-space: nowrap; }
.chip.live { background: #e4edfd; color: #1d4ea3; }
.chip.done { background: #eef1f6; color: #4a566e; }

.row-enter-active { transition: opacity 0.35s ease, transform 0.5s var(--ease-out); transition-delay: calc(var(--i) * 28ms); }
.row-leave-active { transition: opacity 0.2s ease; }
.row-enter-from { opacity: 0; transform: translateY(10px); }
.row-leave-to { opacity: 0; }

.skel { display: grid; gap: 10px; padding: 16px; }
.skel i { height: 38px; border-radius: 10px; background: linear-gradient(90deg, #eef2f8 25%, #f8faff 50%, #eef2f8 75%); background-size: 200% 100%; animation: shimmer 1.3s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.empty { display: grid; gap: 4px; justify-items: center; text-align: center; padding: 46px 20px; }
.empty b { font-family: var(--f-display); font-size: 1.25rem; }
.empty span { color: var(--ink-soft); max-width: 30em; }
.stg { display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; background: #eef0ff; color: #1420e6; white-space: nowrap; }
.stg.subject { background: #eaf6f0; color: #17734a; }
</style>
