import { useSyncExternalStore } from 'react';

/** Graphics quality: high = shadows + full particles; medium = no shadows; low = also lower resolution and fewer effects. */
export type Quality = 'high' | 'medium' | 'low';
const KEY = 'gitquest:graphics'; // device-level preference

function initial(): Quality {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'high' || v === 'medium' || v === 'low') return v;
  } catch { /* storage unavailable */ }
  // Phones and tablets start on low; desktops on high.
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
}

let current: Quality = initial();
const listeners = new Set<() => void>();

export const graphicsStore = {
  get: (): Quality => current,
  set(q: Quality): void {
    current = q;
    try { localStorage.setItem(KEY, q); } catch { /* ignore */ }
    listeners.forEach((l) => l());
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
};

export function useGraphicsQuality(): Quality {
  return useSyncExternalStore(graphicsStore.subscribe, graphicsStore.get);
}
