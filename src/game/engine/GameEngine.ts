import type {
  GameProgress,
  RepositoryState,
  CommandResult,
  TerminalLine,
  CompletedChallenge,
  GameScreen,
  ProficiencyReport,
  CombatEvent,
} from '../types';
import { executeCommand, createInitialRepoState } from '../simulator/GitSimulator';
import { WORLDS, secretMissions } from '../data/worlds';
import { RANKS, ABILITIES, ACHIEVEMENTS, COLLECTIBLES, getRankForProgress, getLevelForXp } from '../data/ranks';
import { SECRET_MISSIONS } from '../data/secretMissions';
import { DEFAULT_APPEARANCE } from '../adapters/CharacterAppearanceAdapter';
import { explainFailure } from './explain';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

export function createNewProgress(): GameProgress {
  return {
    currentWorldId: 1,
    unlockedWorlds: [1],
    completedChallenges: [],
    totalXp: 0,
    level: 1,
    health: 100,
    maxHealth: 100,
    rank: 'Repository Rookie',
    unlockedAbilities: [],
    collectibles: [],
    achievements: [],
    secretMissionsCompleted: [],
    attemptedCommands: [],
    worldPositions: {},
    characterAppearance: { ...DEFAULT_APPEARANCE },
    lastSavedAt: null,
    createdAt: Date.now(),
    challengeProgress: {},
    collectedGems: [],
  };
}

export interface GameEngineCallbacks {
  onProgressUpdate: (progress: GameProgress) => void;
  onRepoStateChange: (state: RepositoryState) => void;
  onTerminalOutput: (lines: TerminalLine[]) => void;
  onChallengeComplete: (challengeId: string, xpEarned: number) => void;
  onScreenChange: (screen: GameScreen) => void;
  onRankUp: (newRank: string) => void;
  onAchievementUnlock: (achievementId: string) => void;
  onDamage: (amount: number) => void;
  onHeal: (amount: number) => void;
  /** Optional: fires for every combat beat (hit, miss, player hit, victory, defeat, gem). */
  onCombat?: (event: CombatEvent) => void;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Damage a monster deals when the player enters a command that fails. Bosses hit harder. */
export const MONSTER_DAMAGE = 8;
export const BOSS_DAMAGE = 12;
/** Health restored when a monster is defeated. */
export const VICTORY_HEAL = 20;

export class GameEngine {
  private progress: GameProgress;
  private repoState: RepositoryState;
  private terminalHistory: TerminalLine[] = [];
  private currentChallengeId: string | null = null;
  private currentWorldId: number = 1;
  private screen: GameScreen = 'menu';
  private callbacks: GameEngineCallbacks;
  private attemptedCommandForChallenge: Set<string> = new Set();
  private defeated = false;
  private combatSeq = 0;
  private practice = false;
  private shieldSpent = false;
  private crystalUsed = false;
  private hintStage: Record<string, number> = {};

  private emitCombat(e: DistributiveOmit<CombatEvent, 'id'>): void {
    this.callbacks.onCombat?.({ ...e, id: ++this.combatSeq } as CombatEvent);
  }

  isDefeated(): boolean {
    return this.defeated;
  }

  /** Practice mode: wrong commands never cost health. Learn without pressure. */
  setPractice(on: boolean): void {
    this.practice = on;
  }

  isPractice(): boolean {
    return this.practice;
  }

  /** Abilities depend on your current rank (they used to unlock only when the rank changed, so rank 1 got none). */
  hasAbility(id: string): boolean {
    const ability = ABILITIES.find((a) => a.id === id);
    const rank = RANKS.find((r) => r.name === this.progress.rank);
    return !!ability && !!rank && ability.unlockRank <= rank.level;
  }

  canUseRecoveryCrystal(): boolean {
    return this.hasAbility('recovery_crystal') && !this.crystalUsed && !this.defeated && this.progress.health < this.progress.maxHealth;
  }

  /** Recovery Crystal: restore health to full, once per level run. */
  useRecoveryCrystal(): void {
    if (!this.canUseRecoveryCrystal()) return;
    const healed = this.progress.maxHealth - this.progress.health;
    this.progress.health = this.progress.maxHealth;
    this.crystalUsed = true;
    this.callbacks.onHeal(healed);
    this.terminalHistory.push({ type: 'success', text: `💎 Recovery Crystal restored your health (+${healed} HP).` });
    this.emitCombat({ type: 'heal', amount: healed });
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
    this.notifyAll();
  }

  constructor(callbacks: GameEngineCallbacks, existingProgress?: GameProgress | null) {
    this.callbacks = callbacks;
    this.progress = existingProgress ?? createNewProgress();
    this.repoState = createInitialRepoState();
  }

  getProgress(): GameProgress {
    return { ...this.progress };
  }

  getRepoState(): RepositoryState {
    return this.repoState;
  }

  getTerminalHistory(): TerminalLine[] {
    return [...this.terminalHistory];
  }

  getCurrentChallengeId(): string | null {
    return this.currentChallengeId;
  }

  getCurrentWorldId(): number {
    return this.currentWorldId;
  }

  getScreen(): GameScreen {
    return this.screen;
  }

  setScreen(screen: GameScreen): void {
    this.screen = screen;
    this.callbacks.onScreenChange(screen);
  }

  getWorlds() {
    return WORLDS;
  }

  getSecretMissions() {
    return SECRET_MISSIONS;
  }

  getDiscoveredSecretMissions() {
    return SECRET_MISSIONS.filter((m) => {
      if (this.progress.secretMissionsCompleted.includes(m.id)) return false;
      return m.discoverCondition(this.progress);
    });
  }

  startNewGame(): void {
    this.progress = createNewProgress();
    this.repoState = createInitialRepoState();
    this.terminalHistory = [];
    this.currentChallengeId = null;
    this.currentWorldId = 1;
    this.attemptedCommandForChallenge.clear();
    this.crystalUsed = false;
    this.setScreen('worldMap');
    this.notifyAll();
  }

  loadProgress(progress: GameProgress): void {
    this.progress = progress;
    this.defeated = false;
    this.crystalUsed = false;
    this.currentWorldId = progress.currentWorldId;
    this.repoState = createInitialRepoState();
    this.terminalHistory = [];
    this.currentChallengeId = null;
    this.setScreen('worldMap');
    this.notifyAll();
  }

  enterWorld(worldId: number): void {
    if (!this.progress.unlockedWorlds.includes(worldId)) return;
    if (this.currentWorldId !== worldId) this.crystalUsed = false;
    this.currentWorldId = worldId;
    const world = WORLDS.find((w) => w.id === worldId);
    if (!world || world.challenges.length === 0) return;
    this.startChallenge(world.challenges[0].id);
  }

  startChallenge(challengeId: string): void {
    let challenge: import('../types').WorldChallenge | undefined;
    for (const world of WORLDS) {
      challenge = world.challenges.find((c) => c.id === challengeId);
      if (challenge) {
        this.currentWorldId = world.id;
        break;
      }
    }
    if (!challenge) {
      const sm = secretMissions.find((c) => c.id === challengeId);
      if (sm) challenge = sm;
    }
    if (!challenge) return;

    if (this.defeated) {
      this.defeated = false;
      this.progress.health = this.progress.maxHealth;
    }
    this.currentChallengeId = challengeId;
    this.shieldSpent = false; // Commit Shield recharges for every fight
    this.attemptedCommandForChallenge.clear();
    if (challenge.setupState) {
      this.repoState = JSON.parse(JSON.stringify(challenge.setupState));
    } else {
      this.repoState = createInitialRepoState();
    }
    this.terminalHistory = [
      { type: 'system', text: `=== ${challenge.title} ===` },
      { type: 'info', text: challenge.description },
      { type: 'system', text: '' },
      { type: 'info', text: 'Objectives:' },
      ...challenge.objectives.map((o) => ({ type: 'info' as const, text: `  • ${o.description}` })),
      { type: 'system', text: '' },
      { type: 'info', text: 'Enter git commands below. Type "help" for supported commands.' },
      { type: 'system', text: '' },
    ];
    this.setScreen('game');
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
    this.notifyAll();
  }

  processCommand(rawInput: string): void {
    const input = rawInput.trim();
    if (!input) return;

    if (input.toLowerCase() === 'help') {
      this.terminalHistory.push({ type: 'input', text: `$ ${input}` });
      this.terminalHistory.push({
        type: 'output',
        text: 'Supported commands: git init, git status, git add, git commit -m, git log, git diff, git branch, git switch, git merge, git clone, git fetch, git pull, git push, git stash, git restore, git revert, git reset, git cherry-pick, git rebase, git reflog, git remote, git ignore, git resolve, git issue, git pr',
      });
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
      return;
    }

    if (input.toLowerCase() === 'hint') {
      this.terminalHistory.push({ type: 'input', text: `$ ${input}` });
      const challenge = this.findCurrentChallenge();
      if (challenge) {
        const incomplete = challenge.objectives.find((o) => {
          const prog = this.progress.challengeProgress[this.currentChallengeId!];
          return !prog?.objectivesCompleted.includes(o.id);
        });
        if (incomplete) {
          const stage = (this.hintStage[incomplete.id] ?? 0) + 1;
          this.hintStage[incomplete.id] = stage;
          this.terminalHistory.push({ type: 'info', text: `Hint: ${incomplete.hint}` });
          if (stage >= 2) this.terminalHistory.push({ type: 'info', text: `📖 Remember: ${incomplete.concept}` });
          const open = this.repoState.conflicts.filter((c) => !c.resolved);
          if (open.length > 0 && this.hasAbility('conflict_sense')) {
            this.terminalHistory.push({ type: 'info', text: `⚠ Conflict Sense: unresolved conflicts in ${open.map((c) => c.file).join(', ')}` });
          }
          const chProgress = this.progress.challengeProgress[this.currentChallengeId!] || { hintsUsed: 0, objectivesCompleted: [] };
          chProgress.hintsUsed++;
          this.progress.challengeProgress[this.currentChallengeId!] = chProgress;
        } else {
          this.terminalHistory.push({ type: 'info', text: 'All objectives complete! Commit your progress.' });
        }
      }
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
      this.notifyAll();
      return;
    }

    if (input.toLowerCase() === 'clear') {
      this.terminalHistory = [];
      this.callbacks.onTerminalOutput([]);
      return;
    }

    if (this.defeated) {
      this.terminalHistory.push({ type: 'error', text: 'You were defeated. Restart the level to keep fighting.' });
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
      return;
    }

    this.terminalHistory.push({ type: 'input', text: `$ ${input}` });

    const challengeForCombat = this.findCurrentChallenge();
    const challengeKey = this.currentChallengeId;
    const doneBefore = challengeKey ? this.progress.challengeProgress[challengeKey]?.objectivesCompleted.length ?? 0 : 0;

    const { result, newState } = executeCommand(this.repoState, input);
    this.repoState = newState;

    for (const line of result.output) {
      this.terminalHistory.push({
        type: result.success ? 'success' : 'error',
        text: line,
      });
    }

    if (result.concept) {
      this.terminalHistory.push({ type: 'info', text: `💡 ${result.concept}` });
    }

    if (!result.success) {
      const why = explainFailure(input, result.output, this.repoState);
      if (why) this.terminalHistory.push({ type: 'info', text: `🧭 ${why}` });
    }

    this.callbacks.onTerminalOutput([...this.terminalHistory]);

    if (result.stateChange || result.success) {
      this.checkObjectives(result);
    }

    // Track attempted commands to prevent XP farming
    if (this.currentChallengeId) {
      this.attemptedCommandForChallenge.add(input);
    }

    // Combat: a correct command that advances an objective hurts the monster; a failing command hurts you.
    if (challengeForCombat && challengeKey) {
      const total = challengeForCombat.objectives.length;
      const doneAfter = this.progress.challengeProgress[challengeKey]?.objectivesCompleted.length ?? 0;
      if (doneBefore < total) {
        if (doneAfter > doneBefore) {
          // 'hit' / 'defeated' events are emitted from checkObjectives
        } else if (!result.success) {
          this.hurtPlayer(challengeForCombat.isBoss ? BOSS_DAMAGE : MONSTER_DAMAGE);
        } else {
          this.terminalHistory.push({ type: 'info', text: 'That worked, but it did not hurt the monster. Check your objective (or type "hint").' });
          this.callbacks.onTerminalOutput([...this.terminalHistory]);
          this.emitCombat({ type: 'miss' });
        }
      }
    }

    this.notifyAll();
  }

  private hurtPlayer(amount: number): void {
    if (this.practice) {
      this.terminalHistory.push({ type: 'info', text: `🎓 Practice mode: that would have cost ${amount} HP. No damage taken.` });
      this.emitCombat({ type: 'player-hit', damage: 0, health: this.progress.health });
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
      return;
    }
    if (!this.shieldSpent && this.hasAbility('commit_shield')) {
      this.shieldSpent = true;
      this.terminalHistory.push({ type: 'success', text: '🛡️ Commit Shield absorbed the hit! (one per fight)' });
      this.emitCombat({ type: 'shield' });
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
      return;
    }
    this.progress.health = Math.max(0, this.progress.health - amount);
    this.callbacks.onDamage(amount);
    this.terminalHistory.push({ type: 'error', text: `💥 Wrong move! The monster strikes back: -${amount} HP` });
    this.emitCombat({ type: 'player-hit', damage: amount, health: this.progress.health });
    if (this.progress.health <= 0) {
      this.defeated = true;
      this.terminalHistory.push({ type: 'error', text: '💀 You were defeated. Restart the level to try again.' });
      this.emitCombat({ type: 'player-down' });
    }
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
  }

  /** Start the current world over: full health, monsters respawn, quest progress for the world is cleared. */
  restartLevel(): void {
    this.defeated = false;
    this.crystalUsed = false;
    this.progress.health = this.progress.maxHealth;
    const secretChallenge = secretMissions.find((c) => c.id === this.currentChallengeId);
    if (secretChallenge) {
      delete this.progress.challengeProgress[secretChallenge.id];
      this.emitCombat({ type: 'restart' });
      this.startChallenge(secretChallenge.id);
      this.terminalHistory.unshift({ type: 'success', text: '🔄 Mission restarted. Health restored. Good luck!' });
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
      this.notifyAll();
      return;
    }
    const world = WORLDS.find((w) => w.id === this.currentWorldId);
    if (world && world.challenges.length > 0) {
      for (const c of world.challenges) delete this.progress.challengeProgress[c.id];
      this.emitCombat({ type: 'restart' });
      this.startChallenge(world.challenges[0].id);
    } else if (this.currentChallengeId) {
      delete this.progress.challengeProgress[this.currentChallengeId];
      this.emitCombat({ type: 'restart' });
      this.startChallenge(this.currentChallengeId);
    }
    this.terminalHistory.unshift({ type: 'success', text: '🔄 Level restarted. Health restored. Good luck!' });
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
    this.notifyAll();
  }

  /** Pick up a gem along the path (once per gem id). */
  collectGem(id: string, xp = 5): void {
    if (!this.progress.collectedGems) this.progress.collectedGems = [];
    if (this.progress.collectedGems.includes(id)) return;
    this.progress.collectedGems.push(id);
    this.awardXp(xp);
    this.updateRank();
    this.terminalHistory.push({ type: 'success', text: `💎 Gem collected! +${xp} XP` });
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
    this.emitCombat({ type: 'gem', xp });
    this.notifyAll();
  }

  private findCurrentChallenge(): import('../types').WorldChallenge | undefined {
    if (!this.currentChallengeId) return undefined;
    for (const world of WORLDS) {
      const c = world.challenges.find((c) => c.id === this.currentChallengeId);
      if (c) return c;
    }
    return secretMissions.find((c) => c.id === this.currentChallengeId);
  }

  private checkObjectives(result: CommandResult): void {
    const challenge = this.findCurrentChallenge();
    if (!challenge || !this.currentChallengeId) return;

    const chProgress = this.progress.challengeProgress[this.currentChallengeId] || { hintsUsed: 0, objectivesCompleted: [] };
    let newlyCompleted = 0;
    let totalXpThisCommand = 0;
    const replay = this.progress.completedChallenges.some((c) => c.challengeId === challenge.id);

    for (const objective of challenge.objectives) {
      if (chProgress.objectivesCompleted.includes(objective.id)) continue;
      try {
        if (objective.check(this.repoState, result)) {
          chProgress.objectivesCompleted.push(objective.id);
          newlyCompleted++;
          if (!replay) totalXpThisCommand += objective.xpReward;
          this.terminalHistory.push({ type: 'success', text: `✓ Direct hit! Objective complete: ${objective.description} ${replay ? '(replay: no XP)' : `(+${objective.xpReward} XP)`}` });
        }
      } catch {
        // Objective check failed — skip
      }
    }

    if (newlyCompleted > 0) {
      this.progress.challengeProgress[this.currentChallengeId] = chProgress;
      const noHints = chProgress.hintsUsed === 0;
      this.awardXp(totalXpThisCommand);

      const total = challenge.objectives.length;
      const remaining = total - chProgress.objectivesCompleted.length;
      this.emitCombat({ type: 'hit', remaining, total });

      // Check if all objectives complete: the monster is defeated
      if (remaining === 0) {
        this.completeChallenge(challenge.id, totalXpThisCommand, noHints);
        const secret = SECRET_MISSIONS.find((m) => m.challengeId === challenge.id);
        if (secret) this.completeSecretMission(secret.id);
        const before = this.progress.health;
        this.progress.health = Math.min(this.progress.maxHealth, this.progress.health + VICTORY_HEAL);
        const healed = this.progress.health - before;
        if (healed > 0) {
          this.callbacks.onHeal(healed);
          this.terminalHistory.push({ type: 'success', text: `❤️ Victory! You recover ${healed} HP.` });
        }
        this.emitCombat({ type: 'defeated', healed });
      }
    }

    this.callbacks.onTerminalOutput([...this.terminalHistory]);
  }

  private completeChallenge(challengeId: string, xpEarned: number, noHints: boolean): void {
    const world = WORLDS.find((w) => w.challenges.some((c) => c.id === challengeId));
    const worldId = world?.id ?? 0;

    if (this.progress.completedChallenges.some((c) => c.challengeId === challengeId)) return;

    const completed: CompletedChallenge = {
      challengeId,
      worldId,
      completedAt: Date.now(),
      xpEarned,
      noHintsUsed: noHints,
    };
    this.progress.completedChallenges.push(completed);

    // Award bonus XP for no-hints
    if (noHints) {
      this.awardXp(10);
      this.terminalHistory.push({ type: 'success', text: '🏆 No hints used! +10 bonus XP' });
    }

    // Unlock next challenge or world
    if (world) {
      const challengeIndex = world.challenges.findIndex((c) => c.id === challengeId);
      const nextChallenge = world.challenges[challengeIndex + 1];

      if (nextChallenge) {
        this.terminalHistory.push({ type: 'info', text: `Next challenge unlocked: ${nextChallenge.title}` });
      } else {
        // World complete — unlock next world
        const nextWorld = WORLDS.find((w) => w.id === world.id + 1);
        if (nextWorld && !this.progress.unlockedWorlds.includes(nextWorld.id)) {
          this.progress.unlockedWorlds.push(nextWorld.id);
          this.terminalHistory.push({ type: 'success', text: `🌟 New world unlocked: ${nextWorld.name}!` });
        }
      }
    }

    // Check for secret mission discoveries
    this.checkSecretMissionUnlocks();

    // Check achievements
    this.checkAchievements(challengeId, worldId, noHints);

    // Update rank
    this.updateRank();

    // Award collectibles
    this.checkCollectibleRewards(worldId);

    this.callbacks.onChallengeComplete(challengeId, xpEarned);
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
  }

  private awardXp(amount: number): void {
    this.progress.totalXp += amount;
    this.progress.level = getLevelForXp(this.progress.totalXp);
  }

  private updateRank(): void {
    const worldsCompleted = new Set(this.progress.completedChallenges.map((c) => c.worldId)).size;
    const newRank = getRankForProgress(this.progress.totalXp, worldsCompleted);
    if (newRank.name !== this.progress.rank) {
      this.progress.rank = newRank.name;
      // Unlock abilities for this rank
      const newAbilities = ABILITIES.filter((a) => a.unlockRank <= newRank.level && !this.progress.unlockedAbilities.includes(a.id));
      for (const ability of newAbilities) {
        this.progress.unlockedAbilities.push(ability.id);
      }
      this.callbacks.onRankUp(newRank.name);
    }
  }

  private checkSecretMissionUnlocks(): void {
    const discovered = SECRET_MISSIONS.filter((m) => {
      if (this.progress.secretMissionsCompleted.includes(m.id)) return false;
      return m.discoverCondition(this.progress);
    });
    for (const mission of discovered) {
      if (!this.progress.achievements.includes(mission.achievementId) && !this.progress.secretMissionsCompleted.includes(mission.id)) {
        this.terminalHistory.push({ type: 'info', text: `🔍 Secret mission discovered: ${mission.name}` });
      }
    }
  }

  private checkAchievements(challengeId: string, worldId: number, noHints: boolean): void {
    const newAchievements: string[] = [];

    if (challengeId === 'w1_c4_commit' || challengeId === 'w1_boss') {
      if (!this.progress.achievements.includes('first_commit')) newAchievements.push('first_commit');
      if (!this.progress.achievements.includes('repo_init')) newAchievements.push('repo_init');
    }
    if (challengeId === 'w3_boss' && !this.progress.achievements.includes('branch_master')) {
      newAchievements.push('branch_master');
    }
    if (challengeId === 'w4_boss' && noHints && !this.progress.achievements.includes('conflict_resolver')) {
      newAchievements.push('conflict_resolver');
    }
    if (challengeId === 'w5_boss' && !this.progress.achievements.includes('remote_explorer')) {
      newAchievements.push('remote_explorer');
    }
    if (challengeId === 'w8_boss' && !this.progress.achievements.includes('dragon_slayer')) {
      newAchievements.push('dragon_slayer');
    }

    // No hints master: 5 challenges without hints
    const noHintCount = this.progress.completedChallenges.filter((c) => c.noHintsUsed).length;
    if (noHintCount >= 5 && !this.progress.achievements.includes('no_hints_master')) {
      newAchievements.push('no_hints_master');
    }

    // All worlds completed
    const worldsCompleted = new Set(this.progress.completedChallenges.filter((c) => c.worldId > 0).map((c) => c.worldId));
    if (worldsCompleted.size >= 8 && !this.progress.achievements.includes('all_worlds')) {
      newAchievements.push('all_worlds');
    }

    for (const achId of newAchievements) {
      if (!this.progress.achievements.includes(achId)) {
        this.progress.achievements.push(achId);
        const ach = ACHIEVEMENTS.find((a) => a.id === achId);
        if (ach) {
          this.terminalHistory.push({ type: 'success', text: `🏅 Achievement unlocked: ${ach.name} — ${ach.description}` });
        }
        this.callbacks.onAchievementUnlock(achId);
      }
    }
  }

  private checkCollectibleRewards(worldId: number): void {
    const world = WORLDS.find((w) => w.id === worldId);
    if (!world) return;
    const bossChallenge = world.challenges.find((c) => c.isBoss);
    if (bossChallenge && this.progress.completedChallenges.some((c) => c.challengeId === bossChallenge.id)) {
      const collectibleId = `crystal_${worldId}`;
      if (!this.progress.collectibles.includes(collectibleId)) {
        this.progress.collectibles.push(collectibleId);
        const collectible = COLLECTIBLES.find((c) => c.id === collectibleId);
        if (collectible) {
          this.terminalHistory.push({ type: 'success', text: `💎 Collected: ${collectible.name}` });
        }
      }
    }
  }

  completeSecretMission(missionId: string): void {
    const mission = SECRET_MISSIONS.find((m) => m.id === missionId);
    if (!mission) return;
    if (this.progress.secretMissionsCompleted.includes(missionId)) return;

    this.progress.secretMissionsCompleted.push(missionId);
    this.awardXp(mission.xpReward);
    if (!this.progress.collectibles.includes(mission.rareCollectible)) {
      this.progress.collectibles.push(mission.rareCollectible);
    }
    if (!this.progress.achievements.includes(mission.achievementId)) {
      this.progress.achievements.push(mission.achievementId);
      this.callbacks.onAchievementUnlock(mission.achievementId);
    }
    this.terminalHistory.push({ type: 'success', text: `🌟 Secret mission complete: ${mission.name}! +${mission.xpReward} XP` });
    this.callbacks.onTerminalOutput([...this.terminalHistory]);
    this.updateRank();
    this.notifyAll();
  }

  takeDamage(amount: number): void {
    this.progress.health = Math.max(0, this.progress.health - amount);
    this.callbacks.onDamage(amount);
    if (this.progress.health <= 0 && !this.defeated) {
      this.defeated = true;
      this.terminalHistory.push({ type: 'error', text: '💀 You were defeated. Restart the level to try again.' });
      this.emitCombat({ type: 'player-down' });
      this.callbacks.onTerminalOutput([...this.terminalHistory]);
    }
    this.notifyAll();
  }

  heal(amount: number): void {
    this.progress.health = Math.min(this.progress.maxHealth, this.progress.health + amount);
    this.callbacks.onHeal(amount);
    this.notifyAll();
  }

  updateCharacterAppearance(appearance: Partial<CharacterAppearance>): void {
    this.progress.characterAppearance = { ...this.progress.characterAppearance, ...appearance };
    this.notifyAll();
  }

  getProficiencyReport(): ProficiencyReport {
    const totalChallenges = WORLDS.reduce((sum, w) => sum + w.challenges.length, 0) + secretMissions.length;
    const completed = this.progress.completedChallenges.length;
    const commandStats: Record<string, number> = {};
    for (const cmd of this.progress.attemptedCommands) {
      const base = cmd.split(/\s+/).slice(0, 2).join(' ');
      commandStats[base] = (commandStats[base] || 0) + 1;
    }
    const noHintChallenges = this.progress.completedChallenges.filter((c) => c.noHintsUsed).length;
    const worldsCompleted = new Set(this.progress.completedChallenges.filter((c) => c.worldId > 0).map((c) => c.worldId)).size;
    const score = Math.round(
      (completed / totalChallenges) * 40 +
        (this.progress.totalXp / 1000) * 20 +
        (noHintChallenges / Math.max(1, completed)) * 20 +
        (this.progress.secretMissionsCompleted.length / Math.max(1, SECRET_MISSIONS.length)) * 10 +
        (worldsCompleted / 8) * 10
    );

    return {
      totalChallenges,
      completedChallenges: completed,
      totalXp: this.progress.totalXp,
      rank: this.progress.rank,
      commandStats,
      worldsCompleted,
      secretMissionsCompleted: this.progress.secretMissionsCompleted.length,
      noHintChallenges,
      proficiencyScore: Math.min(100, score),
    };
  }

  private notifyAll(): void {
    this.callbacks.onProgressUpdate(this.getProgress());
    this.callbacks.onRepoStateChange(this.getRepoState());
  }
}
