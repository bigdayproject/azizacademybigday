<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** Satrlar yoki { value, label } obyektlari ro‘yxati */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Tanlang' },
  /** Berilsa, ro‘yxat boshiga "hammasi" (bo‘sh qiymat) variantini qo‘shadi */
  allLabel: { type: String, default: null },
  id: { type: String, default: undefined },
  compact: Boolean,
  invalid: Boolean,
});
const emit = defineEmits(['update:modelValue']);

const root = ref(null);
const search = ref(null);
const list = ref(null);
const open = ref(false);
const query = ref('');
const active = ref(0);
const up = ref(false);

const fold = (s) => String(s).toLowerCase().replace(/[’‘`ʻʼ']/g, "'");

const items = computed(() => {
  const base = props.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return props.allLabel !== null ? [{ value: '', label: props.allLabel }, ...base] : base;
});
const searchable = computed(() => props.options.length > 8);
const filtered = computed(() => {
  const q = fold(query.value.trim());
  return q ? items.value.filter((i) => fold(i.label).includes(q)) : items.value;
});
const current = computed(() => items.value.find((i) => i.value === props.modelValue && i.value !== ''));
const display = computed(() => current.value?.label ?? (props.allLabel !== null ? props.allLabel : props.placeholder));
const isPlaceholder = computed(() => !current.value && props.allLabel === null);

function scrollActive() {
  nextTick(() => list.value?.querySelector('li.act')?.scrollIntoView({ block: 'nearest' }));
}

function openPanel() {
  if (open.value) return;
  const r = root.value.getBoundingClientRect();
  up.value = window.innerHeight - r.bottom < 330 && r.top > 330;
  query.value = '';
  const idx = items.value.findIndex((i) => i.value === props.modelValue);
  active.value = idx > -1 ? idx : 0;
  open.value = true;
  nextTick(() => {
    search.value?.focus({ preventScroll: true });
    scrollActive();
  });
}

function closePanel(refocus = false) {
  open.value = false;
  if (refocus) root.value?.querySelector('.sel-btn')?.focus();
}

function pick(item) {
  emit('update:modelValue', item.value);
  closePanel(true);
}

function onKey(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!open.value) return openPanel();
    active.value = Math.min(filtered.value.length - 1, active.value + 1);
    scrollActive();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!open.value) return openPanel();
    active.value = Math.max(0, active.value - 1);
    scrollActive();
  } else if (e.key === 'Enter' && open.value) {
    e.preventDefault();
    const item = filtered.value[active.value];
    if (item) pick(item);
  } else if (e.key === 'Escape' && open.value) {
    e.preventDefault();
    e.stopPropagation();
    closePanel(true);
  } else if (e.key === 'Tab') {
    closePanel();
  }
}

watch(query, () => { active.value = 0; });

function onOutside(e) {
  if (open.value && root.value && !root.value.contains(e.target)) closePanel();
}
onMounted(() => document.addEventListener('pointerdown', onOutside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside));
</script>

<template>
  <div ref="root" class="sel" :class="{ open, compact, up, invalid }">
    <button
      :id="id"
      type="button"
      class="sel-btn"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open ? closePanel() : openPanel()"
      @keydown="onKey"
    >
      <span class="sel-val" :class="{ ph: isPlaceholder }">{{ display }}</span>
      <svg class="chev" viewBox="0 0 14 9" width="14" height="9" aria-hidden="true">
        <path d="M1.5 1.5l5.5 5.5 5.5-5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Transition name="drop">
      <div v-if="open" class="sel-panel">
        <input
          v-if="searchable"
          ref="search"
          v-model="query"
          class="sel-search"
          type="search"
          placeholder="Qidirish"
          autocomplete="off"
          @keydown="onKey"
        />
        <ul ref="list" role="listbox">
          <li
            v-for="(it, i) in filtered"
            :key="it.value || '__all'"
            role="option"
            :aria-selected="it.value === modelValue"
            :class="{ on: it.value === modelValue && it.value !== '', act: i === active }"
            :style="{ '--i': Math.min(i, 12) }"
            @pointermove="active = i"
            @click="pick(it)"
          >
            <span>{{ it.label }}</span>
            <svg v-if="it.value === modelValue && it.value !== ''" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </li>
          <li v-if="!filtered.length" class="empty">Hech narsa topilmadi</li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sel { position: relative; }
.sel-btn {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0.85em 1em; text-align: left; cursor: pointer;
  background: #fff; color: var(--ink); border: 2px solid var(--ink); border-radius: 12px;
  box-shadow: 0 3px 0 var(--ink);
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.12s;
}
.sel-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.sel.open .sel-btn, .sel-btn:focus-visible { border-color: var(--pen); box-shadow: 0 3px 0 var(--pen); outline: none; }
.sel.invalid .sel-btn { border-color: var(--red); box-shadow: 0 3px 0 var(--red); }
.sel-val { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sel-val.ph { color: #8a94ab; }
.chev { flex: none; transition: transform 0.3s var(--ease-spring); }
.sel.open .chev { transform: rotate(180deg); }

.sel.compact .sel-btn { border-width: 1.5px; border-color: var(--line); box-shadow: none; padding: 0.62em 0.85em; }
.sel.compact .sel-btn:active { transform: none; }
.sel.compact.open .sel-btn, .sel.compact .sel-btn:focus-visible { border-color: var(--pen); box-shadow: 0 0 0 3px rgba(35, 86, 216, 0.15); }

.sel-panel {
  position: absolute; left: 0; right: 0; top: calc(100% + 8px); z-index: 40;
  background: #fff; color: var(--ink); border: 2px solid var(--ink); border-radius: 12px; overflow: hidden;
  box-shadow: 0 6px 0 rgba(21, 34, 61, 0.9), 0 24px 40px -16px rgba(21, 34, 61, 0.4);
  transform-origin: top center;
}
.sel.up .sel-panel { top: auto; bottom: calc(100% + 8px); transform-origin: bottom center; }
.sel.compact .sel-panel { border-width: 1.5px; border-color: var(--line); box-shadow: 0 22px 36px -14px rgba(21, 34, 61, 0.35); }
.sel-search {
  width: 100%; padding: 0.7em 1em; border: 0; border-bottom: 1.5px solid var(--line);
  background: var(--paper); outline: none; font-size: 0.95rem;
}
ul { max-height: 270px; overflow-y: auto; overscroll-behavior: contain; padding: 6px; }
li {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 0.62em 0.8em; border-radius: 8px; cursor: pointer;
  animation: li-in 0.3s var(--ease-out) backwards; animation-delay: calc(var(--i) * 22ms);
}
li.act { background: var(--pen-soft); }
li.on { font-weight: 700; color: var(--pen); }
li.empty { color: var(--ink-soft); cursor: default; animation: none; }

.drop-enter-active { transition: opacity 0.18s ease, transform 0.32s var(--ease-spring); }
.drop-leave-active { transition: opacity 0.12s ease, transform 0.14s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-8px) scaleY(0.9); }
.sel.up .drop-enter-from, .sel.up .drop-leave-to { transform: translateY(8px) scaleY(0.9); }

@keyframes li-in { from { opacity: 0; transform: translateX(-8px); } }
</style>
