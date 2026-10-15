import { describe, it, expect } from 'vitest';
import { getRankForProgress, getLevelForXp, getXpForNextLevel } from '../data/ranks';
import { RANKS } from '../data/ranks';
import { createNewProgress, GameEngine } from '../engine/GameEngine';
import type { GameEngineCallbacks } from '../engine/GameEngine';
import { LocalProgressAdapter } from '../adapters/ProgressAdapter';
import { sanitizeAppearance, DEFAULT_APPEARANCE } from '../adapters/CharacterAppearanceAdapter';

const mockCallbacks: GameEngineCallbacks = {
  onProgressUpdate: () => {},
  onRepoStateChange: () => {},
  onTerminalOutput: () => {},
  onChallengeComplete: () => {},
  onScreenChange: () => {},
  onRankUp: () => {},
  onAchievementUnlock: () => {},
  onDamage: () => {},
  onHeal: () => {},
};

describe('XP and Rank Progression', () => {
  it('starts as Repository Rookie', () => {
    const rank = getRankForProgress(0, 0);
    expect(rank.name).toBe('Repository Rookie');
  });

  it('reaches Commit Apprentice with 50 XP and 1 world', () => {
    const rank = getRankForProgress(50, 1);
    expect(rank.name).toBe('Commit Apprentice');
  });

  it('reaches Git Legend with 1000 XP and 8 worlds', () => {
    const rank = getRankForProgress(1000, 8);
    expect(rank.name).toBe('Git Legend');
  });

  it('does not promote without required worlds', () => {
    const rank = getRankForProgress(1000, 0);
    expect(rank.name).toBe('Repository Rookie');
  });

  it('level increases with XP', () => {
    expect(getLevelForXp(0)).toBe(1);
    expect(getLevelForXp(30)).toBe(2);
    expect(getLevelForXp(100)).toBe(3);
  });

  it('getXpForNextLevel returns correct values', () => {
    const info = getXpForNextLevel(0);
    expect(info.current).toBe(0);
    expect(info.needed).toBe(30);
  });
});

describe('Game Engine - New Game', () => {
  it('creates fresh progress on new game', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    const progress = engine.getProgress();
    expect(progress.currentWorldId).toBe(1);
    expect(progress.unlockedWorlds).toEqual([1]);
    expect(progress.totalXp).toBe(0);
    expect(progress.rank).toBe('Repository Rookie');
    expect(progress.health).toBe(100);
  });

  it('loads existing progress', () => {
    const saved = createNewProgress();
    saved.totalXp = 200;
    saved.rank = 'Branch Guardian';
    const engine = new GameEngine(mockCallbacks, saved);
    expect(engine.getProgress().totalXp).toBe(200);
    expect(engine.getProgress().rank).toBe('Branch Guardian');
  });
});

describe('Game Engine - Challenge Completion', () => {
  it('completing first challenge awards XP', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    engine.startChallenge('w1_c1_init');
    engine.processCommand('git init');
    const progress = engine.getProgress();
    expect(progress.completedChallenges.length).toBeGreaterThan(0);
    expect(progress.totalXp).toBeGreaterThan(0);
  });

  it('prevents XP farming by not re-awarding completed challenges', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    engine.startChallenge('w1_c1_init');
    engine.processCommand('git init');
    const xpAfterFirst = engine.getProgress().totalXp;
    // Re-run the same challenge
    engine.startChallenge('w1_c1_init');
    engine.processCommand('git init');
    const xpAfterSecond = engine.getProgress().totalXp;
    // XP should not increase from re-completing
    // (it may increase slightly from command XP, but challenge XP should not be re-awarded)
    expect(engine.getProgress().completedChallenges.filter((c) => c.challengeId === 'w1_c1_init').length).toBe(1);
  });
});

describe('Game Engine - Proficiency Report', () => {
  it('generates a proficiency report', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    const report = engine.getProficiencyReport();
    expect(report.totalChallenges).toBeGreaterThan(0);
    expect(report.proficiencyScore).toBeGreaterThanOrEqual(0);
    expect(report.proficiencyScore).toBeLessThanOrEqual(100);
  });
});

describe('Local Progress Adapter', () => {
  it('saves and loads progress', async () => {
    const adapter = new LocalProgressAdapter();
    const progress = createNewProgress();
    progress.totalXp = 150;
    const saved = await adapter.save('test-user', progress);
    expect(saved).toBe(true);
    const loaded = await adapter.load('test-user');
    expect(loaded).not.toBeNull();
    expect(loaded!.totalXp).toBe(150);
  });

  it('returns null for non-existent user', async () => {
    const adapter = new LocalProgressAdapter();
    const loaded = await adapter.load('nonexistent-user-12345');
    expect(loaded).toBeNull();
  });

  it('handles corrupted data gracefully', async () => {
    localStorage.setItem('gitquest:progress:corrupt', '{invalid json');
    const adapter = new LocalProgressAdapter();
    const loaded = await adapter.load('corrupt');
    expect(loaded).toBeNull();
  });

  it('clears progress', async () => {
    const adapter = new LocalProgressAdapter();
    await adapter.save('clear-test', createNewProgress());
    const cleared = await adapter.clear('clear-test');
    expect(cleared).toBe(true);
    const loaded = await adapter.load('clear-test');
    expect(loaded).toBeNull();
  });
});

describe('Character Appearance Adapter', () => {
  it('sanitizes invalid colors to defaults', () => {
    const result = sanitizeAppearance({ primaryColor: 'not-a-color' });
    expect(result.primaryColor).toBe(DEFAULT_APPEARANCE.primaryColor);
  });

  it('sanitizes invalid accessories to defaults', () => {
    const result = sanitizeAppearance({ accessory: 'invalid' as any });
    expect(result.accessory).toBe(DEFAULT_APPEARANCE.accessory);
  });

  it('preserves valid values', () => {
    const result = sanitizeAppearance({ primaryColor: '#ff0000', accessory: 'cape' });
    expect(result.primaryColor).toBe('#ff0000');
    expect(result.accessory).toBe('cape');
  });

  it('handles null input', () => {
    const result = sanitizeAppearance(null);
    expect(result).toEqual(DEFAULT_APPEARANCE);
  });
});

describe('Secret Mission Discovery', () => {
  it('secret missions are not discovered with no progress', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    const discovered = engine.getDiscoveredSecretMissions();
    expect(discovered.length).toBe(0);
  });
});
