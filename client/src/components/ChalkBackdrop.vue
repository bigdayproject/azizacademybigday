<script setup>
// Fanlar dunyosidan belgilar: matematika, kimyo, tillar (koreys, arab, rus), dasturlash.
const marks = [
  { t: 'a²+b²=c²', x: 5, y: 14, s: 30, d: 26, r: -8 },
  { t: '∑', x: 84, y: 9, s: 66, d: 32, r: 6 },
  { t: 'H₂O', x: 13, y: 70, s: 34, d: 24, r: 5 },
  { t: '한', x: 90, y: 60, s: 58, d: 30, r: -4 },
  { t: 'ع', x: 47, y: 5, s: 60, d: 28, r: 3 },
  { t: 'Ж', x: 71, y: 83, s: 50, d: 34, r: -6 },
  { t: '</>', x: 29, y: 88, s: 34, d: 22, r: 4 },
  { t: 'π', x: 58, y: 44, s: 54, d: 36, r: -3 },
  { t: 'E=mc²', x: 3, y: 44, s: 28, d: 30, r: -5 },
  { t: 'ƒ(x)', x: 77, y: 35, s: 30, d: 25, r: 7 },
  { t: 'CO₂', x: 40, y: 64, s: 26, d: 29, r: -9 },
  { t: 'Aa', x: 21, y: 30, s: 46, d: 33, r: 5 },
];
</script>

<template>
  <div class="chalk" aria-hidden="true">
    <span
      v-for="(m, i) in marks"
      :key="i"
      :style="{ left: m.x + '%', top: m.y + '%', fontSize: m.s + 'px', '--d': m.d + 's', '--r': m.r + 'deg', '--o': -(i * 3) + 's' }"
    >{{ m.t }}</span>
  </div>
</template>

<style scoped>
.chalk { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
.chalk span {
  position: absolute; font-family: var(--f-display); font-weight: 600; color: var(--chalk); opacity: 0.07;
  transform: rotate(var(--r)); white-space: nowrap;
  animation: drift var(--d) ease-in-out infinite alternate; animation-delay: var(--o);
}
@keyframes drift {
  to { transform: translate(16px, -26px) rotate(calc(var(--r) + 5deg)); }
}
</style>
