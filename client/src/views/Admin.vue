<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api } from '../utils/api.js';
import AdminLogin from '../components/AdminLogin.vue';
import AdminDashboard from '../components/AdminDashboard.vue';

const state = ref('loading'); // loading | login | dash

// Panel ichida yorug mavzu, kirish sahifasida esa doska
watch(state, (s) => document.body.classList.toggle('light', s === 'dash'), { immediate: true });
onBeforeUnmount(() => document.body.classList.remove('light'));

onMounted(async () => {
  try {
    const r = await api.get('/api/admin/me');
    state.value = r.admin ? 'dash' : 'login';
  } catch {
    state.value = 'login';
  }
});
</script>

<template>
  <div class="admin-root">
    <Transition name="phase" mode="out-in">
      <AdminLogin v-if="state === 'login'" @ok="state = 'dash'" />
      <AdminDashboard v-else-if="state === 'dash'" @logout="state = 'login'" />
      <div v-else class="wait" aria-label="Yuklanmoqda"><span class="spinner"></span></div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-root { min-height: 100dvh; }
.wait { min-height: 100dvh; display: grid; place-items: center; font-size: 2rem; color: var(--chalk-dim); }
</style>
