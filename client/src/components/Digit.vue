<script setup>
defineProps({ v: { type: String, required: true } });
</script>

<template>
  <span class="d">
    <Transition name="roll" mode="out-in">
      <span :key="v" class="n">{{ v }}</span>
    </Transition>
  </span>
</template>

<style scoped>
.d { display: inline-block; width: 0.64em; height: 1.2em; overflow: hidden; text-align: center; vertical-align: top; }
.n { display: block; line-height: 1.2; }
.roll-enter-active, .roll-leave-active { transition: transform 0.16s ease, opacity 0.16s ease; }
.roll-enter-from { transform: translateY(70%); opacity: 0; }
.roll-leave-to { transform: translateY(-70%); opacity: 0; }
</style>
