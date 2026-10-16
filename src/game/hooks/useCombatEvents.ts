import { useEffect, useRef } from 'react';
import type { CombatEvent } from '../types';

/**
 * Calls `handler` once for every combat event that appears after the component mounted, in order.
 * Unlike reading only the latest event, this never skips events that were emitted in the same instant
 * (e.g. a killing blow emits `hit` and then `defeated`).
 */
export function useCombatEvents(events: CombatEvent[], handler: (e: CombatEvent) => void): void {
  const seen = useRef(events.length > 0 ? events[events.length - 1].id : 0);
  const fn = useRef(handler);
  fn.current = handler;
  useEffect(() => {
    for (const e of events) {
      if (e.id > seen.current) {
        seen.current = e.id;
        fn.current(e);
      }
    }
  }, [events]);
}
