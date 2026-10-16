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
  Scene: ComponentType<SceneProps>;
}
