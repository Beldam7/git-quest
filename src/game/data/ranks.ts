import type { Rank, Ability, Achievement, Collectible } from '../types';

export const RANKS: Rank[] = [
  { name: 'Repository Rookie', level: 1, minXp: 0, requiredWorlds: 0, description: 'Just starting your journey through the Repository Kingdom.' },
  { name: 'Commit Apprentice', level: 2, minXp: 50, requiredWorlds: 1, description: 'You understand commits and staging. The basics are solid.' },
  { name: 'Branch Guardian', level: 3, minXp: 150, requiredWorlds: 2, description: 'You can navigate branches with confidence.' },
  { name: 'Merge Specialist', level: 4, minXp: 300, requiredWorlds: 4, description: 'Conflicts fear you. You resolve them with precision.' },
  { name: 'Git Master', level: 5, minXp: 600, requiredWorlds: 6, description: 'Advanced Git workflows are your domain.' },
  { name: 'Git Legend', level: 6, minXp: 1000, requiredWorlds: 8, description: 'You have conquered the Repository Kingdom. Few reach this rank.' },
];

export const ABILITIES: Ability[] = [
  { id: 'commit_shield', name: 'Commit Shield', description: 'Protects against one failed challenge. Consumed on use.', icon: 'shield', unlockRank: 1 },
  { id: 'branch_vision', name: 'Branch Vision', description: 'Reals branch relationships and connections in the world map.', icon: 'git-branch', unlockRank: 3 },
  { id: 'conflict_sense', name: 'Conflict Sense', description: 'Provides a hint for conflict resolution challenges.', icon: 'alert-triangle', unlockRank: 4 },
  { id: 'recovery_crystal', name: 'Recovery Crystal', description: 'Restores health to full when activated.', icon: 'heart', unlockRank: 2 },
  { id: 'timekeeper', name: 'Timekeeper', description: 'Unlocks advanced time-reversal history challenges.', icon: 'clock', unlockRank: 5 },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_commit', name: 'First Commit', description: 'Make your first git commit.', icon: 'git-commit', hidden: false, unlockCondition: 'Complete the first challenge.' },
  { id: 'repo_init', name: 'Repository Born', description: 'Initialize your first repository.', icon: 'database', hidden: false, unlockCondition: 'Run git init successfully.' },
  { id: 'branch_master', name: 'Branch Master', description: 'Create and switch between 3 branches.', icon: 'git-branch', hidden: false, unlockCondition: 'Complete World 3.' },
  { id: 'conflict_resolver', name: 'Conflict Resolver', description: 'Resolve a merge conflict without hints.', icon: 'git-merge', hidden: false, unlockCondition: 'Complete World 4 without hints.' },
  { id: 'remote_explorer', name: 'Remote Explorer', description: 'Clone, fetch, pull, and push successfully.', icon: 'cloud', hidden: false, unlockCondition: 'Complete World 5.' },
  { id: 'time_weaver', name: 'Time Weaver', description: 'Use reflog to recover a lost commit.', icon: 'clock', hidden: true, unlockCondition: 'Complete the Ghost Commit secret mission.' },
  { id: 'silent_guardian', name: 'Silent Guardian', description: 'Configure .gitignore to protect files.', icon: 'eye-off', hidden: true, unlockCondition: 'Complete the Silent Guardian secret mission.' },
  { id: 'gate_crasher', name: 'Gate Crasher', description: 'Resolve a rejected push.', icon: 'lock', hidden: true, unlockCondition: 'Complete the Gate Crasher secret mission.' },
  { id: 'clean_timeline', name: 'Clean Timeline', description: 'Complete a rebase challenge.', icon: 'git-commit', hidden: true, unlockCondition: 'Complete the Clean Timeline secret mission.' },
  { id: 'dragon_slayer', name: 'Dragon Slayer', description: 'Defeat the Merge Dragon and complete the game.', icon: 'swords', hidden: false, unlockCondition: 'Complete World 8.' },
  { id: 'no_hints_master', name: 'Flawless Scholar', description: 'Complete 5 challenges without using any hints.', icon: 'award', hidden: false, unlockCondition: 'Complete 5 challenges with no hints.' },
  { id: 'all_worlds', name: 'Kingdom Conqueror', description: 'Complete all 8 worlds.', icon: 'crown', hidden: false, unlockCondition: 'Complete all worlds.' },
];

export const COLLECTIBLES: Collectible[] = [
  { id: 'crystal_blue', name: 'Azure Crystal', description: 'A glowing blue crystal of knowledge.', icon: 'gem', rarity: 'common' },
  { id: 'crystal_green', name: 'Emerald Crystal', description: 'A vibrant green crystal of growth.', icon: 'gem', rarity: 'common' },
  { id: 'crystal_red', name: 'Crimson Crystal', description: 'A rare red crystal of power.', icon: 'gem', rarity: 'rare' },
  { id: 'crystal_gold', name: 'Golden Crystal', description: 'A legendary golden crystal of mastery.', icon: 'gem', rarity: 'legendary' },
  { id: 'relic_reflog', name: 'Reflog Relic', description: 'An ancient relic that records lost time.', icon: 'hourglass', rarity: 'rare' },
  { id: 'relic_ignore', name: 'Ward of Ignorance', description: 'A protective ward that hides unwanted things.', icon: 'eye-off', rarity: 'rare' },
  { id: 'relic_gate', name: 'Key of the Gate', description: 'A key that opens rejected doors.', icon: 'key', rarity: 'rare' },
  { id: 'relic_rebase', name: 'Timeline Shaper', description: 'A tool that reshapes history itself.', icon: 'git-commit', rarity: 'legendary' },
  { id: 'crown_dragon', name: "Dragon's Crown", description: 'The crown of the Merge Dragon, symbol of ultimate mastery.', icon: 'crown', rarity: 'legendary' },
];

export function getRankForProgress(totalXp: number, worldsCompleted: number): Rank {
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (totalXp >= rank.minXp && worldsCompleted >= rank.requiredWorlds) {
      currentRank = rank;
    }
  }
  return currentRank;
}

export function getLevelForXp(totalXp: number): number {
  // Simple level formula: each level requires more XP
  let level = 1;
  let needed = 30;
  let accumulated = 0;
  while (totalXp >= accumulated + needed) {
    accumulated += needed;
    level++;
    needed = Math.floor(needed * 1.4);
  }
  return level;
}

export function getXpForNextLevel(totalXp: number): { current: number; needed: number; nextLevelXp: number } {
  let level = 1;
  let needed = 30;
  let accumulated = 0;
  while (totalXp >= accumulated + needed) {
    accumulated += needed;
    level++;
    needed = Math.floor(needed * 1.4);
  }
  return { current: totalXp - accumulated, needed, nextLevelXp: accumulated + needed };
}
