import type { GameProgress } from '../types';

export interface ProgressAdapter {
  load(userId: string): Promise<GameProgress | null>;
  save(userId: string, progress: GameProgress): Promise<boolean>;
  clear(userId: string): Promise<boolean>;
}

/**
 * Saves progress in this browser, separately for each player id.
 *
 * start.ng does not offer cloud saves to games (docs, "Good to know": localStorage only lives in one browser),
 * so this is the production persistence too: your save lives on the device you play on. Only things other
 * players should see (scores) are sent to start.ng, through the leaderboard adapter.
 */
export class LocalProgressAdapter implements ProgressAdapter {
  private storageKey = 'gitquest:progress';

  private userKey(userId: string): string {
    return `${this.storageKey}:${userId}`;
  }

  async load(userId: string): Promise<GameProgress | null> {
    try {
      const raw = localStorage.getItem(this.userKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameProgress;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.unlockedWorlds)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async save(userId: string, progress: GameProgress): Promise<boolean> {
    try {
      const toSave: GameProgress = {
        ...progress,
        lastSavedAt: Date.now(),
      };
      localStorage.setItem(this.userKey(userId), JSON.stringify(toSave));
      return true;
    } catch {
      return false;
    }
  }

  async clear(userId: string): Promise<boolean> {
    try {
      localStorage.removeItem(this.userKey(userId));
      return true;
    } catch {
      return false;
    }
  }
}
