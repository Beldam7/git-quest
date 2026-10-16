import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { WORLDS, secretMissions } from '../data/worlds';

/**
 * Every quest in the game (8 worlds + their bosses + the secret missions) must be completable with the commands its
 * own hints teach. If a change to the simulator or to a quest makes one impossible, this test says which.
 * Practice mode is on, so a wrong command along the way costs nothing; only the objectives matter here.
 */
const SOLUTIONS: Array<[string, string[]]> = [
  ['w1_c1_init', ['git init to create a new repository']],
  ['w1_c2_status', ['git status']],
  ['w1_c3_add', ['git add .']],
  ['w1_c4_commit', ['git commit -m "update"']],
  ['w1_boss', ['git init', 'git add .', 'git commit -m "update"']],
  ['w2_c1_log', ['git status']],
  ['w2_c2_diff', ['git diff']],
  ['w2_c3_ignore', ['git ignore debug.log', 'git ignore *.tmp']],
  ['w2_boss', ['git status', 'git diff', 'git ignore error.log']],
  ['w3_c1_branch', ['git branch feature-quest']],
  ['w3_c2_switch', ['git switch feature-quest']],
  ['w3_c3_commit_branch', ['git add .', 'git commit -m "update"']],
  ['w3_c4_merge', ['git switch main', 'git add .', 'git commit -m "update"']],
  ['w3_boss', ['git status', 'git switch -c victory', 'git switch main && git merge victory', 'git add .', 'git commit -m "update"']],
  ['w4_c1_recognize', ['git merge feature-ui']],
  ['w4_c2_resolve', ['git resolve index.html ours', 'git add .', 'git commit -m "update"']],
  ['w4_boss', ['git status', 'git merge dragon-feature', 'git add .', 'git resolve weapon.js ours', 'git commit -m "update"']],
  ['w5_c1_clone', ['git clone https://github.com/kingdom/royal-repo.git']],
  ['w5_c2_fetch', ['git fetch origin']],
  ['w5_c3_pull', ['git pull origin main']],
  ['w5_c4_push', ['git push origin main']],
  ['w5_boss', ['git status', 'git push origin main', 'git status', 'git pull origin main', 'git push origin main']],
  ['w6_c1_issue', ['git issue create "Fix login bug"']],
  ['w6_c2_branch_pr', ['git status', 'git switch -c fix/login-bug', 'git pr create "Fix login bug" fix/login-bug main']],
  ['w6_c3_review', ['git pr merge 1', 'git add .', 'git commit -m "update"']],
  ['w7_c1_stash', ['git status', 'git stash']],
  ['w7_c2_restore', ['git restore scroll.js']],
  ['w7_c3_revert', ['git revert badc01']],
  ['w7_c4_reset', ['git reset --hard base99']],
  ['w7_c5_cherry_pick', ['git cherry-pick cpfeat']],
  ['w7_c6_rebase', ['git rebase main']],
  ['w7_c7_reflog', ['git status', 'git reset --hard lost55']],
  ['w7_boss', ['git status', 'git revert tlkeep3', 'git reset --hard tlkeep2']],
  ['w8_c1_clone_branch', ['git clone https://github.com/citadel/final-quest.git', 'git switch -c final-feature']],
  ['w8_c2_commit', ['git add .', 'git commit -m "update"']],
  ['w8_c3_conflict', ['git status', 'git merge main']],
  ['w8_c4_remote', ['git push origin final-feature']],
  ['w8_c5_pr_merge', ['git pr create "Complete the final quest" final-feature main', 'git pr merge 1']],
  ['sm_ghost_commit', ['git reflog', 'git reset --hard ghost-lost']],
  ['sm_silent_guardian', ['git ignore .env', 'git ignore *.log', 'git ignore config.local.json']],
  ['sm_gate_crasher', ['git status', 'git push origin main', 'git status', 'git pull origin main', 'git push origin main']],
  ['sm_clean_timeline', ['git rebase main']],
  ['w6_boss', ['git issue create "Council demands tribute"', 'git switch -c tribute', 'git add .', 'git commit -m "tribute"', 'git pr create "Tribute" tribute main', 'git pr merge 1']],
  ['w8_boss', ['git clone https://github.com/dragon/citadel.git', 'git switch -c slay-dragon', 'git add .', 'git commit -m "Prepare to slay the dragon"', 'git push origin slay-dragon', 'git pr create "Slay the dragon" slay-dragon main', 'git pr merge 1']],
];

const callbacks = {
  onProgressUpdate: () => {}, onRepoStateChange: () => {}, onTerminalOutput: () => {}, onChallengeComplete: () => {},
  onScreenChange: () => {}, onRankUp: () => {}, onAchievementUnlock: () => {}, onDamage: () => {}, onHeal: () => {},
};

const ALL = [...WORLDS.flatMap((w) => w.challenges), ...secretMissions];

describe('every quest can be completed', () => {
  it('has a known solution for every quest in the game', () => {
    expect(SOLUTIONS.map(([id]) => id).sort()).toEqual(ALL.map((c) => c.id).sort());
  });

  for (const [id, commands] of SOLUTIONS) {
    it(`${id}`, () => {
      const challenge = ALL.find((c) => c.id === id);
      expect(challenge).toBeDefined();
      const engine = new GameEngine(callbacks);
      engine.setPractice(true);
      engine.startNewGame();
      engine.startChallenge(id);
      for (const command of commands) engine.processCommand(command);
      const done = engine.getProgress().challengeProgress[id]?.objectivesCompleted ?? [];
      expect(done).toHaveLength(challenge?.objectives.length ?? -1);
    });
  }
});
