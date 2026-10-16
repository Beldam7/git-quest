import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalLeaderboardAdapter, StartNgLeaderboardAdapter, entryFromBoard, entryFromProgress, leaderboardStats, rankEntries, sanitizeEntry } from '../adapters/LeaderboardAdapter';
import { startNg } from '../platform/startng';
import type { AuthUser } from '../adapters/AuthAdapter';
import type { LeaderboardEntry } from '../adapters/LeaderboardAdapter';
import { createNewProgress } from '../engine/GameEngine';

const e = (over: Partial<LeaderboardEntry>): LeaderboardEntry => ({
  userId: 'u', displayName: 'U', totalXp: 0, level: 1, rank: 'Rookie', worldsCleared: 0, secretMissions: 0, gems: 0, updatedAt: 1, ...over,
});

beforeEach(() => localStorage.clear());

describe('leaderboard ranking', () => {
  it('orders by XP, then worlds cleared, then who arrived first', () => {
    const list = rankEntries([
      e({ userId: 'a', totalXp: 100, worldsCleared: 1, updatedAt: 5 }),
      e({ userId: 'b', totalXp: 300 }),
      e({ userId: 'c', totalXp: 100, worldsCleared: 3, updatedAt: 9 }),
      e({ userId: 'd', totalXp: 100, worldsCleared: 3, updatedAt: 2 }),
    ]);
    expect(list.map((x) => x.userId)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('limits the list', () => {
    expect(rankEntries(Array.from({ length: 30 }, (_, i) => e({ userId: `u${i}`, totalXp: i })), 10)).toHaveLength(10);
  });
});

describe('leaderboard sanitising', () => {
  it('cleans names and clamps numbers so bad data cannot break the table', () => {
    const c = sanitizeEntry({ userId: 'x', displayName: '  <b>Evil</b>\n'.repeat(5), totalXp: 9e12, level: -4, worldsCleared: 99 });
    expect(c).not.toBeNull();
    expect(c!.displayName.length).toBeLessThanOrEqual(24);
    expect(c!.displayName).not.toMatch(/[<>\n]/);
    expect(c!.totalXp).toBeLessThanOrEqual(1_000_000);
    expect(c!.level).toBe(0);
    expect(c!.worldsCleared).toBeLessThanOrEqual(8);
  });
  it('rejects entries without a user id', () => {
    expect(sanitizeEntry({ displayName: 'No id' })).toBeNull();
    expect(sanitizeEntry(null)).toBeNull();
  });
});

describe('local (development) leaderboard', () => {
  it('shows labelled demo players and the real player together', async () => {
    const lb = new LocalLeaderboardAdapter();
    const p = createNewProgress();
    p.totalXp = 500;
    await lb.submit(entryFromProgress('me', 'Me', p));
    const top = await lb.top(20);
    expect(top.some((x) => x.demo)).toBe(true);
    expect(top.find((x) => x.userId === 'me')?.totalXp).toBe(500);
    expect(lb.isMock).toBe(true);
  });

  it('keeps a player\'s best score (a level restart cannot lower it)', async () => {
    const lb = new LocalLeaderboardAdapter();
    const p = createNewProgress();
    p.totalXp = 400;
    await lb.submit(entryFromProgress('me', 'Me', p));
    p.totalXp = 50;
    await lb.submit(entryFromProgress('me', 'Me', p));
    expect((await lb.top()).find((x) => x.userId === 'me')?.totalXp).toBe(400);
  });
});

describe('start.ng leaderboard (real adapter)', () => {
  const signedIn: AuthUser = { id: '42', displayName: 'Runner Tee', isGuest: false };
  const guest: AuthUser = { id: 'guest', displayName: 'Guest', isGuest: true };
  const entry = e({ userId: '42', totalXp: 480.9, worldsCleared: 3, gems: 17, secretMissions: 1 });

  it('sends exactly the declared whole-number stats for a signed-in player', async () => {
    const spy = vi.spyOn(startNg, 'saveScore').mockResolvedValue({ ok: true });
    await new StartNgLeaderboardAdapter(() => signedIn).submit(entry);
    expect(spy).toHaveBeenCalledWith({ xp: 480, worlds: 3, gems: 17, secrets: 1 });
    spy.mockRestore();
  });

  it('never tries to save a score for a guest or offline player', async () => {
    const spy = vi.spyOn(startNg, 'saveScore').mockResolvedValue({ ok: true });
    await new StartNgLeaderboardAdapter(() => guest).submit(entry);
    await new StartNgLeaderboardAdapter(() => ({ ...guest, offline: true })).submit(entry);
    await new StartNgLeaderboardAdapter(() => null).submit(entry);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('turns start.ng board rows into leaderboard entries', async () => {
    const spy = vi.spyOn(startNg, 'leaderboard').mockResolvedValue({
      ok: true,
      entries: [{ rank: 1, player_id: 7, name: 'Trini', score: 900, stats: { xp: 900, worlds: 8, gems: 60, secrets: 4 } }],
    });
    const top = await new StartNgLeaderboardAdapter(() => signedIn).top(10);
    expect(spy).toHaveBeenCalledWith(10);
    expect(top[0]).toMatchObject({ userId: '7', displayName: 'Trini', totalXp: 900, worldsCleared: 8, gems: 60, secretMissions: 4 });
    expect(top[0].rank).toBeTruthy();
    spy.mockRestore();
  });

  it('explains itself when the game is not running on start.ng', async () => {
    await expect(new StartNgLeaderboardAdapter(() => signedIn).top()).rejects.toThrow(/start\.ng address/);
  });
});

describe('leaderboard stats match start.ng\'s rules', () => {
  it('are whole numbers between 0 and 1,000,000,000, with exactly the declared keys', () => {
    const s = leaderboardStats({ totalXp: -5, worldsCleared: 2.7, gems: 5e12, secretMissions: Number.NaN });
    expect(Object.keys(s).sort()).toEqual(['gems', 'secrets', 'worlds', 'xp']);
    expect(s).toEqual({ xp: 0, worlds: 2, gems: 1_000_000_000, secrets: 0 });
  });

  it('map a board row with missing stats safely', () => {
    expect(entryFromBoard({ rank: 3, player_id: 1, name: 'A', score: 12 })).toMatchObject({ totalXp: 12, worldsCleared: 0, gems: 0 });
  });
});
