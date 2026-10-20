<script setup>
import Toasts from './components/Toasts.vue';
</script>

<template>
  <div class="board-bg" aria-hidden="true"></div>
  <RouterView v-slot="{ Component, route }">
    <Transition name="route" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
  <Toasts />
</template>
