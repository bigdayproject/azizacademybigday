<script setup>
import { computed } from 'vue';
import Digit from './Digit.vue';

const props = defineProps({
  remaining: { type: Number, required: true }, // soniya
  total: { type: Number, default: 3600 },
});

const R = 19;
const C = 2 * Math.PI * R;
const frac = computed(() => Math.min(1, Math.max(0, props.remaining / props.total)));
const secs = computed(() => Math.max(0, Math.ceil(props.remaining)));
const mm = computed(() => String(Math.floor(secs.value / 60)).padStart(2, '0'));
const ss = computed(() => String(secs.value % 60).padStart(2, '0'));
const level = computed(() => (secs.value <= 60 ? 'crit' : secs.value <= 300 ? 'warn' : 'ok'));
</script>

<template>
  <div class="timer" :class="level" role="timer" :aria-label="`Qolgan vaqt: ${mm} daqiqa ${ss} soniya`">
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle class="track" cx="24" cy="24" :r="R" />
      <circle class="arc" cx="24" cy="24" :r="R" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - frac)" />
    </svg>
    <div class="digits" aria-hidden="true">
      <Digit :v="mm[0]" /><Digit :v="mm[1]" /><span class="colon">:</span><Digit :v="ss[0]" /><Digit :v="ss[1]" />
    </div>
  </div>
</template>

<style scoped>
.timer {
  --c: var(--marker);
  display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px 4px 5px; border-radius: 99px;
  background: rgba(238, 243, 236, 0.1); color: var(--chalk);
  font-family: var(--f-display); font-weight: 700; font-size: 1.25rem; font-variant-numeric: tabular-nums;
  transition: background-color 0.4s, color 0.4s;
}
svg { width: 40px; height: 40px; flex: none; transform: rotate(-90deg); }
.track { fill: none; stroke: rgba(238, 243, 236, 0.18); stroke-width: 4; }
.arc { fill: none; stroke: var(--c); stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset 0.4s linear, stroke 0.4s; }
.digits { display: inline-flex; align-items: center; }
.colon { margin: 0 1px; animation: blink 1s steps(1) infinite; }
.warn { --c: #ff9d3d; background: rgba(255, 157, 61, 0.16); }
.crit { --c: #ff6b63; background: rgba(255, 107, 99, 0.2); color: #ffd9d6; animation: pulse 1s ease-in-out infinite; }
@keyframes blink { 50% { opacity: 0.25; } }
@keyframes pulse { 50% { transform: scale(1.05); } }
</style>
