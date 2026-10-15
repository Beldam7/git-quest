import { MockAuthAdapter, StartNgAuthAdapter } from './AuthAdapter';
import type { AuthAdapter } from './AuthAdapter';
import { LocalCharacterAppearanceAdapter, StartNgCharacterAppearanceAdapter } from './CharacterAppearanceAdapter';
import type { CharacterAppearanceAdapter } from './CharacterAppearanceAdapter';
import { LocalProgressAdapter, StartNgProgressAdapter } from './ProgressAdapter';
import type { ProgressAdapter } from './ProgressAdapter';

/**
 * 'mock'    — development-only adapters (fake sign-in, localStorage progress, editable local styling).
 * 'startng' — real Start.ng adapters. These are UNIMPLEMENTED placeholders until the
 *             platform contract is verified (see docs/START_NG_INTEGRATION.md).
 */
export type AdapterMode = 'mock' | 'startng';

/**
 * Selection rules (deliberately conservative):
 * - VITE_ADAPTER_MODE=mock|startng always wins.
 * - Otherwise `vite dev` uses mocks and any production build uses 'startng',
 *   so a production bundle can never silently ship with a fake login.
 */
export function resolveAdapterMode(): AdapterMode {
  const explicit = import.meta.env.VITE_ADAPTER_MODE as string | undefined;
  if (explicit === 'mock' || explicit === 'startng') return explicit;
  return import.meta.env.DEV ? 'mock' : 'startng';
}

export interface Adapters {
  mode: AdapterMode;
  auth: AuthAdapter;
  progress: ProgressAdapter;
  appearance: CharacterAppearanceAdapter;
  /** Character styling is editable in-game only with the dev mock; Start.ng owns it in production. */
  appearanceEditable: boolean;
}

export function createAdapters(mode: AdapterMode = resolveAdapterMode()): Adapters {
  if (mode === 'mock') {
    return {
      mode,
      auth: new MockAuthAdapter(),
      progress: new LocalProgressAdapter(),
      appearance: new LocalCharacterAppearanceAdapter(),
      appearanceEditable: true,
    };
  }
  return {
    mode,
    auth: new StartNgAuthAdapter(),
    progress: new StartNgProgressAdapter(),
    appearance: new StartNgCharacterAppearanceAdapter(),
    appearanceEditable: false,
  };
}
