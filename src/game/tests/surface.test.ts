import { describe, it, expect } from 'vitest';
import { clampToDeck, deckAt, onDeck, stepVertical, surfaceY, JUMP_VELOCITY } from '../world3d/surface';
import type { VState } from '../world3d/surface';
import type { BridgeSpec, WorldSignals } from '../world3d/types';
import { deriveSignals } from '../world3d/signals';

const sig: WorldSignals = deriveSignals(null, 0, 1);

describe('jumping', () => {
  it('rises, peaks, and lands back on the ground', () => {
    const s: VState = { y: 0, vy: 0, air: false };
    let peak = 0;
    let landed = false;
    const first = stepVertical(s, 0, 1 / 60, true);
    expect(first.jumped).toBe(true);
    for (let i = 0; i < 200 && !landed; i++) {
      peak = Math.max(peak, s.y);
      landed = stepVertical(s, 0, 1 / 60, false).landed;
    }
    expect(landed).toBe(true);
    expect(peak).toBeGreaterThan(1.2);
    expect(peak).toBeLessThan(2.5);
    expect(s.y).toBe(0);
    expect(s.air).toBe(false);
    expect(JUMP_VELOCITY).toBeGreaterThan(0);
  });

  it('cannot jump again while already in the air', () => {
    const s: VState = { y: 0, vy: 0, air: false };
    stepVertical(s, 0, 1 / 60, true);
    const mid = stepVertical(s, 0, 1 / 60, true);
    expect(mid.jumped).toBe(false);
  });

  it('walking off a ledge makes the hero fall until the lower ground', () => {
    const s: VState = { y: 5, vy: 0, air: false };
    stepVertical(s, 0, 1 / 60, false);
    expect(s.air).toBe(true);
    for (let i = 0; i < 200 && s.air; i++) stepVertical(s, 0, 1 / 60, false);
    expect(s.y).toBe(0);
  });

  it('follows gentle slopes without hopping', () => {
    const s: VState = { y: 0, vy: 0, air: false };
    for (let i = 0; i < 30; i++) stepVertical(s, 0.3, 1 / 60, false);
    expect(s.air).toBe(false);
    expect(s.y).toBeCloseTo(0.3, 1);
  });
});

describe('bridge decks and rails', () => {
  const bridge: BridgeSpec = { a: [0, 10], b: [0, 0], y: 1, width: 2.4, gap: (s) => (s.mergeInProgress ? 0.5 : 0) };
  const def = { heightAt: () => -3, bridges: [bridge] };

  it('has a deck over the span but not past the ends or off the sides', () => {
    expect(deckAt(bridge, 0, 5, sig)).toBeCloseTo(1.08);
    expect(deckAt(bridge, 0, 12, sig)).toBeNull();
    expect(deckAt(bridge, 3, 5, sig)).toBeNull();
  });

  it('has no deck where planks are missing', () => {
    const broken = { ...sig, mergeInProgress: true };
    expect(deckAt(bridge, 0, 5, broken)).toBeNull(); // middle gap
    expect(deckAt(bridge, 0, 9, broken)).not.toBeNull(); // stub near the end
  });

  it('stands the hero on the deck, but lets them stay down in the water if they are below it', () => {
    expect(surfaceY(def, 0, 5, 1.1, sig)).toBeCloseTo(1.08); // up on the bridge
    expect(surfaceY(def, 0, 5, -3, sig)).toBe(-3); // wading underneath
    expect(onDeck(def, 0, 5, 1.08, sig)).toBe(true);
    expect(onDeck(def, 0, 5, -3, sig)).toBe(false);
  });

  it('side rails keep the hero on the deck, but not when they are below it', () => {
    const [x] = clampToDeck([bridge], 1.5, 5, 1.1, sig);
    expect(x).toBeLessThan(1.1);
    const [free] = clampToDeck([bridge], 1.5, 5, -3, sig);
    expect(free).toBe(1.5);
  });

  it('the ends of the bridge stay open', () => {
    const [, z] = clampToDeck([bridge], 0, 11, 1.1, sig);
    expect(z).toBe(11);
  });
});
