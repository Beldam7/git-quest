import type { RepositoryState } from '../types';
import type { WorldSignals } from './types';

/** Reduce the simulator state to the few facts the 3D worlds react to. */
export function deriveSignals(repo: RepositoryState | null, questsDone: number, questsTotal: number): WorldSignals {
  const branchList = repo ? Object.values(repo.branches).filter((b) => !b.isRemote).map((b) => b.name) : [];
  const remotes = repo ? Object.values(repo.remotes) : [];
  const prs = repo ? repo.pullRequests : [];
  return {
    initialized: !!repo?.initialized,
    currentBranch: repo?.currentBranch ?? 'main',
    branchNames: branchList.length > 0 ? branchList : ['main'],
    commitCount: repo ? Object.keys(repo.commits).length : 0,
    unresolvedConflicts: repo ? repo.conflicts.filter((c) => !c.resolved).length : 0,
    conflictsResolved: !!repo && repo.conflicts.length > 0 && repo.conflicts.every((c) => c.resolved) && !repo.mergeInProgress,
    mergeInProgress: !!repo?.mergeInProgress,
    hasRemote: remotes.length > 0,
    fetched: !!repo && Object.values(repo.branches).some((b) => b.isRemote),
    pushed: remotes.some((r) => Object.values(r.branches).some((v) => !!v)),
    rejectedPush: !!repo?.rejectedPush,
    stashCount: repo?.stash.length ?? 0,
    reflogCount: repo?.reflog.length ?? 0,
    ignoreRules: repo?.gitignore.length ?? 0,
    ignoredCount: repo?.gitignore.length ?? 0,
    mergeCommitCount: repo ? Object.values(repo.commits).filter((c) => c.parentIds.length > 1).length : 0,
    rebaseInProgress: !!repo?.rebaseInProgress,
    issueCount: repo?.issues.length ?? 0,
    openPullRequests: prs.filter((p) => p.state === 'open').length,
    mergedPullRequests: prs.filter((p) => p.state === 'merged').length,
    approvedReviews: prs.reduce((n, p) => n + p.reviews.filter((r) => r.status === 'approved').length, 0),
    worldProgress: questsTotal > 0 ? Math.min(1, questsDone / questsTotal) : 0,
  };
}
