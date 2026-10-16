import { describe, it, expect, beforeEach } from 'vitest';
import { createAdapters } from '../adapters/config';
import { MockAuthAdapter, StartNgAuthAdapter } from '../adapters/AuthAdapter';
import type { AuthState } from '../adapters/AuthAdapter';
import { LocalProgressAdapter } from '../adapters/ProgressAdapter';
import { StartNgLeaderboardAdapter } from '../adapters/LeaderboardAdapter';
import {
  DEFAULT_APPEARANCE,
  LocalCharacterAppearanceAdapter,
  StartNgCharacterAppearanceAdapter,
  sanitizeAppearance,
} from '../adapters/CharacterAppearanceAdapter';
import { createNewProgress } from '../engine/GameEngine';

beforeEach(() => {
  localStorage.clear();
});

describe('adapter selection', () => {
  it('mock mode wires the development mocks and allows local styling edits', () => {
    const a = createAdapters('mock');
    expect(a.mode).toBe('mock');
    expect(a.auth).toBeInstanceOf(MockAuthAdapter);
    expect(a.progress).toBeInstanceOf(LocalProgressAdapter);
    expect(a.appearance).toBeInstanceOf(LocalCharacterAppearanceAdapter);
    expect(a.appearanceEditable).toBe(true);
  });

  it('startng mode wires the real start.ng adapters, keeps saves in the browser, and locks styling', () => {
    const a = createAdapters('startng');
    expect(a.mode).toBe('startng');
    expect(a.auth).toBeInstanceOf(StartNgAuthAdapter);
    expect(a.progress).toBeInstanceOf(LocalProgressAdapter); // start.ng has no cloud save for games
    expect(a.appearance).toBeInstanceOf(StartNgCharacterAppearanceAdapter);
    expect(a.leaderboard).toBeInstanceOf(StartNgLeaderboardAdapter);
    expect(a.appearanceEditable).toBe(false);
  });
});

describe('start.ng auth when there is no start.ng to talk to (local play)', () => {
  it('lets the player play as an offline guest instead of getting stuck', async () => {
    const styles: unknown[] = [];
    const auth = new StartNgAuthAdapter((st) => styles.push(st));
    await auth.refresh();
    expect(auth.getState()).toBe('authenticated');
    expect(auth.getUser()).toMatchObject({ id: 'guest', isGuest: true, offline: true });
    expect(styles.length).toBeGreaterThan(0);
  });
});

describe('start.ng character adapter', () => {
  it('shows the platform character and refuses in-game edits', () => {
    const a = new StartNgCharacterAppearanceAdapter();
    expect(a.getAppearance()).toEqual(DEFAULT_APPEARANCE);
    let seen = a.getAppearance();
    a.onChange((x) => (seen = x));
    a.applyStyle({ body: 'female', primaryColor: '#a55eea', secondaryColor: '#0c6e5a', skinColor: '#8d5524', hairColor: '#17120f', hair: 'braids', hat: 'crown', accessory: 'earrings' });
    expect(seen).toMatchObject({ body: 'female', hair: 'braids', hat: 'crown', accessory: 'earrings', primaryColor: '#a55eea' });
    a.setAppearance(); // no-op: start.ng owns the character
    expect(a.getAppearance().hat).toBe('crown');
  });

  it('falls back sensibly when start.ng adds an option the game does not know yet', () => {
    const a = new StartNgCharacterAppearanceAdapter();
    a.applyStyle({ hair: 'mohawk', hat: 'viking', accessory: 'monocle', body: 'robot', primaryColor: 'blue' });
    expect(a.getAppearance()).toEqual(DEFAULT_APPEARANCE);
  });

  it('uses the default look when the player has no character yet (style is null)', () => {
    const a = new StartNgCharacterAppearanceAdapter();
    a.applyStyle(null);
    expect(a.getAppearance()).toEqual(DEFAULT_APPEARANCE);
  });
});

describe('MockAuthAdapter (development only)', () => {
  it('signs in and out and notifies listeners', async () => {
    const auth = new MockAuthAdapter();
    const seen: AuthState[] = [];
    auth.onChange((s) => seen.push(s));
    auth.devSignIn('u1', 'Tester');
    expect(auth.getState()).toBe('authenticated');
    expect(auth.getUser()?.id).toBe('u1');
    await auth.signOut();
    expect(auth.getState()).toBe('unauthenticated');
    expect(auth.getUser()).toBeNull();
    expect(seen).toEqual(['authenticated', 'unauthenticated']);
  });

  it('startup timer does not overwrite an earlier sign-in', async () => {
    const auth = new MockAuthAdapter();
    auth.devSignIn('u1', 'Tester');
    await new Promise((r) => setTimeout(r, 200));
    expect(auth.getState()).toBe('authenticated');
  });
});

describe('LocalProgressAdapter user scoping', () => {
  it('keeps each user\'s progress separate', async () => {
    const adapter = new LocalProgressAdapter();
    const p = createNewProgress();
    p.totalXp = 42;
    expect(await adapter.save('user-a', p)).toBe(true);
    expect((await adapter.load('user-a'))?.totalXp).toBe(42);
    expect(await adapter.load('user-b')).toBeNull();
  });

  it('treats corrupted data as no save rather than throwing', async () => {
    localStorage.setItem('gitquest:progress:user-a', '{not json');
    expect(await new LocalProgressAdapter().load('user-a')).toBeNull();
    localStorage.setItem('gitquest:progress:user-a', JSON.stringify({ hello: 'world' }));
    expect(await new LocalProgressAdapter().load('user-a')).toBeNull();
  });

  it('clear removes only that user\'s save', async () => {
    const adapter = new LocalProgressAdapter();
    await adapter.save('user-a', createNewProgress());
    await adapter.save('user-b', createNewProgress());
    await adapter.clear('user-a');
    expect(await adapter.load('user-a')).toBeNull();
    expect(await adapter.load('user-b')).not.toBeNull();
  });
});

describe('character appearance', () => {
  it('rejects invalid colors and unknown values, field by field', () => {
    const a = sanitizeAppearance({
      primaryColor: 'red',
      secondaryColor: '#12345',
      skinColor: 'javascript:alert(1)',
      hairColor: 42 as never,
      hair: 'mohawk' as never,
      hat: 'viking' as never,
      accessory: 'laser_eyes' as never,
      body: 'robot' as never,
    });
    expect(a).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid values from a real start.ng style', () => {
    const a = sanitizeAppearance({ body: 'female', primaryColor: '#a55eea', secondaryColor: '#0c6e5a', skinColor: '#8d5524', hairColor: '#17120f', hair: 'braids', hat: 'crown', accessory: 'earrings' });
    expect(a.hair).toBe('braids');
    expect(a.skinColor).toBe('#8d5524');
  });

  it('local adapter notifies listeners and persists across instances (dev editor)', () => {
    const a = new LocalCharacterAppearanceAdapter();
    let latest = a.getAppearance();
    a.onChange((x) => (latest = x));
    a.setAppearance({ primaryColor: '#ff0000', hat: 'tophat', hair: 'afro' });
    expect(latest.primaryColor).toBe('#ff0000');
    expect(latest.hat).toBe('tophat');
    const b = new LocalCharacterAppearanceAdapter();
    expect(b.getAppearance().hair).toBe('afro');
  });
});
