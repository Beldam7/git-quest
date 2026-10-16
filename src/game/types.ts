import type { CharacterAppearance } from './adapters/CharacterAppearanceAdapter';

export type GitCommand = string;

export interface SimFile {
  name: string;
  content: string;
  tracked: boolean;
  staged: boolean;
  ignored: boolean;
}

export interface SimCommit {
  id: string;
  message: string;
  parentIds: string[];
  branch: string;
  files: SimFile[];
  timestamp: number;
}

export interface SimBranch {
  name: string;
  headCommitId: string | null;
  isRemote: boolean;
  remoteName?: string;
}

export interface SimRemote {
  name: string;
  url: string;
  branches: Record<string, string | null>;
}

export interface SimIssue {
  id: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
}

export interface SimPullRequest {
  id: number;
  title: string;
  body: string;
  sourceBranch: string;
  targetBranch: string;
  state: 'open' | 'merged' | 'closed';
  author: string;
  reviews: SimReview[];
}

export interface SimReview {
  id: number;
  author: string;
  body: string;
  status: 'approved' | 'changes_requested' | 'commented';
}

export interface MergeConflict {
  file: string;
  ours: string;
  theirs: string;
  resolved: boolean;
  resolution?: 'ours' | 'theirs' | 'manual';
}

export interface RepositoryState {
  initialized: boolean;
  currentBranch: string;
  branches: Record<string, SimBranch>;
  commits: Record<string, SimCommit>;
  files: SimFile[];
  remotes: Record<string, SimRemote>;
  stash: { files: SimFile[]; branch: string; message: string }[];
  issues: SimIssue[];
  pullRequests: SimPullRequest[];
  conflicts: MergeConflict[];
  mergeInProgress: boolean;
  mergeTarget: string | null;
  rebaseInProgress: boolean;
  rebaseTarget: string | null;
  pendingRebaseCommits: string[];
  currentRebaseCommit: number;
  gitignore: string[];
  reflog: { action: string; commitId: string; timestamp: number }[];
  rejectedPush: boolean;
  pushRejectionBranch: string | null;
}

export type TerminalLineType = 'input' | 'output' | 'success' | 'error' | 'info' | 'system';

export interface TerminalLine {
  type: TerminalLineType;
  text: string;
}

export interface CommandResult {
  success: boolean;
  output: string[];
  stateChange: boolean;
  concept?: string;
  xpAwarded: number;
  conflictCreated?: boolean;
}

export interface ChallengeObjective {
  id: string;
  description: string;
  hint: string;
  concept: string;
  check: (state: RepositoryState, result: CommandResult) => boolean;
  xpReward: number;
}

export interface WorldChallenge {
  id: string;
  title: string;
  description: string;
  setupState?: Partial<RepositoryState>;
  initialCommands?: string[];
  objectives: ChallengeObjective[];
  concept: string;
  bossName?: string;
  isBoss?: boolean;
}

export interface GameWorld {
  id: number;
  name: string;
  description: string;
  region: string;
  color: string;
  accentColor: string;
  challenges: WorldChallenge[];
  unlockCondition: (progress: GameProgress) => boolean;
  bossName: string;
  bossDescription: string;
  position: [number, number, number];
  isFinalWorld?: boolean;
}

export type RankName =
  | 'Repository Rookie'
  | 'Commit Apprentice'
  | 'Branch Guardian'
  | 'Merge Specialist'
  | 'Git Master'
  | 'Git Legend';

export interface Rank {
  name: RankName;
  level: number;
  minXp: number;
  requiredWorlds: number;
  description: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockRank: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
  unlockCondition: string;
}

export interface SecretMission {
  id: string;
  name: string;
  description: string;
  challengeId: string;
  discoverCondition: (progress: GameProgress) => boolean;
  xpReward: number;
  rareCollectible: string;
  achievementId: string;
}

export interface Collectible {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface CompletedChallenge {
  challengeId: string;
  worldId: number;
  completedAt: number;
  xpEarned: number;
  noHintsUsed: boolean;
}

export interface GameProgress {
  currentWorldId: number;
  unlockedWorlds: number[];
  completedChallenges: CompletedChallenge[];
  totalXp: number;
  level: number;
  health: number;
  maxHealth: number;
  rank: RankName;
  unlockedAbilities: string[];
  collectibles: string[];
  achievements: string[];
  secretMissionsCompleted: string[];
  attemptedCommands: string[];
  worldPositions: Record<number, [number, number, number]>;
  characterAppearance: CharacterAppearance;
  lastSavedAt: number | null;
  createdAt: number;
  challengeProgress: Record<string, { hintsUsed: number; objectivesCompleted: string[] }>;
  /** Gems picked up along the paths (ids like `g3-7`). Optional so older saves still load. */
  collectedGems?: string[];
}

/** What just happened in the fight, so the 3D world and HUD can react. `id` increases with every event. */
export type CombatEvent =
  | { id: number; type: 'hit'; remaining: number; total: number }
  | { id: number; type: 'miss' }
  | { id: number; type: 'player-hit'; damage: number; health: number }
  | { id: number; type: 'defeated'; healed: number }
  | { id: number; type: 'player-down' }
  | { id: number; type: 'restart' }
  | { id: number; type: 'gem'; xp: number }
  | { id: number; type: 'shield' }
  | { id: number; type: 'heal'; amount: number };

export interface GameSession {
  progress: GameProgress;
  currentChallengeId: string | null;
  worldId: number;
  repoState: RepositoryState;
  terminalHistory: TerminalLine[];
}

export type GameScreen =
  | 'menu'
  | 'worldMap'
  | 'leaderboard'
  | 'victory'
  | 'explore'
  | 'leaderboard'
  | 'game'
  | 'pause'
  | 'achievements'
  | 'character'
  | 'report';

export interface ProficiencyReport {
  totalChallenges: number;
  completedChallenges: number;
  totalXp: number;
  rank: RankName;
  commandStats: Record<string, number>;
  worldsCompleted: number;
  secretMissionsCompleted: number;
  noHintChallenges: number;
  proficiencyScore: number;
}
