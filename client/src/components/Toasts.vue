<script setup>
import { toasts } from '../utils/toast.js';
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" role="status">
        <svg v-if="t.type === 'success'" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="t.type === 'error'" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M10 4v7M10 15.2v.1" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
        </svg>
        <span>{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed; left: 0; right: 0; bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 300; display: flex; flex-direction: column; align-items: center; gap: 10px;
  pointer-events: none; padding: 0 14px;
}
.toast {
  display: flex; align-items: center; gap: 10px; max-width: 520px;
  padding: 12px 18px 12px 14px; border-radius: 12px; font-weight: 600; font-size: 0.95rem;
  background: var(--board); color: var(--chalk); border-left: 5px solid var(--marker);
  box-shadow: 0 16px 34px -14px rgba(0, 0, 0, 0.55);
}
.toast.success { border-left-color: #3ecf8e; }
.toast.error { border-left-color: #ff6b63; }
.toast svg { flex: none; }
.toast-enter-active { transition: transform 0.5s var(--ease-spring), opacity 0.25s; }
.toast-leave-active { transition: transform 0.25s ease, opacity 0.25s; }
.toast-enter-from { opacity: 0; transform: translateY(26px) scale(0.94); }
.toast-leave-to { opacity: 0; transform: translateY(10px) scale(0.97); }
.toast-move { transition: transform 0.3s var(--ease-out); }
</style>
