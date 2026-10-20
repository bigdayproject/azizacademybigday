<script setup>
// Al Aziz Academy emblemasi: to‘rt bo‘lak qiya yo‘nalishda surilib kelib, bir-biriga yig‘iladi.
const parts = [
  'M277 30h24L224 322h-59z',
  'M301 30h26l82 292h-36z',
  'M350 30h28l94 292h-42z',
  'M232 232h172v24H232z',
];
</script>

<template>
  <svg class="emblem" viewBox="140 10 360 332" role="img" aria-label="Al Aziz Academy emblemasi">
    <g class="ghost" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
      <path v-for="(d, i) in parts" :key="'g' + i" :d="d" />
    </g>
    <g class="solid" fill="currentColor">
      <path v-for="(d, i) in parts" :key="'s' + i" :d="d" :style="{ '--i': i }" />
    </g>
  </svg>
</template>

<style scoped>
.emblem { display: block; width: 100%; height: auto; overflow: visible; color: #fff; }
.ghost { opacity: 0.38; transform: translate(26px, -20px); }
.solid path {
  transform-box: fill-box;
  opacity: 0;
  animation: assemble 1.1s var(--ease-out) forwards;
  animation-delay: calc(0.15s + var(--i) * 0.14s);
}
/* Yig‘ilish yo‘nalishi emblemadagi qiya yo‘l-yo‘l bilan bir xil (taxminan 15° qiyalik) */
@keyframes assemble {
  from { opacity: 0; transform: translate(70px, 150px); }
  60% { opacity: 1; }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .solid path { animation: none; opacity: 1; }
}
</style>
