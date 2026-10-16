import { MockAuthAdapter, StartNgAuthAdapter } from './AuthAdapter';
import type { AuthAdapter } from './AuthAdapter';
import { LocalCharacterAppearanceAdapter, StartNgCharacterAppearanceAdapter } from './CharacterAppearanceAdapter';
import type { CharacterAppearanceAdapter } from './CharacterAppearanceAdapter';
import { LocalProgressAdapter } from './ProgressAdapter';
import type { ProgressAdapter } from './ProgressAdapter';
import { LocalLeaderboardAdapter, StartNgLeaderboardAdapter } from './LeaderboardAdapter';
import type { LeaderboardAdapter } from './LeaderboardAdapter';

/**
 * 'mock'    — development-only adapters (fake sign-in, localStorage progress, editable local styling).
 * 'startng' — the real start.ng adapters (player, character and leaderboard through start.ng's connect
 *             page; progress saved in the browser). Verified against the platform docs, see
 *             docs/START_NG_INTEGRATION.md. Off start.ng (local play) it runs as an offline guest.
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
  leaderboard: LeaderboardAdapter;
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
      leaderboard: new LocalLeaderboardAdapter(),
      appearanceEditable: true,
    };
  }
  // Production: start.ng supplies the player, their character and the shared leaderboard.
  // Progress is saved in this browser (start.ng has no cloud save for games).
  const appearance = new StartNgCharacterAppearanceAdapter();
  const auth = new StartNgAuthAdapter((style) => appearance.applyStyle(style));
  return {
    mode,
    auth,
    progress: new LocalProgressAdapter(),
    appearance,
    leaderboard: new StartNgLeaderboardAdapter(() => auth.getUser()),
    appearanceEditable: false,
  };
}
