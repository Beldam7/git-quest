import type { SecretMission } from '../types';

export const SECRET_MISSIONS: SecretMission[] = [
  {
    id: 'ghost_commit',
    name: 'Ghost Commit',
    description: 'A commit has been lost to time. Use git reflog to find and recover it with git reset or git cherry-pick.',
    challengeId: 'sm_ghost_commit',
    discoverCondition: (p) => p.completedChallenges.some((c) => c.worldId >= 2),
    xpReward: 50,
    rareCollectible: 'relic_reflog',
    achievementId: 'time_weaver',
  },
  {
    id: 'silent_guardian',
    name: 'Silent Guardian',
    description: 'Prevent sensitive files from being tracked. Configure .gitignore to protect configuration files and logs.',
    challengeId: 'sm_silent_guardian',
    discoverCondition: (p) => p.completedChallenges.some((c) => c.worldId >= 2),
    xpReward: 40,
    rareCollectible: 'relic_ignore',
    achievementId: 'silent_guardian',
  },
  {
    id: 'gate_crasher',
    name: 'Gate Crasher',
    description: 'Your push was rejected because the remote has changes you do not have. Pull first, then push again.',
    challengeId: 'sm_gate_crasher',
    discoverCondition: (p) => p.completedChallenges.some((c) => c.worldId >= 5),
    xpReward: 50,
    rareCollectible: 'relic_gate',
    achievementId: 'gate_crasher',
  },
  {
    id: 'clean_timeline',
    name: 'Clean Timeline',
    description: 'Your branch has messy merge commits. Use git rebase to create a clean linear history, then explain what happened.',
    challengeId: 'sm_clean_timeline',
    discoverCondition: (p) => p.completedChallenges.some((c) => c.worldId >= 7),
    xpReward: 60,
    rareCollectible: 'relic_rebase',
    achievementId: 'clean_timeline',
  },
];

export function getDiscoveredMissions(completedChallengeIds: string[], progress: import('../types').GameProgress): SecretMission[] {
  return SECRET_MISSIONS.filter((m) => {
    if (progress.secretMissionsCompleted.includes(m.id)) return false;
    return m.discoverCondition(progress);
  });
}
