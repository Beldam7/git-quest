import type { ComponentType } from 'react';

/**
 * Everything the 3D worlds are allowed to react to. All values are derived from the real
 * simulator state (see signals.ts), so a failed command, which changes no state, can never
 * trigger a success effect.
 */
export interface WorldSignals {
  initialized: boolean;
  currentBranch: string;
  /** Local branch names, in creation order. */
  branchNames: string[];
  commitCount: number;
  unresolvedConflicts: number;
  /** Conflicts existed and every one has been resolved. */
  conflictsResolved: boolean;
  mergeInProgress: boolean;
  hasRemote: boolean;
  /** At least one remote-tracking branch exists locally (clone/fetch happened). */
  fetched: boolean;
  /** A remote has at least one branch with a commit (something was pushed or cloned). */
  pushed: boolean;
  rejectedPush: boolean;
  stashCount: number;
  reflogCount: number;
  /** Number of .gitignore rules. */
  ignoreRules: number;
  /** Number of patterns in .gitignore. */
  ignoredCount: number;
  /** Commits with more than one parent (merge commits). */
  mergeCommitCount: number;
  rebaseInProgress: boolean;
  issueCount: number;
  openPullRequests: number;
  mergedPullRequests: number;
  approvedReviews: number;
  /** Fraction (0..1) of this world's quests completed. */
  worldProgress: number;
}

export interface WorldTheme {
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sun: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  /** Optional enclosed-space tint (caves): sets a solid background instead of the sky gradient. */
  enclosed?: boolean;
  /** Night-sky star count (omit for daytime worlds). */
  stars?: number;
}

export interface TerrainPalette {
  low: string;
  mid: string;
  high: string;
  cliff: string;
  lowY: number;
  highY: number;
  cliffSlope: number;
  /** Alternating strata colors for canyon-style cliffs. */
  bands?: [string, string];
  bandSize?: number;
}

export interface SceneProps {
  signals: WorldSignals;
  reduced: boolean;
  coarse: boolean;
}

export type Circle = [number, number, number];

/** A bridge you can stand on: a deck from `a` to `b` at height `y`, with side rails. */
export interface BridgeSpec {
  a: [number, number];
  b: [number, number];
  /** Height of the plank centres; the walkable surface is a hair above. */
  y: number;
  width: number;
  /** Fraction of the span (centred) that is missing, e.g. 0.55 while a conflict has broken the bridge. */
  gap?: (s: WorldSignals) => number;
}

export interface WorldDef {
  id: number;
  theme: WorldTheme;
  terrain: { size: number; segments: number; palette: TerrainPalette };
  /** Walkable radius from the origin. */
  radius: number;
  spawn: [number, number];
  heightAt: (x: number, z: number) => number;
  /** Optional override for walkable surfaces (e.g. a bridge deck above a ravine). */
  groundAt?: (x: number, z: number, s: WorldSignals) => number;
  /** Optional extra walkability rule (e.g. cannot enter a ravine unless the bridge is intact). */
  walkable?: (x: number, z: number, s: WorldSignals) => boolean;
  /** Solid circles [x, z, radius]. */
  obstacles: Circle[];
  boss: { position: [number, number]; facing: number };
  /** Bridges the hero can walk on (deck height + rails). */
  bridges?: BridgeSpec[];
  /** Where the hero is put back if the ground vanishes under them (default: spawn). */
  rescue?: [number, number];
  /** Arc length of the route that regular monsters are spread over (default: the whole route). */
  stationSpan?: number;
  /** Hero route from the spawn point to the boss approach. Monsters (one per question) stand along it. */
  path: Array<[number, number]>;
  /** Distance at which the boss fight starts (default 16). */
  bossEngage?: number;
  Scene: ComponentType<SceneProps>;
}
