import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD3 } from './world3';
import { WORLD4 } from './world4';
import { WORLD5 } from './world5';
import { WORLD6 } from './world6';
import { WORLD7 } from './world7';
import { WORLD8 } from './world8';
import { SECRET101 } from './secret101';
import { SECRET102 } from './secret102';
import { SECRET103 } from './secret103';
import { SECRET104 } from './secret104';
import type { WorldDef } from '../types';

export const WORLD_DEFS: Record<number, WorldDef> = {
  1: WORLD1, 2: WORLD2, 3: WORLD3, 4: WORLD4, 5: WORLD5, 6: WORLD6, 7: WORLD7, 8: WORLD8,
  // Secret-mission maps
  101: SECRET101, 102: SECRET102, 103: SECRET103, 104: SECRET104,
};

export function getWorldDef(id: number): WorldDef {
  return WORLD_DEFS[id] ?? WORLD1;
}
