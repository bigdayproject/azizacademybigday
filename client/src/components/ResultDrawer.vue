<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';

const props = defineProps({ row: { type: Object, default: null } });
const emit = defineEmits(['close', 'delete']);

const R = 44;
const C = 2 * Math.PI * R;
const done = computed(() => props.row?.status === 'finished');
const pct = computed(() => (done.value ? props.row.percent : 0));
const tone = computed(() => (pct.value >= 70 ? 'g' : pct.value >= 50 ? 'y' : 'r'));

function onKey(e) {
  if (e.key === 'Escape') emit('close');
}
watch(
  () => props.row,
  (r) => {
    if (r) document.addEventListener('keydown', onKey);
    else document.removeEventListener('keydown', onKey);
  },
  { immediate: true },
);
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="row" class="back" @pointerdown.self="emit('close')">
        <aside class="panel" role="dialog" aria-modal="true" :aria-label="row.full_name">
          <button class="x" type="button" aria-label="Yopish" @click="emit('close')">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
          </button>

          <h2>{{ row.full_name }}</h2>
          <p class="sub">{{ row.subject }}, {{ row.branch }}</p>

          <div class="score">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="bg" cx="50" cy="50" :r="R" />
              <circle v-if="done" class="fg" :class="tone" cx="50" cy="50" :r="R" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - pct / 100)" :style="{ '--c': C }" />
            </svg>
            <div class="mid">
              <b v-if="done">{{ row.percent }}%</b>
              <b v-else>—</b>
              <span v-if="done">{{ row.correct }} / {{ row.total }} to‘g‘ri</span>
              <span v-else>{{ row.answered }} / {{ row.total }} javob</span>
            </div>
          </div>

          <p v-if="!done" class="live"><i class="dot" aria-hidden="true"></i>Test hozir jarayonda, natija yakunlangach chiqadi.</p>

          <dl>
            <div><dt>Bosqich</dt><dd>{{ row.stage_label }}</dd></div>
            <div><dt>Boshlagan vaqti</dt><dd>{{ row.started }}</dd></div>
            <div><dt>Tugatgan vaqti</dt><dd>{{ row.finished || '—' }}</dd></div>
            <div><dt>Sarflagan vaqt</dt><dd>{{ row.duration }}</dd></div>
            <div><dt>Qurilma</dt><dd>{{ row.device_type }}{{ row.device_model ? ', ' + row.device_model : '' }}</dd></div>
            <div><dt>Operatsion tizim</dt><dd>{{ row.os }}</dd></div>
            <div><dt>Brauzer</dt><dd>{{ row.browser }}</dd></div>
            <div v-if="row.screen"><dt>Ekran</dt><dd>{{ row.screen }}</dd></div>
            <div><dt>IP manzil</dt><dd>{{ row.ip || '—' }}</dd></div>
          </dl>

          <button class="btn btn-danger sm del" type="button" @click="emit('delete', row)">Natijani o‘chirish</button>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.back { position: fixed; inset: 0; z-index: 220; background: rgba(13, 39, 35, 0.45); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; }
.panel { position: relative; width: min(100%, 420px); height: 100%; overflow-y: auto; background: #fff; color: var(--ink); padding: 28px 24px 30px; box-shadow: -24px 0 50px -20px rgba(0, 0, 0, 0.4); }
.x { position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; border: 0; background: #f1f4f9; color: var(--ink-soft); cursor: pointer; transition: background-color 0.2s, transform 0.3s var(--ease-spring); }
.x:hover { background: #e4e9f2; transform: rotate(90deg); }
h2 { font-size: 1.65rem; padding-right: 44px; }
.sub { color: var(--ink-soft); margin-top: 4px; }

.score { position: relative; width: 190px; height: 190px; margin: 26px auto 14px; }
.score svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.bg { fill: none; stroke: #eaeff7; stroke-width: 9; }
.fg { fill: none; stroke-width: 9; stroke-linecap: round; animation: ring 1.1s var(--ease-out) 0.15s backwards; }
.fg.g { stroke: var(--green); } .fg.y { stroke: #e5a416; } .fg.r { stroke: var(--red); }
@keyframes ring { from { stroke-dashoffset: var(--c); } }
.mid { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.mid b { font-family: var(--f-display); font-size: 2.6rem; line-height: 1; }
.mid span { color: var(--ink-soft); font-size: 0.9rem; margin-top: 4px; }

.live { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #e8f0fe; color: #1d4ea3; font-size: 0.9rem; font-weight: 600; }
.dot { flex: none; width: 9px; height: 9px; border-radius: 50%; background: #2f6fdc; animation: blink 1.2s ease-in-out infinite; }
@keyframes blink { 50% { opacity: 0.3; } }

dl { margin: 18px 0 22px; display: grid; }
dl div { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid #edf1f7; }
dt { color: var(--ink-soft); font-size: 0.9rem; }
dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.del { width: 100%; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }
.drawer-enter-active .panel { transition: transform 0.5s var(--ease-out); }
.drawer-leave-active .panel { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .panel, .drawer-leave-to .panel { transform: translateX(60px); }
</style>
