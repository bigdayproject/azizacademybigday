<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  value: { type: Number, default: null },
  decimals: { type: Number, default: 0 },
  suffix: { type: String, default: '' },
  duration: { type: Number, default: 800 },
});

const shown = ref(props.value == null ? null : 0);
let raf = 0;

function run(to) {
  cancelAnimationFrame(raf);
  if (to == null) { shown.value = null; return; }
  const from = shown.value ?? 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { shown.value = to; return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / props.duration);
    shown.value = from + (to - from) * (1 - Math.pow(1 - p, 3));
    if (p < 1) raf = requestAnimationFrame(step);
    else shown.value = to;
  };
  raf = requestAnimationFrame(step);
}

watch(() => props.value, run, { immediate: true });
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <span class="num">{{ shown == null ? '—' : shown.toFixed(decimals) + suffix }}</span>
</template>

<style scoped>
.num { font-variant-numeric: tabular-nums; }
</style>
