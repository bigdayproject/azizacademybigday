<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../utils/api.js';
import { toast } from '../utils/toast.js';
import ChalkBackdrop from '../components/ChalkBackdrop.vue';
import StartForm from '../components/StartForm.vue';
import ExamRun from '../components/ExamRun.vue';
import DoneScreen from '../components/DoneScreen.vue';
import BreakScreen from '../components/BreakScreen.vue';

const KEY = 'tt_token';
const phase = ref('loading'); // loading | form | run | break (1-bosqich tugagan, 2-bosqich kutmoqda) | done
const meta = ref({ professions: [], staff_professions: [], subjects: [], branches: [], duration_min: 60, academic_duration_min: 60, academic_ready: false });
const metaError = ref('');
const attempt = ref(null);

onMounted(async () => {
  try {
    meta.value = await api.get('/api/meta');
  } catch (e) {
    metaError.value = e.message;
  }

  // Sahifa yangilangan bo‘lsa, boshlangan testni davom ettiramiz
  const token = localStorage.getItem(KEY);
  if (token) {
    try {
      const st = await api.get('/api/attempt/' + encodeURIComponent(token));
      if (st.finished && st.next_pending) {
        attempt.value = st;
        phase.value = 'break';
        return;
      }
      if (st.finished) {
        localStorage.removeItem(KEY);
        phase.value = 'done';
        return;
      }
      attempt.value = st;
      phase.value = 'run';
      return;
    } catch (e) {
      if (e.status === 404) localStorage.removeItem(KEY);
    }
  }
  phase.value = 'form';
});

function onStarted(st) {
  localStorage.setItem(KEY, st.token);
  if (st.finished && st.next_pending) {
    attempt.value = st;
    phase.value = 'break';
    return;
  }
  if (st.resumed) toast('Boshlangan testingiz topildi, davom ettiramiz', 'success', 4200);
  attempt.value = st;
  phase.value = 'run';
}

async function onDone(res) {
  if (res?.next_pending) {
    // 1-bosqich tugadi: 2-bosqich haqida ma’lumot bilan yangi holatni olamiz
    try {
      attempt.value = await api.get('/api/attempt/' + encodeURIComponent(attempt.value.token));
      phase.value = 'break';
      return;
    } catch { /* aloqa bo‘lmasa, quyida oddiy yakunga o‘tamiz; qaytib kirganda 2-bosqich taklif qilinadi */ }
  }
  localStorage.removeItem(KEY);
  phase.value = 'done';
}
</script>

<template>
  <div class="test-page">
    <ChalkBackdrop v-if="phase === 'form' || phase === 'done'" />
    <div class="stage">
      <Transition name="phase" mode="out-in">
        <StartForm v-if="phase === 'form'" :meta="meta" :load-error="metaError" @started="onStarted" />
        <ExamRun v-else-if="phase === 'run'" :key="attempt.token" :attempt="attempt" :duration-sec="attempt.duration_sec" @done="onDone" />
        <BreakScreen v-else-if="phase === 'break'" :attempt="attempt" @started="onStarted" />
        <DoneScreen v-else-if="phase === 'done'" />
        <div v-else class="loading" aria-label="Yuklanmoqda"><span class="spinner"></span></div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.test-page { position: relative; min-height: 100dvh; }
.stage { position: relative; z-index: 1; }
.loading { min-height: 100dvh; display: grid; place-items: center; color: var(--chalk-dim); font-size: 2rem; }
</style>
