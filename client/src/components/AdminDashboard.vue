<script setup>
import Logo from './Logo.vue';
import { ref } from 'vue';
import { api } from '../utils/api.js';
import QuestionsTab from './QuestionsTab.vue';
import ResultsTab from './ResultsTab.vue';

const emit = defineEmits(['logout']);
const tab = ref('results');

async function logout() {
  try { await api.post('/api/admin/logout'); } catch { /* chiqish baribir davom etadi */ }
  emit('logout');
}
</script>

<template>
  <div class="adm">
    <header class="top">
      <div class="in">
        <div class="brand">
          <span class="mark" aria-hidden="true"><Logo :size="20" /></span>
          <b>Al Aziz Academy</b>
          <span class="tag">Admin</span>
        </div>

        <nav class="tabs" role="tablist" aria-label="Bo‘limlar">
          <i class="ind" :style="{ transform: `translateX(${tab === 'results' ? 0 : 100}%)` }"></i>
          <button role="tab" :aria-selected="tab === 'results'" :class="{ on: tab === 'results' }" @click="tab = 'results'">Natijalar</button>
          <button role="tab" :aria-selected="tab === 'questions'" :class="{ on: tab === 'questions' }" @click="tab = 'questions'">Savollar</button>
        </nav>

        <button class="out" type="button" @click="logout">
          <span>Chiqish</span>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H8M13 6l4 4-4 4M17 10H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </header>

    <main class="body">
      <Transition name="tab" mode="out-in">
        <ResultsTab v-if="tab === 'results'" />
        <QuestionsTab v-else />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.adm { min-height: 100dvh; }
.top { position: sticky; top: 0; z-index: 30; background: var(--board); color: var(--chalk); box-shadow: 0 8px 24px -16px rgba(0, 0, 0, 0.6); }
.in { max-width: 1280px; margin: 0 auto; padding: 10px 16px; display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'brand out' 'tabs tabs'; gap: 10px 12px; align-items: center; }
@media (min-width: 760px) { .in { grid-template-columns: 1fr auto 1fr; grid-template-areas: 'brand tabs out'; } .out { justify-self: end; } }

.brand { grid-area: brand; display: flex; align-items: center; gap: 10px; }
.mark { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: #fff; color: var(--pen); }
.brand b { font-family: var(--f-display); font-size: 1.1rem; }
.tag { font-size: 0.78rem; font-weight: 700; padding: 2px 9px; border-radius: 99px; background: rgba(255, 255, 255, 0.16); color: var(--marker); }

.tabs { grid-area: tabs; position: relative; display: grid; grid-template-columns: 1fr 1fr; width: 100%; max-width: 300px; justify-self: center; padding: 4px; border-radius: 12px; background: rgba(238, 243, 236, 0.09); }
.tabs button { position: relative; z-index: 1; padding: 8px 10px; border: 0; background: transparent; font-weight: 700; color: var(--chalk-dim); cursor: pointer; border-radius: 9px; transition: color 0.25s; }
.tabs button.on { color: #1a2236; }
.ind { position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 9px; background: var(--marker); transition: transform 0.45s var(--ease-spring); }

.out { grid-area: out; display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--chalk-line); background: transparent; color: var(--chalk); font-weight: 600; cursor: pointer; transition: background-color 0.2s, border-color 0.2s; }
.out:hover { background: rgba(238, 243, 236, 0.1); border-color: var(--chalk-dim); }
@media (max-width: 420px) { .out span { display: none; } }
.brand b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 360px) { .tag { display: none; } .body { padding-inline: 10px; } }

.body { max-width: 1280px; margin: 0 auto; padding: 22px 16px 70px; }
.tab-enter-active { transition: opacity 0.3s ease, transform 0.45s var(--ease-out); }
.tab-leave-active { transition: opacity 0.15s ease; }
.tab-enter-from { opacity: 0; transform: translateY(14px); }
.tab-leave-to { opacity: 0; }
</style>
