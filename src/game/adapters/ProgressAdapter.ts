import type { GameProgress } from '../types';

export interface ProgressAdapter {
  load(userId: string): Promise<GameProgress | null>;
  save(userId: string, progress: GameProgress): Promise<boolean>;
  clear(userId: string): Promise<boolean>;
}

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

export class StartNgProgressAdapter implements ProgressAdapter {
  // TODO: START_NG_INTEGRATION — The actual Start.ng persistence mechanism is not yet verified.
  // The following are UNKNOWN and must be determined from official documentation:
  // - UNVERIFIED: Whether Start.ng provides a database/storage API for games
  // - UNVERIFIED: Whether progress should be stored via a backend API or platform SDK
  // - UNVERIFIED: The authorization model for per-user progress storage
  // - UNVERIFIED: How to ensure users cannot read or overwrite another user's progress
  // - UNVERIFIED: Data format and schema requirements from the platform
  // - UNVERIFIED: Rate limits, quotas, or size constraints
  // - UNVERIFIED: Whether Supabase or another backend should be used for progress storage
  //
  // SECURITY REQUIREMENTS (must be satisfied regardless of platform):
  // - Progress must be scoped to the authenticated user's stable ID
  // - Users must NOT be able to read or overwrite another user's progress
  // - Client-side user IDs must not be trusted for authorization
  // - Save failures must not overwrite existing progress
  // - Loading must handle corrupted data gracefully

  async load(_userId: string): Promise<GameProgress | null> {
    // TODO: Load progress from the verified Start.ng persistence mechanism.
    // Must validate that the requesting user is authorized to read this data.
    throw new Error(
      'StartNgProgressAdapter.load is not available until the Start.ng persistence contract is verified. ' +
        'Use LocalProgressAdapter for development.'
    );
  }

  async save(_userId: string, _progress: GameProgress): Promise<boolean> {
    // TODO: Save progress via the verified Start.ng persistence mechanism.
    // Must enforce server-side authorization — do not trust client-supplied user IDs.
    throw new Error(
      'StartNgProgressAdapter.save is not available until the Start.ng persistence contract is verified. ' +
        'Use LocalProgressAdapter for development.'
    );
  }

  async clear(_userId: string): Promise<boolean> {
    // TODO: Clear progress via the verified Start.ng persistence mechanism.
    throw new Error(
      'StartNgProgressAdapter.clear is not available until the Start.ng persistence contract is verified. ' +
        'Use LocalProgressAdapter for development.'
    );
  }
}
