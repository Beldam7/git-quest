import type { GameProgress } from '../types';
import { startNg } from '../platform/startng';
import type { BoardEntry } from '../platform/startng';
import { getLevelForXp, getRankForProgress } from '../data/ranks';
import type { AuthUser } from './AuthAdapter';

/**
 * Leaderboard adapter.
 *
 * - `StartNgLeaderboardAdapter` (production) uses start.ng's shared leaderboard through the connect page
 *   (VERIFIED against the platform docs). The columns are declared in `public/startng.json`:
 *   xp (ranked first), worlds, gems, secrets. start.ng keeps each signed-in player's best run and accepts
 *   only the declared whole numbers; guests can read the board but cannot save.
 * - `LocalLeaderboardAdapter` is a DEVELOPMENT-ONLY mock (this browser only, plus labelled DEMO players).
 */

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
  rank: string;
  worldsCleared: number;
  secretMissions: number;
  gems: number;
  updatedAt: number;
  /** True for the built-in sample players of the development mock. */
  demo?: boolean;
}

export interface LeaderboardAdapter {
  readonly label: string;
  readonly isMock: boolean;
  submit(entry: LeaderboardEntry): Promise<void>;
  top(limit?: number): Promise<LeaderboardEntry[]>;
}

export function entryFromProgress(userId: string, displayName: string, p: GameProgress): LeaderboardEntry {
  const worlds = new Set(p.completedChallenges.filter((c) => c.worldId > 0 && c.challengeId.endsWith('_boss')).map((c) => c.worldId));
  return {
    userId,
    displayName,
    totalXp: p.totalXp,
    level: p.level,
    rank: p.rank,
    worldsCleared: worlds.size,
    secretMissions: p.secretMissionsCompleted.length,
    gems: p.collectedGems?.length ?? 0,
    updatedAt: Date.now(),
  };
}

const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);

/** Clamp and clean an entry so malformed data can never break or flood the table. */
export function sanitizeEntry(e: Partial<LeaderboardEntry> | null | undefined): LeaderboardEntry | null {
  if (!e || typeof e.userId !== 'string' || e.userId.length === 0 || e.userId.length > 128) return null;
  const name = typeof e.displayName === 'string' ? e.displayName.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) : '';
  return {
    userId: e.userId,
    displayName: name || 'Adventurer',
    totalXp: num(e.totalXp, 1_000_000),
    level: num(e.level, 999),
    rank: typeof e.rank === 'string' ? e.rank.slice(0, 40) : '',
    worldsCleared: num(e.worldsCleared, 8),
    secretMissions: num(e.secretMissions, 99),
    gems: num(e.gems, 9999),
    updatedAt: num(e.updatedAt, Number.MAX_SAFE_INTEGER),
    demo: e.demo === true ? true : undefined,
  };
}

/** Highest XP first; ties broken by worlds cleared, then by who got there first. */
export function rankEntries(list: LeaderboardEntry[], limit = 20): LeaderboardEntry[] {
  return [...list]
    .sort((a, b) => b.totalXp - a.totalXp || b.worldsCleared - a.worldsCleared || a.updatedAt - b.updatedAt)
    .slice(0, limit);
}

const DEMO: LeaderboardEntry[] = [
  { userId: 'demo-1', displayName: 'Mira the Merger', totalXp: 980, level: 12, rank: 'Git Legend', worldsCleared: 8, secretMissions: 4, gems: 110, updatedAt: 1, demo: true },
  { userId: 'demo-2', displayName: 'Tobi Branchwalker', totalXp: 740, level: 10, rank: 'Merge Master', worldsCleared: 6, secretMissions: 2, gems: 84, updatedAt: 2, demo: true },
  { userId: 'demo-3', displayName: 'Ada Rebase', totalXp: 560, level: 8, rank: 'Branch Guardian', worldsCleared: 5, secretMissions: 2, gems: 61, updatedAt: 3, demo: true },
  { userId: 'demo-4', displayName: 'Kemi Commit', totalXp: 395, level: 6, rank: 'Branch Guardian', worldsCleared: 4, secretMissions: 1, gems: 47, updatedAt: 4, demo: true },
  { userId: 'demo-5', displayName: 'Dayo Stash', totalXp: 210, level: 4, rank: 'Commit Apprentice', worldsCleared: 2, secretMissions: 0, gems: 25, updatedAt: 5, demo: true },
  { userId: 'demo-6', displayName: 'Zed Init', totalXp: 70, level: 2, rank: 'Repository Rookie', worldsCleared: 1, secretMissions: 0, gems: 9, updatedAt: 6, demo: true },
];

export class LocalLeaderboardAdapter implements LeaderboardAdapter {
  readonly label = 'Development mock: this device only, with sample players';
  readonly isMock = true;
  private static KEY = 'gitquest:leaderboard';

  private read(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(LocalLeaderboardAdapter.KEY);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(arr) ? arr.map((e) => sanitizeEntry(e as Partial<LeaderboardEntry>)).filter((e): e is LeaderboardEntry => !!e) : [];
    } catch {
      return [];
    }
  }

  async submit(entry: LeaderboardEntry): Promise<void> {
    const clean = sanitizeEntry(entry);
    if (!clean) return;
    const all = this.read().filter((e) => e.userId !== clean.userId);
    const prev = this.read().find((e) => e.userId === clean.userId);
    // Keep the player's best score: a restart never lowers a leaderboard position.
    all.push(prev && prev.totalXp > clean.totalXp ? { ...clean, totalXp: prev.totalXp, level: prev.level, rank: prev.rank } : clean);
    try {
      localStorage.setItem(LocalLeaderboardAdapter.KEY, JSON.stringify(all));
    } catch {
      /* storage unavailable: the score simply is not remembered */
    }
  }

  async top(limit = 20): Promise<LeaderboardEntry[]> {
    return rankEntries([...DEMO, ...this.read()], limit);
  }
}

/** The exact stats start.ng's leaderboard expects (must match public/startng.json): whole numbers, 0 to 1,000,000,000. */
export function leaderboardStats(e: Pick<LeaderboardEntry, 'totalXp' | 'worldsCleared' | 'gems' | 'secretMissions'>): Record<'xp' | 'worlds' | 'gems' | 'secrets', number> {
  const whole = (n: number) => Math.max(0, Math.min(1_000_000_000, Math.floor(Number.isFinite(n) ? n : 0)));
  return { xp: whole(e.totalXp), worlds: whole(e.worldsCleared), gems: whole(e.gems), secrets: whole(e.secretMissions) };
}

/** Turn one start.ng board row into one of ours. */
export function entryFromBoard(row: BoardEntry): LeaderboardEntry {
  const xp = row.stats?.xp ?? row.score ?? 0;
  const worlds = row.stats?.worlds ?? 0;
  return {
    userId: String(row.player_id),
    displayName: row.name,
    totalXp: xp,
    level: getLevelForXp(xp),
    rank: getRankForProgress(xp, worlds).name,
    worldsCleared: worlds,
    secretMissions: row.stats?.secrets ?? 0,
    gems: row.stats?.gems ?? 0,
    updatedAt: row.rank,
  };
}

export class StartNgLeaderboardAdapter implements LeaderboardAdapter {
  readonly label = 'start.ng leaderboard';
  readonly isMock = false;

  /** `getUser` tells us whether the current player is signed in (guests cannot save scores). */
  constructor(private getUser: () => AuthUser | null) {}

  async submit(entry: LeaderboardEntry): Promise<void> {
    const u = this.getUser();
    if (!u || u.isGuest || u.offline) return; // only signed-in players can save a score
    await startNg.saveScore(leaderboardStats(entry));
  }

  async top(limit = 20): Promise<LeaderboardEntry[]> {
    const reply = await startNg.leaderboard(limit);
    if (!reply) throw new Error('The start.ng leaderboard is only available when the game is played at its start.ng address.');
    if (!reply.ok) throw new Error('start.ng could not load the leaderboard. Try again in a moment.');
    return (reply.entries ?? []).map(entryFromBoard);
  }
}
