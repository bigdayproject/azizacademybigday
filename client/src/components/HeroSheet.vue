<script setup>
import { ref } from 'vue';

const options = ['8', '6', '4', '10'];
const rx = ref(0);
const ry = ref(0);

function onMove(e) {
  if (e.pointerType === 'touch') return;
  const r = e.currentTarget.getBoundingClientRect();
  ry.value = ((e.clientX - r.left) / r.width - 0.5) * 10;
  rx.value = -((e.clientY - r.top) / r.height - 0.5) * 8;
}
function reset() {
  rx.value = 0;
  ry.value = 0;
}
</script>

<template>
  <div
    class="stack"
    aria-hidden="true"
    :style="{ transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)` }"
    @pointermove="onMove"
    @pointerleave="reset"
  >
    <div class="sheet paper s3"></div>
    <div class="sheet paper s2"></div>

    <article class="sheet paper margin s1">
      <header>
        <span class="subj">Matematika</span>
        <span class="time">58:12</span>
      </header>
      <p class="q">2 + 2 × 2 = ?</p>
      <ul>
        <li v-for="(o, i) in options" :key="i" :class="{ pick: i === 1 }">
          <span class="l">
            {{ 'ABCD'[i] }}
            <svg v-if="i === 1" class="ring" viewBox="0 0 40 36">
              <path pathLength="1" d="M6 20 C4 9 14 3 23 4 C33 5 38 14 35 23 C32 32 20 34 12 30 C6 27 4 21 5 15 C6 11 9 8 13 6" />
            </svg>
          </span>
          <span class="t">{{ o }}</span>
          <svg v-if="i === 1" class="tick" viewBox="0 0 24 24" width="22" height="22">
            <path pathLength="1" d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </li>
      </ul>
      <div class="dots"><i v-for="n in 12" :key="n" :class="{ on: n < 7 }"></i></div>
    </article>
  </div>
</template>

<style scoped>
.stack {
  position: relative; width: min(100%, 380px); aspect-ratio: 4 / 4.6; margin-inline: auto;
  transition: transform 0.25s var(--ease-out);
}
.sheet { position: absolute; inset: 0; }
.s3 { transform: translate(20px, 12px) rotate(6deg); opacity: 0.55; }
.s2 { transform: translate(-14px, 8px) rotate(-4.5deg); opacity: 0.8; }
.s1 { padding: 22px 22px 20px 26px; display: flex; flex-direction: column; animation: float 5.5s ease-in-out infinite alternate; }
@keyframes float { from { transform: translateY(0) rotate(-0.6deg); } to { transform: translateY(-9px) rotate(0.8deg); } }

header { display: flex; justify-content: space-between; align-items: center; padding-left: 20px; font-weight: 700; font-size: 0.9rem; }
.subj { font-family: var(--f-display); font-size: 1.05rem; }
.time { background: var(--ink); color: #fff; border-radius: 99px; padding: 2px 10px; font-variant-numeric: tabular-nums; font-size: 0.82rem; }
.q { font-family: var(--f-display); font-weight: 700; font-size: clamp(1.7rem, 5vw, 2.15rem); line-height: 1.1; margin: 26px 0 20px 20px; }
ul { display: grid; gap: 10px; margin-left: 20px; }
li {
  position: relative; display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 12px;
  border: 1.5px solid var(--line); background: #fff linear-gradient(var(--pen-soft), var(--pen-soft)) no-repeat left / 0% 100%;
  font-weight: 600; font-size: 1.05rem;
}
li.pick { animation: pick-row 7s ease-in-out infinite; }
.l { position: relative; flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--grid); font-weight: 800; font-size: 0.85rem; }
.ring { position: absolute; left: -6px; top: -4px; width: 40px; height: 36px; overflow: visible; pointer-events: none; }
.ring path { fill: none; stroke: var(--pen); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 7s ease-in-out infinite; }
.tick { margin-left: auto; }
.tick path { fill: none; stroke: var(--green); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: tick 7s ease-in-out infinite; }
.dots { margin: auto 0 0 20px; display: flex; gap: 6px; padding-top: 16px; }
.dots i { width: 14px; height: 14px; border-radius: 4px; background: var(--grid); }
.dots i.on { background: var(--pen); }

@keyframes draw {
  0%, 14% { stroke-dashoffset: 1; opacity: 1; }
  30%, 86% { stroke-dashoffset: 0; opacity: 1; }
  95%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes pick-row {
  0%, 27% { background-size: 0% 100%; border-color: var(--line); }
  42%, 86% { background-size: 100% 100%; border-color: var(--pen); }
  96%, 100% { background-size: 100% 100%; border-color: var(--line); opacity: 1; }
}
@keyframes tick {
  0%, 34% { stroke-dashoffset: 1; opacity: 1; }
  44%, 86% { stroke-dashoffset: 0; opacity: 1; }
  95%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
</style>
