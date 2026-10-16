import type { WorldChallenge } from '../types';
import { createInitialRepoState, createFile } from '../simulator/GitSimulator';
import type { RepositoryState } from '../types';

function makeState(overrides: Partial<RepositoryState>): RepositoryState {
  return { ...createInitialRepoState(), ...overrides };
}

/** True if `targetId` is the commit itself or one of its ancestors (so a merge that includes it counts too). */
function reaches(state: RepositoryState, fromId: string | null | undefined, targetId: string): boolean {
  const seen = new Set<string>();
  const stack: string[] = fromId ? [fromId] : [];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (id === targetId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(state.commits[id]?.parentIds ?? []));
  }
  return false;
}

/** The remote branch has been pushed and points at your own branch's latest commit (whatever you committed first). */
function pushedBranch(state: RepositoryState, remote: string, branch: string): boolean {
  const remoteHead = state.remotes[remote]?.branches[branch];
  return !!remoteHead && remoteHead === state.branches[branch]?.headCommitId;
}

// ===== WORLD 4: Conflict Canyon =====
export const world4Challenges: WorldChallenge[] = [
  {
    id: 'w4_c1_recognize',
    title: 'Spot the Conflict',
    description: 'Two branches have changed the same file in different ways. Attempt a merge to see the conflict appear, then check git status.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: { name: 'main', headCommitId: 'm1a2b3c', isRemote: false },
        'feature-ui': { name: 'feature-ui', headCommitId: 'f9e8d7c', isRemote: false },
      },
      commits: {
        m1a2b3c: { id: 'm1a2b3c', message: 'Update title to "Home"', parentIds: ['base44'], branch: 'main', files: [createFile('index.html', '<h1>Home</h1>', true)], timestamp: Date.now() - 86400000 },
        f9e8d7c: { id: 'f9e8d7c', message: 'Update title to "Welcome"', parentIds: ['base44'], branch: 'feature-ui', files: [createFile('index.html', '<h1>Welcome</h1>', true)], timestamp: Date.now() - 43200000 },
        base44: { id: 'base44', message: 'Initial', parentIds: [], branch: 'main', files: [createFile('index.html', '<h1>Title</h1>', true)], timestamp: Date.now() - 172800000 },
      },
      files: [createFile('index.html', '<h1>Home</h1>', true)],
    }),
    objectives: [
      {
        id: 'w4_c1_obj1',
        description: 'Attempt to merge feature-ui into main',
        hint: 'git merge feature-ui',
        concept: 'When two branches change the same lines, git merge cannot auto-resolve and reports a conflict.',
        check: (state) => state.mergeInProgress === true || state.conflicts.length > 0,
        xpReward: 15,
      },
      {
        id: 'w4_c1_obj2',
        description: 'Check the status to see conflicting files',
        hint: 'git status',
        concept: 'git status shows "Unmerged paths" when there are conflicts.',
        check: (_state, result) => result.output.some((l) => l.includes('Unmerged') || l.includes('conflict') || l.includes('both modified')),
        xpReward: 10,
      },
    ],
    concept: 'A merge conflict happens when two branches modify the same lines differently. Git pauses and asks you to resolve it.',
  },
  {
    id: 'w4_c2_resolve',
    title: 'Resolve the Conflict',
    description: 'A conflict has been detected in index.html. Resolve it by choosing the correct content, then stage the file and commit.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      mergeInProgress: true,
      mergeTarget: 'feature-ui',
      branches: {
        main: { name: 'main', headCommitId: 'm1a2b3c', isRemote: false },
        'feature-ui': { name: 'feature-ui', headCommitId: 'f9e8d7c', isRemote: false },
      },
      commits: {
        m1a2b3c: { id: 'm1a2b3c', message: 'Update title', parentIds: ['base44'], branch: 'main', files: [createFile('index.html', '<h1>Home</h1>', true)], timestamp: Date.now() - 86400000 },
        f9e8d7c: { id: 'f9e8d7c', message: 'Update title', parentIds: ['base44'], branch: 'feature-ui', files: [createFile('index.html', '<h1>Welcome</h1>', true)], timestamp: Date.now() - 43200000 },
        base44: { id: 'base44', message: 'Initial', parentIds: [], branch: 'main', files: [createFile('index.html', '<h1>Title</h1>', true)], timestamp: Date.now() - 172800000 },
      },
      conflicts: [{ file: 'index.html', ours: '<h1>Home</h1>', theirs: '<h1>Welcome</h1>', resolved: false }],
      files: [{ name: 'index.html', content: '<<<<<<< HEAD\n<h1>Home</h1>\n=======\n<h1>Welcome</h1>\n>>>>>>> feature-ui', tracked: true, staged: false, ignored: false }],
    }),
    objectives: [
      {
        id: 'w4_c2_obj1',
        description: 'Resolve the conflict by editing the file content. Use: git resolve index.html "ours"',
        hint: 'In this simulation, use: git resolve index.html ours  (or theirs)',
        concept: 'To resolve a conflict, you edit the file to remove conflict markers and keep the desired content.',
        check: (state) => state.conflicts.every((c) => c.resolved) && !state.files.find((f) => f.name === 'index.html')?.content.includes('<<<<<<<'),
        xpReward: 20,
      },
      {
        id: 'w4_c2_obj2',
        description: 'Stage the resolved file and commit to complete the merge',
        hint: 'git add index.html && git commit -m "Resolve conflict"',
        concept: 'After resolving, stage the file and commit to finalize the merge.',
        check: (state) => state.mergeInProgress === false && state.branches['main']?.headCommitId !== 'm1a2b3c',
        xpReward: 25,
      },
    ],
    concept: 'Resolving a conflict means choosing the final content, removing conflict markers, staging, and committing.',
  },
  {
    id: 'w4_boss',
    title: 'Boss: The Conflict Dragon',
    description: 'The Conflict Dragon breathes conflict markers across your files. Merge the conflicting branch, resolve the conflict, and commit to defeat it!',
    isBoss: true,
    bossName: 'The Conflict Dragon',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: { name: 'main', headCommitId: 'd1e2f3g', isRemote: false },
        'dragon-feature': { name: 'dragon-feature', headCommitId: 'g4f5e6d', isRemote: false },
      },
      commits: {
        d1e2f3g: { id: 'd1e2f3g', message: 'Main: configure sword', parentIds: ['base77'], branch: 'main', files: [{ name: 'weapon.js', content: 'const sword = "iron";', tracked: true, staged: false, ignored: false }], timestamp: Date.now() - 86400000 },
        g4f5e6d: { id: 'g4f5e6d', message: 'Feature: configure sword', parentIds: ['base77'], branch: 'dragon-feature', files: [{ name: 'weapon.js', content: 'const sword = "steel";', tracked: true, staged: false, ignored: false }], timestamp: Date.now() - 43200000 },
        base77: { id: 'base77', message: 'Base', parentIds: [], branch: 'main', files: [createFile('weapon.js', 'const sword = "wood";', true)], timestamp: Date.now() - 172800000 },
      },
      files: [{ name: 'weapon.js', content: 'const sword = "iron";', tracked: true, staged: false, ignored: false }],
    }),
    objectives: [
      {
        id: 'w4_boss_obj1',
        description: 'Merge the dragon-feature branch (this will create a conflict)',
        hint: 'git merge dragon-feature',
        concept: 'The dragon creates conflicts. Merge to confront them.',
        check: (state) => state.mergeInProgress === true,
        xpReward: 10,
      },
      {
        id: 'w4_boss_obj2',
        description: 'Resolve the conflict in weapon.js',
        hint: 'git resolve weapon.js ours',
        concept: 'Choose the resolution and remove conflict markers.',
        check: (state) => state.conflicts.every((c) => c.resolved),
        xpReward: 20,
      },
      {
        id: 'w4_boss_obj3',
        description: 'Stage and commit to complete the merge',
        hint: 'git add weapon.js && git commit -m "Defeat the dragon"',
        concept: 'The commit seals the dragon. The merge is complete.',
        check: (state) => state.mergeInProgress === false && state.branches['main']?.headCommitId !== 'd1e2f3g',
        xpReward: 30,
      },
    ],
    concept: 'The Conflict Dragon tests your ability to handle merge conflicts: merge, resolve, stage, commit.',
  },
];

// ===== WORLD 5: The Remote Kingdom =====
export const world5Challenges: WorldChallenge[] = [
  {
    id: 'w5_c1_clone',
    title: 'Enter the Kingdom',
    description: 'The Remote Kingdom can only be entered by cloning its repository. Use git clone to get a local copy.',
    setupState: makeState({ initialized: false }),
    objectives: [
      {
        id: 'w5_c1_obj1',
        description: 'Clone the remote repository',
        hint: 'git clone https://github.com/kingdom/royal-repo.git',
        concept: 'git clone downloads a full copy of a remote repository, including all its history and branches.',
        check: (state) => state.initialized && Object.keys(state.remotes).includes('origin'),
        xpReward: 15,
      },
    ],
    concept: 'Cloning is how you get a local copy of a remote repository. It also sets up "origin" as the default remote.',
  },
  {
    id: 'w5_c2_fetch',
    title: 'Listen for Distant Changes',
    description: 'Someone in the kingdom has made changes. Use git fetch to download them WITHOUT merging.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'r1a2b3c', isRemote: false } },
      commits: {
        r1a2b3c: { id: 'r1a2b3c', message: 'Local commit', parentIds: [], branch: 'main', files: [createFile('README.md', '# Royal Repo', true)], timestamp: Date.now() - 86400000 },
        'r-new1': { id: 'r-new1', message: 'Remote update: new laws', parentIds: [], branch: 'main', files: [createFile('README.md', '# Royal Repo Updated', true), createFile('laws.txt', 'New laws', true)], timestamp: Date.now() - 43200000 },
      },
      remotes: {
        origin: { name: 'origin', url: 'https://github.com/kingdom/royal-repo.git', branches: { main: 'r-new1' } },
      },
      files: [createFile('README.md', '# Royal Repo', true)],
    }),
    objectives: [
      {
        id: 'w5_c2_obj1',
        description: 'Fetch changes from origin',
        hint: 'git fetch origin',
        concept: 'git fetch downloads remote changes but does NOT merge them. Your working directory stays the same.',
        check: (state) => Object.keys(state.branches).some((b) => b.startsWith('origin/')),
        xpReward: 15,
      },
    ],
    concept: 'fetch vs pull: fetch only downloads. pull downloads AND merges. Use fetch when you want to see what changed before integrating.',
  },
  {
    id: 'w5_c3_pull',
    title: 'Accept the Changes',
    description: 'Now pull the changes from origin to integrate them into your local branch.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'r1a2b3c', isRemote: false } },
      commits: {
        r1a2b3c: { id: 'r1a2b3c', message: 'Local commit', parentIds: [], branch: 'main', files: [createFile('README.md', '# Royal Repo', true)], timestamp: Date.now() - 86400000 },
        'r-new2': { id: 'r-new2', message: 'Remote update', parentIds: [], branch: 'main', files: [createFile('README.md', '# Royal Repo Updated', true)], timestamp: Date.now() - 43200000 },
      },
      remotes: {
        origin: { name: 'origin', url: 'https://github.com/kingdom/royal-repo.git', branches: { main: 'r-new2' } },
      },
      files: [createFile('README.md', '# Royal Repo', true)],
    }),
    objectives: [
      {
        id: 'w5_c3_obj1',
        description: 'Pull changes from origin',
        hint: 'git pull origin main  (or just git pull)',
        concept: 'git pull = git fetch + git merge. It downloads and integrates remote changes in one step.',
        check: (state) => reaches(state, state.branches['main']?.headCommitId, 'r-new2'),
        xpReward: 20,
      },
    ],
    concept: 'pull is fetch + merge. Use it when you are ready to integrate remote changes immediately.',
  },
  {
    id: 'w5_c4_push',
    title: 'Send Your Work',
    description: 'You have made a local commit. Push it to the remote so others can see it.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'p1l2o3c', isRemote: false } },
      commits: {
        p1l2o3c: { id: 'p1l2o3c', message: 'Local: add new feature', parentIds: [], branch: 'main', files: [createFile('feature.js', 'console.log("new")', true)], timestamp: Date.now() - 3600000 },
      },
      remotes: {
        origin: { name: 'origin', url: 'https://github.com/kingdom/royal-repo.git', branches: { main: null } },
      },
      files: [createFile('feature.js', 'console.log("new")', true)],
    }),
    objectives: [
      {
        id: 'w5_c4_obj1',
        description: 'Push your commit to origin',
        hint: 'git push origin main  (or just git push)',
        concept: 'git push uploads your local commits to the remote repository.',
        check: (state) => pushedBranch(state, 'origin', 'main'),
        xpReward: 20,
      },
    ],
    concept: 'push sends your work to the remote. It is how you share your changes with the team.',
  },
  {
    id: 'w5_boss',
    title: 'Boss: The Gatekeeper',
    description: 'The Gatekeeper blocks your push because the remote has changes you do not have. Pull first, then push to break through!',
    isBoss: true,
    bossName: 'The Gatekeeper',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'local99', isRemote: false } },
      commits: {
        local99: { id: 'local99', message: 'Local: defeat gatekeeper', parentIds: [], branch: 'main', files: [createFile('sword.js', 'const power = 100;', true)], timestamp: Date.now() - 3600000 },
        remote99: { id: 'remote99', message: 'Remote: kingdom update', parentIds: [], branch: 'main', files: [createFile('shield.js', 'const defense = 50;', true)], timestamp: Date.now() - 7200000 },
      },
      remotes: {
        origin: { name: 'origin', url: 'https://github.com/kingdom/gate.git', branches: { main: 'remote99' } },
      },
      files: [createFile('sword.js', 'const power = 100;', true)],
    }),
    objectives: [
      {
        id: 'w5_boss_obj1',
        description: 'Attempt to push (it will be rejected)',
        hint: 'git push origin main',
        concept: 'The Gatekeeper rejects pushes when the remote has commits you do not have.',
        check: (state) => state.rejectedPush === true,
        xpReward: 10,
      },
      {
        id: 'w5_boss_obj2',
        description: 'Pull the remote changes first',
        hint: 'git pull origin main',
        concept: 'Pull integrates the remote changes so your history is up to date.',
        check: (state) => state.rejectedPush === false || state.branches['main']?.headCommitId !== 'local99',
        xpReward: 15,
      },
      {
        id: 'w5_boss_obj3',
        description: 'Push again now that you are up to date',
        hint: 'git push origin main',
        concept: 'After pulling, the push succeeds because your history includes the remote changes.',
        check: (state) => state.remotes['origin']?.branches['main'] !== 'remote99' && state.remotes['origin']?.branches['main'] !== null,
        xpReward: 25,
      },
    ],
    concept: 'A rejected push means the remote has changes you do not. Always pull before pushing to resolve this.',
  },
];

// ===== WORLD 6: The Collaboration Guild =====
export const world6Challenges: WorldChallenge[] = [
  {
    id: 'w6_c1_issue',
    title: 'Report a Problem',
    description: 'The guild tracks problems as issues. Create a simulated issue to report a bug.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'g6c1', isRemote: false } },
      commits: { g6c1: { id: 'g6c1', message: 'Base', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("app")', true)], timestamp: Date.now() - 86400000 } },
      files: [createFile('app.js', 'console.log("app")', true)],
      remotes: { origin: { name: 'origin', url: 'https://github.com/guild/project.git', branches: { main: 'g6c1' } } },
    }),
    objectives: [
      {
        id: 'w6_c1_obj1',
        description: 'Create a simulated issue with title "Fix login bug"',
        hint: 'git issue create "Fix login bug"',
        concept: 'Issues on GitHub track bugs and feature requests. In this game, we simulate them.',
        check: (state) => state.issues.some((i) => i.title.includes('login') || i.title.includes('Login')),
        xpReward: 15,
      },
    ],
    concept: 'Issues are how teams track bugs and tasks on GitHub. They are a GitHub feature, not a Git command.',
  },
  {
    id: 'w6_c2_branch_pr',
    title: 'Prepare a Feature Branch',
    description: 'Create a feature branch for your fix, make a commit, and submit a simulated pull request.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'g6c2', isRemote: false } },
      commits: { g6c2: { id: 'g6c2', message: 'Base', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("app")', true)], timestamp: Date.now() - 86400000 } },
      files: [createFile('app.js', 'console.log("app")', true)],
      remotes: { origin: { name: 'origin', url: 'https://github.com/guild/project.git', branches: { main: 'g6c2' } } },
    }),
    objectives: [
      {
        id: 'w6_c2_obj1',
        description: 'Create and switch to a branch called "fix/login-bug"',
        hint: 'git switch -c fix/login-bug',
        concept: 'Always work on a feature branch, not directly on main.',
        check: (state) => state.currentBranch === 'fix/login-bug',
        xpReward: 10,
      },
      {
        id: 'w6_c2_obj2',
        description: 'Make a commit on the feature branch',
        hint: 'git add . && git commit -m "Fix login bug"',
        concept: 'Commit your fix on the feature branch.',
        check: (state) => state.branches['fix/login-bug']?.headCommitId !== 'g6c2' && state.branches['fix/login-bug']?.headCommitId !== null,
        xpReward: 15,
      },
      {
        id: 'w6_c2_obj3',
        description: 'Submit a simulated pull request',
        hint: 'git pr create "Fix login bug" fix/login-bug main',
        concept: 'A pull request asks team members to review your branch before merging it into main.',
        check: (state) => state.pullRequests.some((pr) => pr.sourceBranch === 'fix/login-bug'),
        xpReward: 20,
      },
    ],
    concept: 'The collaboration flow: create a branch, commit changes, open a pull request for review.',
  },
  {
    id: 'w6_c3_review',
    title: 'Review and Merge',
    description: 'Your pull request has been reviewed with changes requested. Address the feedback, then merge the PR.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'fix/login-bug',
      branches: {
        main: { name: 'main', headCommitId: 'g6c3', isRemote: false },
        'fix/login-bug': { name: 'fix/login-bug', headCommitId: 'g6c3b', isRemote: false },
      },
      commits: {
        g6c3: { id: 'g6c3', message: 'Base', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("app")', true)], timestamp: Date.now() - 86400000 },
        g6c3b: { id: 'g6c3b', message: 'Fix login bug', parentIds: ['g6c3'], branch: 'fix/login-bug', files: [createFile('app.js', 'console.log("fixed")', true)], timestamp: Date.now() - 43200000 },
      },
      files: [createFile('app.js', 'console.log("fixed")', true)],
      pullRequests: [{
        id: 1, title: 'Fix login bug', body: 'Fixes the login issue', sourceBranch: 'fix/login-bug', targetBranch: 'main', state: 'open', author: 'player',
        reviews: [{ id: 1, author: 'reviewer1', body: 'Please add a comment to the fix.', status: 'changes_requested' }],
      }],
      remotes: { origin: { name: 'origin', url: 'https://github.com/guild/project.git', branches: { main: 'g6c3' } } },
    }),
    objectives: [
      {
        id: 'w6_c3_obj1',
        description: 'Address review feedback by making a new commit',
        hint: 'git add . && git commit -m "Add comment per review"',
        concept: 'Code review feedback often requires additional commits on your branch.',
        check: (state) => state.branches['fix/login-bug']?.headCommitId !== 'g6c3b',
        xpReward: 15,
      },
      {
        id: 'w6_c3_obj2',
        description: 'Merge the pull request',
        hint: 'git pr merge 1',
        concept: 'After review is satisfied, the PR is merged into the target branch (usually main).',
        check: (state) => state.pullRequests.find((pr) => pr.id === 1)?.state === 'merged',
        xpReward: 20,
      },
    ],
    concept: 'Code review is a key part of collaboration. You address feedback, get approval, then merge.',
  },
  {
    id: 'w6_boss',
    title: 'Boss: The Code Review Council',
    description: 'The Council demands a complete workflow: create an issue, make a branch, commit, open a PR, address review, and merge.',
    isBoss: true,
    bossName: 'The Code Review Council',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'council1', isRemote: false } },
      commits: { council1: { id: 'council1', message: 'Base', parentIds: [], branch: 'main', files: [createFile('guild.js', 'console.log("guild")', true)], timestamp: Date.now() - 86400000 } },
      files: [createFile('guild.js', 'console.log("guild")', true)],
      remotes: { origin: { name: 'origin', url: 'https://github.com/guild/council.git', branches: { main: 'council1' } } },
    }),
    objectives: [
      {
        id: 'w6_boss_obj1',
        description: 'Create an issue for the Council',
        hint: 'git issue create "Council demands tribute"',
        concept: 'Start the workflow with an issue.',
        check: (state) => state.issues.length > 0,
        xpReward: 10,
      },
      {
        id: 'w6_boss_obj2',
        description: 'Create a branch, commit, and open a PR',
        hint: 'git switch -c tribute && git add . && git commit -m "Tribute" && git pr create "Tribute" tribute main',
        concept: 'The full PR preparation flow.',
        check: (state) => state.pullRequests.length > 0 && state.currentBranch === 'tribute',
        xpReward: 15,
      },
      {
        id: 'w6_boss_obj3',
        description: 'Merge the pull request',
        hint: 'git pr merge 1',
        concept: 'The Council approves. Merge the PR to complete the challenge.',
        check: (state) => state.pullRequests.some((pr) => pr.state === 'merged'),
        xpReward: 25,
      },
    ],
    concept: 'The full collaboration workflow: issue, branch, commit, PR, review, merge. This is how teams work together on GitHub.',
  },
];

// ===== WORLD 7: The Time-Reversal Temple =====
export const world7Challenges: WorldChallenge[] = [
  {
    id: 'w7_c1_stash',
    title: 'Shelve Your Work',
    description: 'You are in the middle of changes but need to switch tasks. Use git stash to temporarily save your work.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 't7c1', isRemote: false } },
      commits: { t7c1: { id: 't7c1', message: 'Base', parentIds: [], branch: 'main', files: [createFile('spell.js', 'const spell = "fire";', true)], timestamp: Date.now() - 86400000 } },
      files: [{ name: 'spell.js', content: 'const spell = "ice";', tracked: true, staged: false, ignored: false }],
    }),
    objectives: [
      {
        id: 'w7_c1_obj1',
        description: 'Stash your changes',
        hint: 'git stash',
        concept: 'git stash shelves uncommitted changes so you can work on something else.',
        check: (state) => state.stash.length > 0,
        xpReward: 15,
      },
      {
        id: 'w7_c1_obj2',
        description: 'Pop the stash to restore your changes',
        hint: 'git stash pop',
        concept: 'git stash pop restores the most recent stash and removes it from the list.',
        check: (state) => state.stash.length === 0,
        xpReward: 10,
      },
    ],
    concept: 'stash is a temporary shelf for uncommitted work. Use it when you need to switch contexts without committing.',
  },
  {
    id: 'w7_c2_restore',
    title: 'Undo Working Changes',
    description: 'You made changes to a file but they are wrong. Use git restore to discard them and bring back the last committed version.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 't7c2', isRemote: false } },
      commits: { t7c2: { id: 't7c2', message: 'Add scroll', parentIds: [], branch: 'main', files: [createFile('scroll.js', 'const text = "original";', true)], timestamp: Date.now() - 86400000 } },
      files: [{ name: 'scroll.js', content: 'const text = "corrupted";', tracked: true, staged: false, ignored: false }],
    }),
    objectives: [
      {
        id: 'w7_c2_obj1',
        description: 'Restore scroll.js to its last committed state',
        hint: 'git restore scroll.js',
        concept: 'git restore discards working directory changes, bringing the file back to its committed state.',
        check: (state) => {
          const f = state.files.find((f) => f.name === 'scroll.js');
          return f?.content === 'const text = "original";';
        },
        xpReward: 15,
      },
    ],
    concept: 'restore vs revert: restore discards uncommitted changes. revert creates a new commit that undoes a previous commit.',
  },
  {
    id: 'w7_c3_revert',
    title: 'Undo a Commit Safely',
    description: 'A commit was a mistake. Use git revert to create a new commit that undoes it, preserving history.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'badc01', isRemote: false } },
      commits: {
        badc01: { id: 'badc01', message: 'Bad: delete important file', parentIds: ['goodc01'], branch: 'main', files: [], timestamp: Date.now() - 3600000 },
        goodc01: { id: 'goodc01', message: 'Good: add important file', parentIds: [], branch: 'main', files: [createFile('important.js', 'console.log("important")', true)], timestamp: Date.now() - 86400000 },
      },
      files: [],
    }),
    objectives: [
      {
        id: 'w7_c3_obj1',
        description: 'Revert the bad commit (badc01)',
        hint: 'git revert badc01',
        concept: 'git revert creates a NEW commit that undoes a previous commit. It is safe for shared branches.',
        check: (state) => state.branches['main']?.headCommitId !== 'badc01' && state.branches['main']?.headCommitId !== null,
        xpReward: 20,
      },
    ],
    concept: 'revert is the safe way to undo a commit. It adds a new commit rather than rewriting history.',
  },
  {
    id: 'w7_c4_reset',
    title: 'Rewind Time',
    description: 'Use git reset to move the branch pointer back to an earlier commit. Be careful — this rewrites history!',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'head99', isRemote: false } },
      commits: {
        head99: { id: 'head99', message: 'Latest commit', parentIds: ['mid99'], branch: 'main', files: [createFile('data.js', 'v3', true)], timestamp: Date.now() - 3600000 },
        mid99: { id: 'mid99', message: 'Middle commit', parentIds: ['base99'], branch: 'main', files: [createFile('data.js', 'v2', true)], timestamp: Date.now() - 7200000 },
        base99: { id: 'base99', message: 'Base commit', parentIds: [], branch: 'main', files: [createFile('data.js', 'v1', true)], timestamp: Date.now() - 86400000 },
      },
      files: [createFile('data.js', 'v3', true)],
      reflog: [{ action: 'commit: Latest', commitId: 'head99', timestamp: Date.now() - 3600000 }],
    }),
    objectives: [
      {
        id: 'w7_c4_obj1',
        description: 'Reset to the base commit (base99)',
        hint: 'git reset --hard base99',
        concept: 'git reset --hard moves the branch pointer and discards all changes. It is destructive!',
        check: (state) => state.branches['main']?.headCommitId === 'base99',
        xpReward: 20,
      },
    ],
    concept: 'reset vs revert: reset rewrites history by moving the branch pointer. revert adds a new undo commit. Use revert on shared branches.',
  },
  {
    id: 'w7_c5_cherry_pick',
    title: 'Pluck a Commit',
    description: 'A useful commit exists on another branch. Use git cherry-pick to apply just that commit to your current branch.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: { name: 'main', headCommitId: 'cpmain', isRemote: false },
        'feature-x': { name: 'feature-x', headCommitId: 'cpfeat', isRemote: false },
      },
      commits: {
        cpmain: { id: 'cpmain', message: 'Main commit', parentIds: [], branch: 'main', files: [createFile('main.js', 'main', true)], timestamp: Date.now() - 86400000 },
        cpfeat: { id: 'cpfeat', message: 'Add magic function', parentIds: ['cpmain'], branch: 'feature-x', files: [createFile('main.js', 'main', true), createFile('magic.js', 'function magic() {}', true)], timestamp: Date.now() - 43200000 },
      },
      files: [createFile('main.js', 'main', true)],
    }),
    objectives: [
      {
        id: 'w7_c5_obj1',
        description: 'Cherry-pick the commit cpfeat onto main',
        hint: 'git cherry-pick cpfeat',
        concept: 'git cherry-pick applies a single commit from another branch without merging the whole branch.',
        check: (state) => state.branches['main']?.headCommitId !== 'cpmain',
        xpReward: 20,
      },
    ],
    concept: 'cherry-pick is useful when you want one specific commit from another branch without the rest of its history.',
  },
  {
    id: 'w7_c6_rebase',
    title: 'Reshape History',
    description: 'Your branch has fallen behind main. Use git rebase to replay your commits on top of main for a clean linear history.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'feature-rebase',
      branches: {
        main: { name: 'main', headCommitId: 'rbmain2', isRemote: false },
        'feature-rebase': { name: 'feature-rebase', headCommitId: 'rbfeat1', isRemote: false },
      },
      commits: {
        rbbase: { id: 'rbbase', message: 'Base', parentIds: [], branch: 'main', files: [createFile('core.js', 'v1', true)], timestamp: Date.now() - 172800000 },
        rbmain2: { id: 'rbmain2', message: 'Main: update core', parentIds: ['rbbase'], branch: 'main', files: [createFile('core.js', 'v2', true)], timestamp: Date.now() - 86400000 },
        rbfeat1: { id: 'rbfeat1', message: 'Feature: add module', parentIds: ['rbbase'], branch: 'feature-rebase', files: [createFile('core.js', 'v1', true), createFile('module.js', 'new module', true)], timestamp: Date.now() - 43200000 },
      },
      files: [createFile('core.js', 'v1', true), createFile('module.js', 'new module', true)],
    }),
    objectives: [
      {
        id: 'w7_c6_obj1',
        description: 'Rebase feature-rebase onto main',
        hint: 'git rebase main',
        concept: 'git rebase moves your commits on top of another branch, creating a linear history without merge commits.',
        check: (state) => state.branches['feature-rebase']?.headCommitId !== 'rbfeat1',
        xpReward: 25,
      },
    ],
    concept: 'rebase rewrites your commit history to be linear. It changes commit hashes, so never rebase shared branches.',
  },
  {
    id: 'w7_c7_reflog',
    title: 'Recover Lost Time',
    description: 'A commit was lost after a reset. Use git reflog to find it, then recover it with git reset or git cherry-pick.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'base55', isRemote: false } },
      commits: {
        base55: { id: 'base55', message: 'Base', parentIds: [], branch: 'main', files: [createFile('app.js', 'v1', true)], timestamp: Date.now() - 172800000 },
        lost55: { id: 'lost55', message: 'Lost commit with important work', parentIds: ['base55'], branch: 'main', files: [createFile('app.js', 'v2-important', true)], timestamp: Date.now() - 86400000 },
      },
      files: [createFile('app.js', 'v1', true)],
      reflog: [
        { action: 'reset --hard to base55', commitId: 'base55', timestamp: Date.now() - 3600000 },
        { action: 'commit: Lost commit with important work', commitId: 'lost55', timestamp: Date.now() - 86400000 },
      ],
    }),
    objectives: [
      {
        id: 'w7_c7_obj1',
        description: 'View the reflog to find the lost commit',
        hint: 'git reflog',
        concept: 'git reflog records every change to HEAD, even after resets. It is your safety net.',
        check: (_state, result) => result.output.some((l) => l.includes('reflog') || l.includes('lost55') || result.output.length > 0),
        xpReward: 15,
      },
      {
        id: 'w7_c7_obj2',
        description: 'Recover the lost commit (lost55) using reset or cherry-pick',
        hint: 'git reset --hard lost55  OR  git cherry-pick lost55',
        concept: 'Once you find the commit in the reflog, you can reset or cherry-pick it to bring it back.',
        check: (state) => state.branches['main']?.headCommitId === 'lost55',
        xpReward: 25,
      },
    ],
    concept: 'reflog is Git\'s time machine. Even after destructive operations, commits are recoverable through the reflog.',
  },
  {
    id: 'w7_boss',
    title: 'Boss: The Timeline Keeper',
    description: 'The Timeline Keeper demands mastery of time: stash changes, revert a bad commit, reset to an earlier state, and recover via reflog.',
    isBoss: true,
    bossName: 'The Timeline Keeper',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'tlkeep3', isRemote: false } },
      commits: {
        tlkeep1: { id: 'tlkeep1', message: 'First commit', parentIds: [], branch: 'main', files: [createFile('timeline.js', 'v1', true)], timestamp: Date.now() - 172800000 },
        tlkeep2: { id: 'tlkeep2', message: 'Second commit', parentIds: ['tlkeep1'], branch: 'main', files: [createFile('timeline.js', 'v2', true)], timestamp: Date.now() - 86400000 },
        tlkeep3: { id: 'tlkeep3', message: 'Bad: broke timeline', parentIds: ['tlkeep2'], branch: 'main', files: [createFile('timeline.js', 'broken', true)], timestamp: Date.now() - 3600000 },
      },
      files: [{ name: 'timeline.js', content: 'broken', tracked: true, staged: false, ignored: false }],
      reflog: [
        { action: 'commit: Bad: broke timeline', commitId: 'tlkeep3', timestamp: Date.now() - 3600000 },
        { action: 'commit: Second commit', commitId: 'tlkeep2', timestamp: Date.now() - 86400000 },
        { action: 'commit: First commit', commitId: 'tlkeep1', timestamp: Date.now() - 172800000 },
      ],
    }),
    objectives: [
      {
        id: 'w7_boss_obj1',
        description: 'Revert the bad commit (tlkeep3)',
        hint: 'git revert tlkeep3',
        concept: 'Undo the bad commit safely with revert.',
        check: (state) => state.branches['main']?.headCommitId !== 'tlkeep3',
        xpReward: 15,
      },
      {
        id: 'w7_boss_obj2',
        description: 'Reset back to the second commit (tlkeep2)',
        hint: 'git reset --hard tlkeep2',
        concept: 'Use reset to move the branch pointer back in time.',
        check: (state) => state.branches['main']?.headCommitId === 'tlkeep2',
        xpReward: 15,
      },
      {
        id: 'w7_boss_obj3',
        description: 'Use reflog to find and recover tlkeep3',
        hint: 'git reflog  then  git cherry-pick tlkeep3  or  git reset --hard tlkeep3',
        concept: 'Even after reset, the reflog lets you recover old commits.',
        check: (state) => state.branches['main']?.headCommitId === 'tlkeep3',
        xpReward: 25,
      },
    ],
    concept: 'The Timeline Keeper tests your mastery of time manipulation: revert, reset, and reflog recovery.',
  },
];

// ===== WORLD 8: The Dragon's Citadel =====
export const world8Challenges: WorldChallenge[] = [
  {
    id: 'w8_c1_clone_branch',
    title: 'Enter the Citadel',
    description: 'Clone the citadel repository and create a feature branch for your final quest.',
    setupState: makeState({ initialized: false }),
    objectives: [
      {
        id: 'w8_c1_obj1',
        description: 'Clone the citadel repository',
        hint: 'git clone https://github.com/citadel/final-quest.git',
        concept: 'Clone to get a local copy of the citadel repository.',
        check: (state) => state.initialized && Object.keys(state.remotes).includes('origin'),
        xpReward: 15,
      },
      {
        id: 'w8_c1_obj2',
        description: 'Create and switch to a branch called "final-feature"',
        hint: 'git switch -c final-feature',
        concept: 'Create a feature branch for your changes.',
        check: (state) => state.currentBranch === 'final-feature',
        xpReward: 10,
      },
    ],
    concept: 'The final quest begins with cloning and branching — the foundation of any Git workflow.',
  },
  {
    id: 'w8_c2_commit',
    title: 'Forge Your Weapon',
    description: 'Make changes and commit them on your feature branch.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'final-feature',
      branches: {
        main: { name: 'main', headCommitId: 'w8base', isRemote: false },
        'final-feature': { name: 'final-feature', headCommitId: 'w8base', isRemote: false },
      },
      commits: { w8base: { id: 'w8base', message: 'Base', parentIds: [], branch: 'main', files: [createFile('weapon.js', 'const sword = "basic";', true)], timestamp: Date.now() - 86400000 } },
      files: [{ name: 'weapon.js', content: 'const sword = "legendary";', tracked: true, staged: false, ignored: false }],
      remotes: { origin: { name: 'origin', url: 'https://github.com/citadel/final-quest.git', branches: { main: 'w8base' } } },
    }),
    objectives: [
      {
        id: 'w8_c2_obj1',
        description: 'Stage and commit the modified weapon',
        hint: 'git add weapon.js && git commit -m "Forge legendary weapon"',
        concept: 'Commit your changes on the feature branch.',
        check: (state) => state.branches['final-feature']?.headCommitId !== 'w8base',
        xpReward: 15,
      },
    ],
    concept: 'Every quest requires a commit to record your progress.',
  },
  {
    id: 'w8_c3_conflict',
    title: 'The Dragon\'s Interference',
    description: 'The Merge Dragon has caused a conflict! Merge main into your branch and resolve it.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'final-feature',
      branches: {
        main: { name: 'main', headCommitId: 'w8main2', isRemote: false },
        'final-feature': { name: 'final-feature', headCommitId: 'w8feat1', isRemote: false },
      },
      commits: {
        w8base: { id: 'w8base', message: 'Base', parentIds: [], branch: 'main', files: [createFile('weapon.js', 'const sword = "basic";', true)], timestamp: Date.now() - 172800000 },
        w8main2: { id: 'w8main2', message: 'Main: dragon armor update', parentIds: ['w8base'], branch: 'main', files: [{ name: 'weapon.js', content: 'const sword = "basic"; const armor = "dragon";', tracked: true, staged: false, ignored: false }], timestamp: Date.now() - 86400000 },
        w8feat1: { id: 'w8feat1', message: 'Feature: legendary weapon', parentIds: ['w8base'], branch: 'final-feature', files: [{ name: 'weapon.js', content: 'const sword = "legendary";', tracked: true, staged: false, ignored: false }], timestamp: Date.now() - 43200000 },
      },
      files: [{ name: 'weapon.js', content: 'const sword = "legendary";', tracked: true, staged: false, ignored: false }],
      remotes: { origin: { name: 'origin', url: 'https://github.com/citadel/final-quest.git', branches: { main: 'w8main2' } } },
    }),
    objectives: [
      {
        id: 'w8_c3_obj1',
        description: 'Merge main into your branch (will conflict)',
        hint: 'git merge main',
        concept: 'The dragon creates a conflict. Face it by merging.',
        check: (state) => state.mergeInProgress === true,
        xpReward: 10,
      },
      {
        id: 'w8_c3_obj2',
        description: 'Resolve the conflict in weapon.js',
        hint: 'git resolve weapon.js ours',
        concept: 'Choose your legendary weapon over the dragon\'s changes.',
        check: (state) => state.conflicts.every((c) => c.resolved),
        xpReward: 15,
      },
      {
        id: 'w8_c3_obj3',
        description: 'Stage and commit to complete the merge',
        hint: 'git add weapon.js && git commit -m "Resolve dragon conflict"',
        concept: 'Complete the merge with a commit.',
        check: (state) => state.mergeInProgress === false,
        xpReward: 15,
      },
    ],
    concept: 'Even the final quest has conflicts. Your skills from Conflict Canyon serve you here.',
  },
  {
    id: 'w8_c4_remote',
    title: 'Sync with the Citadel',
    description: 'Pull remote changes and push your completed work to the citadel repository.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'final-feature',
      branches: {
        main: { name: 'main', headCommitId: 'w8rbase', isRemote: false },
        'final-feature': { name: 'final-feature', headCommitId: 'w8rfeat', isRemote: false },
      },
      commits: {
        w8rbase: { id: 'w8rbase', message: 'Base', parentIds: [], branch: 'main', files: [createFile('quest.js', 'base', true)], timestamp: Date.now() - 172800000 },
        w8rfeat: { id: 'w8rfeat', message: 'Final feature complete', parentIds: ['w8rbase'], branch: 'final-feature', files: [createFile('quest.js', 'complete', true)], timestamp: Date.now() - 3600000 },
      },
      files: [createFile('quest.js', 'complete', true)],
      remotes: { origin: { name: 'origin', url: 'https://github.com/citadel/final-quest.git', branches: { main: 'w8rbase', 'final-feature': null } } },
    }),
    objectives: [
      {
        id: 'w8_c4_obj1',
        description: 'Push your feature branch to origin',
        hint: 'git push origin final-feature',
        concept: 'Push your completed work to the remote.',
        check: (state) => pushedBranch(state, 'origin', 'final-feature'),
        xpReward: 15,
      },
    ],
    concept: 'Pushing your feature branch shares it with the team for review.',
  },
  {
    id: 'w8_c5_pr_merge',
    title: 'The Final Review',
    description: 'Create a pull request for your feature, get it reviewed, and merge it into main to complete the quest.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'final-feature',
      branches: {
        main: { name: 'main', headCommitId: 'w8pbase', isRemote: false },
        'final-feature': { name: 'final-feature', headCommitId: 'w8pfeat', isRemote: false },
      },
      commits: {
        w8pbase: { id: 'w8pbase', message: 'Base', parentIds: [], branch: 'main', files: [createFile('citadel.js', 'base', true)], timestamp: Date.now() - 172800000 },
        w8pfeat: { id: 'w8pfeat', message: 'Complete the final quest', parentIds: ['w8pbase'], branch: 'final-feature', files: [createFile('citadel.js', 'complete', true)], timestamp: Date.now() - 3600000 },
      },
      files: [createFile('citadel.js', 'complete', true)],
      remotes: { origin: { name: 'origin', url: 'https://github.com/citadel/final-quest.git', branches: { main: 'w8pbase' } } },
    }),
    objectives: [
      {
        id: 'w8_c5_obj1',
        description: 'Create a pull request',
        hint: 'git pr create "Complete the final quest" final-feature main',
        concept: 'Submit your work for review.',
        check: (state) => state.pullRequests.length > 0,
        xpReward: 10,
      },
      {
        id: 'w8_c5_obj2',
        description: 'Merge the pull request into main',
        hint: 'git pr merge 1',
        concept: 'Merge the approved PR to complete the quest.',
        check: (state) => state.pullRequests.some((pr) => pr.state === 'merged'),
        xpReward: 15,
      },
    ],
    concept: 'The final step of any feature: review and merge into main.',
  },
  {
    id: 'w8_boss',
    title: 'Final Boss: The Merge Dragon',
    description: 'The Merge Dragon demands you demonstrate ALL your skills: clone, branch, commit, resolve conflict, push, create PR, and merge. Defeat it to become a Git Legend!',
    isBoss: true,
    bossName: 'The Merge Dragon',
    setupState: makeState({ initialized: false }),
    objectives: [
      {
        id: 'w8_boss_obj1',
        description: 'Clone the dragon\'s repository',
        hint: 'git clone https://github.com/dragon/citadel.git',
        concept: 'Begin by cloning the repository.',
        check: (state) => state.initialized && Object.keys(state.remotes).includes('origin'),
        xpReward: 10,
      },
      {
        id: 'w8_boss_obj2',
        description: 'Create a branch called "slay-dragon" and switch to it',
        hint: 'git switch -c slay-dragon',
        concept: 'Create your battle branch.',
        check: (state) => state.currentBranch === 'slay-dragon',
        xpReward: 10,
      },
      {
        id: 'w8_boss_obj3',
        description: 'Stage all files and commit',
        hint: 'git add . && git commit -m "Prepare to slay the dragon"',
        concept: 'Commit your battle preparations.',
        check: (state) => state.branches['slay-dragon']?.headCommitId !== null && state.branches['slay-dragon']?.headCommitId !== undefined,
        xpReward: 15,
      },
      {
        id: 'w8_boss_obj4',
        description: 'Push your branch to origin',
        hint: 'git push origin slay-dragon',
        concept: 'Share your work with the kingdom.',
        check: (state) => state.remotes['origin']?.branches['slay-dragon'] !== undefined && state.remotes['origin']?.branches['slay-dragon'] !== null,
        xpReward: 15,
      },
      {
        id: 'w8_boss_obj5',
        description: 'Create and merge a pull request',
        hint: 'git pr create "Slay the dragon" slay-dragon main && git pr merge 1',
        concept: 'The final blow: review and merge your work into main.',
        check: (state) => state.pullRequests.some((pr) => pr.state === 'merged'),
        xpReward: 30,
      },
    ],
    concept: 'The Merge Dragon is defeated by demonstrating the complete Git workflow: clone, branch, commit, push, PR, merge. You are now a Git Legend!',
  },
];

// ===== SECRET MISSION CHALLENGES =====
export const secretMissions: WorldChallenge[] = [
  {
    id: 'sm_ghost_commit',
    title: 'Secret Mission: Ghost Commit',
    description: 'A commit was lost after a git reset. Use git reflog to find it and recover it with git reset --hard <commit-id>.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'ghost-base', isRemote: false } },
      commits: {
        'ghost-base': { id: 'ghost-base', message: 'Base', parentIds: [], branch: 'main', files: [createFile('ghost.js', 'base', true)], timestamp: Date.now() - 172800000 },
        'ghost-lost': { id: 'ghost-lost', message: 'Ghost: important lost work', parentIds: ['ghost-base'], branch: 'main', files: [createFile('ghost.js', 'important', true)], timestamp: Date.now() - 86400000 },
      },
      files: [createFile('ghost.js', 'base', true)],
      reflog: [
        { action: 'reset --hard to ghost-base', commitId: 'ghost-base', timestamp: Date.now() - 3600000 },
        { action: 'commit: Ghost: important lost work', commitId: 'ghost-lost', timestamp: Date.now() - 86400000 },
      ],
    }),
    objectives: [
      {
        id: 'sm_ghost_obj1',
        description: 'Use git reflog to find the lost commit',
        hint: 'git reflog',
        concept: 'The reflog records every HEAD movement, even after resets.',
        check: (_state, result) => result.output.some((l) => l.includes('ghost-lost') || l.includes('reset')),
        xpReward: 20,
      },
      {
        id: 'sm_ghost_obj2',
        description: 'Recover the lost commit (ghost-lost)',
        hint: 'git reset --hard ghost-lost  OR  git cherry-pick ghost-lost',
        concept: 'Once found in the reflog, recover the commit with reset or cherry-pick.',
        check: (state) => state.branches['main']?.headCommitId === 'ghost-lost',
        xpReward: 30,
      },
    ],
    concept: 'Even "lost" commits are recoverable through the reflog. This is Git\'s ultimate safety net.',
  },
  {
    id: 'sm_silent_guardian',
    title: 'Secret Mission: Silent Guardian',
    description: 'Sensitive files are cluttering the repository. Configure .gitignore to prevent config files, log files, and environment files from being tracked.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'sg-base', isRemote: false } },
      commits: { 'sg-base': { id: 'sg-base', message: 'Base', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("app")', true)], timestamp: Date.now() - 86400000 } },
      files: [
        createFile('app.js', 'console.log("app")', true),
        createFile('.env', 'SECRET=12345', false),
        createFile('config.local.json', '{"local": true}', false),
        createFile('debug.log', 'debug info', false),
        createFile('node_modules/', '', false),
      ],
    }),
    objectives: [
      {
        id: 'sm_sg_obj1',
        description: 'Ignore .env files',
        hint: 'git ignore .env',
        concept: '.env files contain secrets and should never be tracked.',
        check: (state) => state.gitignore.includes('.env'),
        xpReward: 15,
      },
      {
        id: 'sm_sg_obj2',
        description: 'Ignore all .log files',
        hint: 'git ignore *.log',
        concept: 'Log files are runtime artifacts that should not be in version control.',
        check: (state) => state.gitignore.some((p) => p.includes('*.log')),
        xpReward: 15,
      },
      {
        id: 'sm_sg_obj3',
        description: 'Ignore config.local.json',
        hint: 'git ignore config.local.json',
        concept: 'Local configuration files should be ignored to avoid overwriting team settings.',
        check: (state) => state.gitignore.includes('config.local.json'),
        xpReward: 10,
      },
    ],
    concept: 'A well-configured .gitignore protects sensitive files and keeps the repository clean.',
  },
  {
    id: 'sm_gate_crasher',
    title: 'Secret Mission: Gate Crasher',
    description: 'Your push was rejected because the remote has changes. Pull the remote changes, then push again to crash through the gate.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'gc-local', isRemote: false } },
      commits: {
        'gc-local': { id: 'gc-local', message: 'Local: gate crash attempt', parentIds: [], branch: 'main', files: [createFile('crash.js', 'crash', true)], timestamp: Date.now() - 3600000 },
        'gc-remote': { id: 'gc-remote', message: 'Remote: gate update', parentIds: [], branch: 'main', files: [createFile('gate.js', 'gate', true)], timestamp: Date.now() - 7200000 },
      },
      files: [createFile('crash.js', 'crash', true)],
      remotes: { origin: { name: 'origin', url: 'https://github.com/gate/keeper.git', branches: { main: 'gc-remote' } } },
      rejectedPush: false,
    }),
    objectives: [
      {
        id: 'sm_gc_obj1',
        description: 'Attempt to push (will be rejected)',
        hint: 'git push origin main',
        concept: 'The gate rejects pushes when the remote has diverged.',
        check: (state) => state.rejectedPush === true,
        xpReward: 10,
      },
      {
        id: 'sm_gc_obj2',
        description: 'Pull the remote changes',
        hint: 'git pull origin main',
        concept: 'Pull integrates remote changes so you can push again.',
        check: (state) => state.rejectedPush === false || state.branches['main']?.headCommitId !== 'gc-local',
        xpReward: 15,
      },
      {
        id: 'sm_gc_obj3',
        description: 'Push again to crash through the gate',
        hint: 'git push origin main',
        concept: 'After pulling, the push succeeds.',
        check: (state) => state.remotes['origin']?.branches['main'] !== 'gc-remote' && state.remotes['origin']?.branches['main'] !== null,
        xpReward: 25,
      },
    ],
    concept: 'Rejected pushes are resolved by pulling first. This is one of the most common Git workflows in team collaboration.',
  },
  {
    id: 'sm_clean_timeline',
    title: 'Secret Mission: Clean Timeline',
    description: 'Your branch has diverged from main with messy history. Use git rebase to create a clean linear timeline.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'feature-clean',
      branches: {
        main: { name: 'main', headCommitId: 'ct-main2', isRemote: false },
        'feature-clean': { name: 'feature-clean', headCommitId: 'ct-feat2', isRemote: false },
      },
      commits: {
        'ct-base': { id: 'ct-base', message: 'Base', parentIds: [], branch: 'main', files: [createFile('time.js', 'v1', true)], timestamp: Date.now() - 172800000 },
        'ct-main2': { id: 'ct-main2', message: 'Main: update', parentIds: ['ct-base'], branch: 'main', files: [createFile('time.js', 'v2', true)], timestamp: Date.now() - 86400000 },
        'ct-feat1': { id: 'ct-feat1', message: 'Feature: step 1', parentIds: ['ct-base'], branch: 'feature-clean', files: [createFile('time.js', 'v1', true), createFile('feat.js', 'step1', true)], timestamp: Date.now() - 43200000 },
        'ct-feat2': { id: 'ct-feat2', message: 'Feature: step 2', parentIds: ['ct-feat1'], branch: 'feature-clean', files: [createFile('time.js', 'v1', true), createFile('feat.js', 'step2', true)], timestamp: Date.now() - 21600000 },
      },
      files: [createFile('time.js', 'v1', true), createFile('feat.js', 'step2', true)],
    }),
    objectives: [
      {
        id: 'sm_ct_obj1',
        description: 'Rebase feature-clean onto main',
        hint: 'git rebase main',
        concept: 'Rebase replays your commits on top of main, creating a clean linear history.',
        check: (state) => state.branches['feature-clean']?.headCommitId !== 'ct-feat2',
        xpReward: 30,
      },
    ],
    concept: 'Rebase creates a clean, linear history by replaying commits. It is ideal for personal feature branches before merging.',
  },
];
