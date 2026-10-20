<script setup>
defineProps({ size: { type: Number, default: 28 } });
</script>

<template>
  <svg class="logo" viewBox="150 20 340 312" :height="size" :width="size * (340 / 312)" aria-hidden="true" focusable="false">
    <g fill="currentColor">
      <path d="M277 30h24L224 322h-59z" />
      <path d="M301 30h26l82 292h-36z" />
      <path d="M350 30h28l94 292h-42z" />
      <path d="M232 232h172v24H232z" />
    </g>
  </svg>
</template>
