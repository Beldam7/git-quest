import { describe, it, expect } from 'vitest';
import { GameAudio } from '../audio/GameAudio';

describe('GameAudio (no sound hardware in tests)', () => {
  it('never throws when Web Audio is unavailable', () => {
    const a = new GameAudio();
    expect(() => {
      a.unlock();
      a.setTheme(3);
      a.setMood('battle');
      a.playSfx('hit');
      a.playSfx('hurt');
      a.playSfx('xp');
    }).not.toThrow();
  });

  it('stores volume settings, notifies listeners, and remembers them', () => {
    localStorage.clear();
    const a = new GameAudio();
    let notified = 0;
    a.subscribe(() => notified++);
    a.update({ musicVolume: 0.2, sfxOn: false });
    expect(a.getSettings().musicVolume).toBe(0.2);
    expect(a.getSettings().sfxOn).toBe(false);
    expect(notified).toBe(1);
    expect(new GameAudio().getSettings().musicVolume).toBe(0.2); // persisted across instances
  });

  it('mute turns both music and effects off, and unmute turns them back on', () => {
    const a = new GameAudio();
    a.setMuted(true);
    expect(a.getSettings().musicOn || a.getSettings().sfxOn).toBe(false);
    a.setMuted(false);
    expect(a.getSettings().musicOn && a.getSettings().sfxOn).toBe(true);
  });
});
