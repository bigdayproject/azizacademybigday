import { reactive } from 'vue';

export const toasts = reactive([]);
let nextId = 0;

/** type: 'info' | 'success' | 'error' */
export function toast(text, type = 'info', ms = 3600) {
  const item = { id: ++nextId, text, type };
  toasts.push(item);
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === item.id);
    if (i > -1) toasts.splice(i, 1);
  }, ms);
}
