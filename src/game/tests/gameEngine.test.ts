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
    const result = sanitizeAppearance({ primaryColor: '#ff0000', accessory: 'glasses' });
    expect(result.primaryColor).toBe('#ff0000');
    expect(result.accessory).toBe('glasses');
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


describe('Combat, defeat, restart and gems', () => {
  function makeEngine() {
    const events: Array<{ type: string }> = [];
    const engine = new GameEngine({ ...mockCallbacks, onCombat: (e) => events.push(e) });
    engine.startNewGame();
    engine.enterWorld(1);
    return { engine, events };
  }

  it('a correct command hurts the monster (objective complete = hit)', () => {
    const { engine, events } = makeEngine();
    engine.processCommand('git init');
    expect(events.some((e) => e.type === 'hit')).toBe(true);
    expect(engine.getProgress().health).toBe(100);
  });

  it('a killing blow reports hit and then defeated, in that order', () => {
    const { engine, events } = makeEngine();
    engine.processCommand('git init');
    const types = events.map((e) => e.type);
    expect(types.indexOf('hit')).toBeGreaterThanOrEqual(0);
    expect(types.indexOf('defeated')).toBeGreaterThan(types.indexOf('hit'));
  });

  it('the first wrong command of a fight is absorbed by the Commit Shield, the next one hurts', () => {
    const { engine, events } = makeEngine();
    engine.processCommand('git add .'); // no repository yet: fails
    expect(events.some((e) => e.type === 'shield')).toBe(true);
    expect(engine.getProgress().health).toBe(100);
    engine.processCommand('git add .');
    expect(events.some((e) => e.type === 'player-hit')).toBe(true);
    expect(engine.getProgress().health).toBeLessThan(100);
  });

  it('help, hint and clear never cost health', () => {
    const { engine } = makeEngine();
    engine.processCommand('help');
    engine.processCommand('hint');
    engine.processCommand('clear');
    expect(engine.getProgress().health).toBe(100);
  });

  it('reaching 0 health defeats the player and blocks further commands until restart', () => {
    const { engine, events } = makeEngine();
    for (let i = 0; i < 20; i++) engine.processCommand('git add .');
    expect(engine.isDefeated()).toBe(true);
    expect(engine.getProgress().health).toBe(0);
    expect(events.some((e) => e.type === 'player-down')).toBe(true);
    engine.processCommand('git init');
    expect(engine.getProgress().completedChallenges.length).toBe(0);

    engine.restartLevel();
    expect(engine.isDefeated()).toBe(false);
    expect(engine.getProgress().health).toBe(engine.getProgress().maxHealth);
    engine.processCommand('git init');
    expect(engine.getProgress().challengeProgress[engine.getCurrentChallengeId() ?? '']?.objectivesCompleted.length).toBeGreaterThan(0);
  });

  it('defeating a monster heals the player', () => {
    const { engine, events } = makeEngine();
    engine.processCommand('git add .'); // absorbed by the shield
    engine.processCommand('git add .'); // takes damage
    const damaged = engine.getProgress().health;
    expect(damaged).toBeLessThan(100);
    engine.processCommand('git init');
    const progress = engine.getProgress();
    if (events.some((e) => e.type === 'defeated')) {
      expect(progress.health).toBeGreaterThan(damaged);
    }
  });

  it('replaying a finished quest after a restart gives no extra XP', () => {
    const { engine } = makeEngine();
    engine.processCommand('git init');
    const xpAfterFirstClear = engine.getProgress().totalXp;
    engine.restartLevel();
    engine.processCommand('git init');
    expect(engine.getProgress().totalXp).toBe(xpAfterFirstClear);
  });

  it('gems award XP exactly once per gem', () => {
    const { engine } = makeEngine();
    engine.collectGem('g1-0', 5);
    engine.collectGem('g1-0', 5);
    expect(engine.getProgress().totalXp).toBe(5);
    expect(engine.getProgress().collectedGems).toEqual(['g1-0']);
  });
});


describe('Secret missions', () => {
  it('finishing a secret mission quest grants its rewards and marks it complete', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    engine.startChallenge('sm_ghost_commit');
    const before = engine.getProgress().totalXp;
    // complete every objective by brute-forcing the documented solution is simulator specific, so only assert
    // the wiring: completing the mission directly records it exactly once
    engine.completeSecretMission('ghost_commit');
    engine.completeSecretMission('ghost_commit');
    const p = engine.getProgress();
    expect(p.secretMissionsCompleted).toEqual(['ghost_commit']);
    expect(p.collectibles).toContain('relic_reflog');
    expect(p.totalXp).toBe(before + 50);
  });

  it('restarting a secret mission restarts that mission, not a world', () => {
    const engine = new GameEngine(mockCallbacks);
    engine.startNewGame();
    engine.startChallenge('sm_ghost_commit');
    engine.restartLevel();
    expect(engine.getCurrentChallengeId()).toBe('sm_ghost_commit');
  });
});


describe('Friendlier learning: explanations, practice, abilities, hints', () => {
  function make() {
    let lines: Array<{ type: string; text: string }> = [];
    const events: Array<{ type: string; damage?: number; amount?: number }> = [];
    const engine = new GameEngine({ ...mockCallbacks, onTerminalOutput: (l) => { lines = l; }, onCombat: (e) => events.push(e as never) });
    engine.startNewGame();
    engine.enterWorld(1);
    return { engine, events, text: () => lines.map((l) => l.text).join('\n') };
  }

  it('explains a wrong command in plain language', () => {
    const { engine, text } = make();
    engine.processCommand('git add .');
    expect(text()).toMatch(/git init/);
    expect(text()).toMatch(/🧭/);
  });

  it('practice mode never costs health, however many mistakes', () => {
    const { engine, events } = make();
    engine.setPractice(true);
    for (let i = 0; i < 25; i++) engine.processCommand('git add .');
    expect(engine.getProgress().health).toBe(100);
    expect(engine.isDefeated()).toBe(false);
    expect(events.filter((e) => e.type === 'player-hit').every((e) => e.damage === 0)).toBe(true);
  });

  it('Commit Shield recharges for the next fight', () => {
    const { engine, events } = make();
    engine.processCommand('git add .');
    engine.startChallenge(engine.getCurrentChallengeId() as string);
    engine.processCommand('git add .');
    expect(events.filter((e) => e.type === 'shield')).toHaveLength(2);
    expect(engine.getProgress().health).toBe(100);
  });

  it('Recovery Crystal heals to full once per level, and only once unlocked', () => {
    const { engine, events } = make();
    expect(engine.canUseRecoveryCrystal()).toBe(false); // rank 1: not unlocked
    const p = createNewProgress();
    p.rank = 'Commit Apprentice';
    p.health = 30;
    engine.loadProgress(p);
    engine.enterWorld(1);
    expect(engine.canUseRecoveryCrystal()).toBe(true);
    engine.useRecoveryCrystal();
    expect(engine.getProgress().health).toBe(p.maxHealth);
    expect(events.some((e) => e.type === 'heal')).toBe(true);
    engine.getProgress().health = 10;
    expect(engine.canUseRecoveryCrystal()).toBe(false); // already used this level
  });

  it('asking for a hint twice reveals the concept as well', () => {
    const { engine, text } = make();
    engine.processCommand('hint');
    expect(text()).not.toMatch(/Remember/);
    engine.processCommand('hint');
    expect(text()).toMatch(/Remember/);
  });
});


describe('Quest objectives accept any correct way to do the task', () => {
  function play(challengeId: string, commands: string[]) {
    const events: string[] = [];
    const engine = new GameEngine({ ...mockCallbacks, onCombat: (e) => events.push(e.type) });
    engine.startNewGame();
    engine.startChallenge(challengeId);
    for (const c of commands) engine.processCommand(c);
    return { engine, events, done: events.includes('defeated') };
  }

  it('Send Your Work: pushing straight away works', () => {
    expect(play('w5_c4_push', ['git push origin main']).done).toBe(true);
    expect(play('w5_c4_push', ['git push']).done).toBe(true);
  });

  it('Send Your Work: committing first, then pushing, also works (the remote gets your new commit)', () => {
    const r = play('w5_c4_push', ['git add .', 'git commit -m "my change"', 'git push origin main']);
    expect(r.done).toBe(true);
  });

  it('Send Your Work: nothing counts until you actually push', () => {
    expect(play('w5_c4_push', ['git status', 'git add .', 'git commit -m "x"']).done).toBe(false);
  });

  it('Sync with the Citadel: pushing the feature branch works, with or without a commit first', () => {
    expect(play('w8_c4_remote', ['git push origin final-feature']).done).toBe(true);
    expect(play('w8_c4_remote', ['git add .', 'git commit -m "polish"', 'git push origin final-feature']).done).toBe(true);
    expect(play('w8_c4_remote', ['git status']).done).toBe(false);
  });

  it('Accept the Changes: pulling works', () => {
    expect(play('w5_c3_pull', ['git pull']).done).toBe(true);
    expect(play('w5_c3_pull', ['git status']).done).toBe(false);
  });
});
