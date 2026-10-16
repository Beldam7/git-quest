import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD3 } from './world3';
import { WORLD4 } from './world4';
import { WORLD5 } from './world5';
import { WORLD6 } from './world6';
import { WORLD7 } from './world7';
import { WORLD8 } from './world8';
import type { WorldDef } from '../types';

export const WORLD_DEFS: Record<number, WorldDef> = {
  1: WORLD1, 2: WORLD2, 3: WORLD3, 4: WORLD4, 5: WORLD5, 6: WORLD6, 7: WORLD7, 8: WORLD8,
};

export function getWorldDef(id: number): WorldDef {
  return WORLD_DEFS[id] ?? WORLD1;
}
