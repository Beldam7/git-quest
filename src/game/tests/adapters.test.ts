import { describe, it, expect, beforeEach } from 'vitest';
import { createAdapters } from '../adapters/config';
import { MockAuthAdapter, StartNgAuthAdapter } from '../adapters/AuthAdapter';
import type { AuthState } from '../adapters/AuthAdapter';
import { LocalProgressAdapter, StartNgProgressAdapter } from '../adapters/ProgressAdapter';
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

  it('startng mode wires the real (unimplemented) adapters and locks styling', () => {
    const a = createAdapters('startng');
    expect(a.mode).toBe('startng');
    expect(a.auth).toBeInstanceOf(StartNgAuthAdapter);
    expect(a.progress).toBeInstanceOf(StartNgProgressAdapter);
    expect(a.appearance).toBeInstanceOf(StartNgCharacterAppearanceAdapter);
    expect(a.appearanceEditable).toBe(false);
  });
});

describe('Start.ng placeholders fail closed', () => {
  it('auth is never authenticated and reports why', () => {
    const auth = new StartNgAuthAdapter();
    expect(auth.getState()).toBe('error');
    expect(auth.getUser()).toBeNull();
    expect(auth.getError()).toMatch(/not configured/i);
  });

  it('progress load/save/clear reject instead of pretending to work', async () => {
    const p = new StartNgProgressAdapter();
    await expect(p.load('u1')).rejects.toThrow();
    await expect(p.save('u1', createNewProgress())).rejects.toThrow();
    await expect(p.clear('u1')).rejects.toThrow();
  });

  it('appearance returns safe defaults and refuses in-game edits', () => {
    const a = new StartNgCharacterAppearanceAdapter();
    expect(a.getAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(() => a.setAppearance({ primaryColor: '#ff0000' })).toThrow();
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
  it('rejects invalid colors and unknown enum values', () => {
    const a = sanitizeAppearance({
      primaryColor: 'red',
      secondaryColor: '#12345',
      accentColor: 'javascript:alert(1)',
      accessory: 'laser_eyes' as never,
      materialVariant: 'plasma' as never,
    });
    expect(a).toEqual(DEFAULT_APPEARANCE);
  });

  it('local adapter notifies listeners and persists across instances (dev preview)', () => {
    const a = new LocalCharacterAppearanceAdapter();
    let latest = a.getAppearance();
    a.onChange((x) => (latest = x));
    a.setAppearance({ primaryColor: '#ff0000', accessory: 'cape' });
    expect(latest.primaryColor).toBe('#ff0000');
    expect(latest.accessory).toBe('cape');
    const b = new LocalCharacterAppearanceAdapter();
    expect(b.getAppearance().primaryColor).toBe('#ff0000');
  });
});
