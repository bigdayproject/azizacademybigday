<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  confirmText: { type: String, default: 'Tasdiqlash' },
  cancelText: { type: String, default: 'Bekor qilish' },
  danger: Boolean,
  busy: Boolean,
});
const emit = defineEmits(['confirm', 'cancel']);
const okBtn = ref(null);

function onKey(e) {
  if (e.key === 'Escape') emit('cancel');
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      await nextTick();
      okBtn.value?.focus();
    } else {
      document.removeEventListener('keydown', onKey);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="open" class="dlg-back" @pointerdown.self="emit('cancel')">
        <div class="dlg paper" role="alertdialog" aria-modal="true" :aria-label="title">
          <h3>{{ title }}</h3>
          <p v-if="text">{{ text }}</p>
          <div class="row">
            <button class="btn btn-outline" type="button" @click="emit('cancel')">{{ cancelText }}</button>
            <button ref="okBtn" class="btn" :class="danger ? 'btn-danger' : 'btn-marker'" type="button" :disabled="busy" @click="emit('confirm')">
              <span v-if="busy" class="spinner" aria-hidden="true"></span>{{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dlg-back {
  position: fixed; inset: 0; z-index: 250; display: grid; place-items: center; padding: 18px;
  background: rgba(8, 22, 19, 0.62); backdrop-filter: blur(3px);
}
.dlg { width: 100%; max-width: 430px; padding: 26px 24px 22px; }
.dlg h3 { font-size: 1.5rem; margin-bottom: 8px; }
.dlg p { color: var(--ink-soft); margin-bottom: 4px; }
.row { display: flex; gap: 12px; margin-top: 22px; }
.row .btn { flex: 1; padding-inline: 0.8em; }

.dlg-enter-active, .dlg-leave-active { transition: opacity 0.22s ease; }
.dlg-enter-active .dlg { transition: transform 0.5s var(--ease-spring); }
.dlg-leave-active .dlg { transition: transform 0.2s ease; }
.dlg-enter-from, .dlg-leave-to { opacity: 0; }
.dlg-enter-from .dlg { transform: translateY(24px) rotate(-1.5deg) scale(0.94); }
.dlg-leave-to .dlg { transform: translateY(10px) scale(0.97); }
</style>
