import type { GameWorld, WorldChallenge, RepositoryState, GameProgress } from '../types';
import { createInitialRepoState, createFile } from '../simulator/GitSimulator';
import { world4Challenges, world5Challenges, world6Challenges, world7Challenges, world8Challenges, secretMissions } from './expandedWorlds';

function makeState(overrides: Partial<RepositoryState>): RepositoryState {
  return { ...createInitialRepoState(), ...overrides };
}

// ===== WORLD 1: The Forgotten Repository =====
const world1Challenges: WorldChallenge[] = [
  {
    id: 'w1_c1_init',
    title: 'Awaken the Repository',
    description: 'The ancient repository lies dormant. Initialize it with git init to begin your quest.',
    setupState: makeState({ initialized: false, files: [createFile('README.md', '# My Project', false), createFile('index.html', '<h1>Hello</h1>', false)] }),
    objectives: [
      {
        id: 'w1_c1_obj1',
        description: 'Initialize the repository',
        hint: 'Use git init to create a new repository.',
        concept: 'git init creates a new Git repository in the current directory.',
        check: (state) => state.initialized === true,
        xpReward: 10,
      },
    ],
    concept: 'A repository is Git\'s way of tracking a project. git init starts that tracking.',
  },
  {
    id: 'w1_c2_status',
    title: 'See the Untracked',
    description: 'The repository is initialized but files are untracked. Check the status to see what needs attention.',
    setupState: makeState({
      initialized: true,
      branches: { main: { name: 'main', headCommitId: null, isRemote: false } },
      files: [createFile('README.md', '# My Project', false), createFile('index.html', '<h1>Hello</h1>', false)],
    }),
    objectives: [
      {
        id: 'w1_c2_obj1',
        description: 'Run git status to see the repository state',
        hint: 'Type git status',
        concept: 'git status shows which files are tracked, staged, and untracked.',
        check: (_state, result) => result.output.some((l) => l.includes('On branch') || l.includes('Untracked')),
        xpReward: 10,
      },
    ],
    concept: 'git status is your compass. It tells you what state your repository is in at any moment.',
  },
  {
    id: 'w1_c3_add',
    title: 'Gather the Artifacts',
    description: 'Stage the files so they are ready to be committed. Use git add to track them.',
    setupState: makeState({
      initialized: true,
      branches: { main: { name: 'main', headCommitId: null, isRemote: false } },
      files: [createFile('README.md', '# My Project', false), createFile('index.html', '<h1>Hello</h1>', false)],
    }),
    objectives: [
      {
        id: 'w1_c3_obj1',
        description: 'Stage all files with git add',
        hint: 'Use git add . to stage all files, or git add <filename> for individual files.',
        concept: 'git add moves files from untracked/modified into the staging area.',
        check: (state) => state.files.filter((f) => f.staged).length >= 2,
        xpReward: 15,
      },
    ],
    concept: 'Staging is like packing a box before shipping. You choose what goes in the commit.',
  },
  {
    id: 'w1_c4_commit',
    title: 'The First Commit',
    description: 'Now that files are staged, make your first commit to save this snapshot in history.',
    setupState: makeState({
      initialized: true,
      branches: { main: { name: 'main', headCommitId: null, isRemote: false } },
      files: [
        { name: 'README.md', content: '# My Project', tracked: true, staged: true, ignored: false },
        { name: 'index.html', content: '<h1>Hello</h1>', tracked: true, staged: true, ignored: false },
      ],
    }),
    objectives: [
      {
        id: 'w1_c4_obj1',
        description: 'Commit the staged files with a message',
        hint: 'Use git commit -m "Initial commit" to create your first commit.',
        concept: 'git commit saves a snapshot of staged files with a message describing the change.',
        check: (state) => state.branches['main']?.headCommitId !== null && state.branches['main']?.headCommitId !== undefined,
        xpReward: 20,
      },
    ],
    concept: 'A commit is a snapshot of your project at a point in time. It includes a message explaining what changed.',
  },
  {
    id: 'w1_boss',
    title: 'Boss: The Untracked Beast',
    description: 'A massive beast of untracked files looms. Initialize a repository, stage all files, and commit to defeat it!',
    isBoss: true,
    bossName: 'The Untracked Beast',
    setupState: makeState({
      initialized: false,
      files: [
        createFile('hero.js', 'function hero() {}', false),
        createFile('style.css', 'body {}', false),
        createFile('config.json', '{}', false),
        createFile('notes.txt', 'tmp notes', false),
      ],
    }),
    objectives: [
      {
        id: 'w1_boss_obj1',
        description: 'Initialize the repository',
        hint: 'git init',
        concept: 'Start by initializing the repository.',
        check: (state) => state.initialized,
        xpReward: 10,
      },
      {
        id: 'w1_boss_obj2',
        description: 'Stage all files',
        hint: 'git add .',
        concept: 'Stage all files to prepare them for the commit.',
        check: (state) => state.files.filter((f) => f.staged).length >= 4,
        xpReward: 15,
      },
      {
        id: 'w1_boss_obj3',
        description: 'Make a commit to seal the beast',
        hint: 'git commit -m "Defeat the beast"',
        concept: 'The commit is the final blow. With all files tracked and committed, the beast is defeated.',
        check: (state) => state.branches['main']?.headCommitId !== null && state.branches['main']?.headCommitId !== undefined,
        xpReward: 30,
      },
    ],
    concept: 'The Untracked Beast represents the chaos of untracked files. git init, git add, and git commit bring order.',
  },
];

// ===== WORLD 2: The Cave of Lost Commits =====
const world2Challenges: WorldChallenge[] = [
  {
    id: 'w2_c1_log',
    title: 'Read the History Walls',
    description: 'The cave walls are covered in ancient commit messages. Use git log to read the history of this repository.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'a1b2c3d', isRemote: false } },
      commits: {
        a1b2c3d: { id: 'a1b2c3d', message: 'Add login page', parentIds: ['e4f5g6h'], branch: 'main', files: [createFile('login.html', '<form>login</form>', true)], timestamp: Date.now() - 86400000 },
        e4f5g6h: { id: 'e4f5g6h', message: 'Initial commit', parentIds: [], branch: 'main', files: [createFile('index.html', '<h1>Home</h1>', true)], timestamp: Date.now() - 172800000 },
      },
      files: [createFile('login.html', '<form>login</form>', true), createFile('index.html', '<h1>Home</h1>', true)],
    }),
    objectives: [
      {
        id: 'w2_c1_obj1',
        description: 'View the commit history with git log',
        hint: 'Type git log',
        concept: 'git log shows every commit on the current branch, from newest to oldest.',
        check: (_state, result) => result.output.some((l) => l.includes('commit')),
        xpReward: 15,
      },
    ],
    concept: 'The commit history is the story of your project. git log lets you read that story.',
  },
  {
    id: 'w2_c2_diff',
    title: 'Inspect the Changes',
    description: 'Something has changed in the cave. Use git diff to see what has been modified since the last commit.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'f1e2d3c', isRemote: false } },
      commits: {
        f1e2d3c: { id: 'f1e2d3c', message: 'Add hero section', parentIds: [], branch: 'main', files: [createFile('index.html', '<h1>Old Title</h1>', true)], timestamp: Date.now() - 86400000 },
      },
      files: [{ name: 'index.html', content: '<h1>New Title</h1>', tracked: true, staged: false, ignored: false }],
    }),
    objectives: [
      {
        id: 'w2_c2_obj1',
        description: 'View the changes with git diff',
        hint: 'Type git diff',
        concept: 'git diff shows the exact lines that changed in your working directory compared to the last commit.',
        check: (_state, result) => result.output.some((l) => l.includes('diff --git') || l.includes('+++') || l.includes('---')),
        xpReward: 15,
      },
    ],
    concept: 'git diff is your magnifying glass. It shows exactly what changed, line by line.',
  },
  {
    id: 'w2_c3_ignore',
    title: 'The Whispering Files',
    description: 'Unwanted files keep appearing in the cave. Configure .gitignore to silence them so they no longer appear as untracked.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'c3d4e5f', isRemote: false } },
      commits: {
        c3d4e5f: { id: 'c3d4e5f', message: 'Setup project', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("app")', true)], timestamp: Date.now() - 86400000 },
      },
      files: [
        createFile('app.js', 'console.log("app")', true),
        createFile('debug.log', 'debug info', false),
        createFile('temp.tmp', 'temporary', false),
      ],
    }),
    objectives: [
      {
        id: 'w2_c3_obj1',
        description: 'Add "debug.log" to .gitignore',
        hint: 'Use: git ignore debug.log  (or .gitignore debug.log)',
        concept: '.gitignore tells Git which files to ignore. Ignored files do not show up as untracked.',
        check: (state) => state.gitignore.includes('debug.log'),
        xpReward: 20,
      },
      {
        id: 'w2_c3_obj2',
        description: 'Add "*.tmp" pattern to ignore all temp files',
        hint: 'Use: git ignore *.tmp',
        concept: 'You can use wildcards in .gitignore. *.tmp ignores all files ending in .tmp.',
        check: (state) => state.gitignore.some((p) => p.includes('*.tmp') || p.includes('*.tmp')),
        xpReward: 15,
      },
    ],
    concept: '.gitignore is your shield against noise. It keeps build artifacts, logs, and temp files out of your repository.',
  },
  {
    id: 'w2_boss',
    title: 'Boss: The History Eater',
    description: 'The History Eater devours commit messages! View the log, inspect a diff, and add .gitignore to banish it.',
    isBoss: true,
    bossName: 'The History Eater',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'h7g6f5d', isRemote: false } },
      commits: {
        h7g6f5d: { id: 'h7g6f5d', message: 'Fix navigation bug', parentIds: ['g6f5d4c'], branch: 'main', files: [createFile('nav.js', 'function nav() { return "fixed"; }', true)], timestamp: Date.now() - 86400000 },
        g6f5d4c: { id: 'g6f5d4c', message: 'Add navigation', parentIds: ['f5d4c3b'], branch: 'main', files: [createFile('nav.js', 'function nav() { return "broken"; }', true)], timestamp: Date.now() - 172800000 },
        f5d4c3b: { id: 'f5d4c3b', message: 'Initial setup', parentIds: [], branch: 'main', files: [createFile('index.html', '<h1>App</h1>', true)], timestamp: Date.now() - 259200000 },
      },
      files: [
        { name: 'nav.js', content: 'function nav() { return "fixed"; }', tracked: true, staged: false, ignored: false },
        { name: 'index.html', content: '<h1>App</h1>', tracked: true, staged: false, ignored: false },
        { name: 'error.log', content: 'error: something', tracked: false, staged: false, ignored: false },
      ],
    }),
    objectives: [
      {
        id: 'w2_boss_obj1',
        description: 'Read the commit history (git log)',
        hint: 'git log',
        concept: 'The History Eater hides in the commit messages. Read them with git log.',
        check: (_state, result) => result.output.some((l) => l.includes('commit')),
        xpReward: 10,
      },
      {
        id: 'w2_boss_obj2',
        description: 'Inspect the changes (git diff)',
        hint: 'git diff',
        concept: 'See what changed between commits with git diff.',
        check: (_state, result) => result.output.some((l) => l.includes('diff --git')),
        xpReward: 10,
      },
      {
        id: 'w2_boss_obj3',
        description: 'Silence the error.log file with .gitignore',
        hint: 'git ignore error.log',
        concept: 'The History Eater feeds on noise. Silence unwanted files with .gitignore.',
        check: (state) => state.gitignore.includes('error.log'),
        xpReward: 20,
      },
    ],
    concept: 'The History Eater represents ignored history and noise. git log, git diff, and .gitignore are your weapons.',
  },
];

// ===== WORLD 3: The Branching Forest =====
const world3Challenges: WorldChallenge[] = [
  {
    id: 'w3_c1_branch',
    title: 'Grow a New Path',
    description: 'The forest branches in many directions. Create a new branch called "feature-quest" to start a separate line of work.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'b1a2c3d', isRemote: false } },
      commits: {
        b1a2c3d: { id: 'b1a2c3d', message: 'Base commit', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("base")', true)], timestamp: Date.now() - 86400000 },
      },
      files: [createFile('app.js', 'console.log("base")', true)],
    }),
    objectives: [
      {
        id: 'w3_c1_obj1',
        description: 'Create a branch called "feature-quest"',
        hint: 'git branch feature-quest',
        concept: 'git branch <name> creates a new branch without switching to it.',
        check: (state) => !!state.branches['feature-quest'],
        xpReward: 15,
      },
    ],
    concept: 'Branches let you work on different features independently without affecting the main branch.',
  },
  {
    id: 'w3_c2_switch',
    title: 'Walk the New Path',
    description: 'Now switch to the feature-quest branch to start working on it.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: { name: 'main', headCommitId: 'b1a2c3d', isRemote: false },
        'feature-quest': { name: 'feature-quest', headCommitId: 'b1a2c3d', isRemote: false },
      },
      commits: {
        b1a2c3d: { id: 'b1a2c3d', message: 'Base commit', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("base")', true)], timestamp: Date.now() - 86400000 },
      },
      files: [createFile('app.js', 'console.log("base")', true)],
    }),
    objectives: [
      {
        id: 'w3_c2_obj1',
        description: 'Switch to the feature-quest branch',
        hint: 'git switch feature-quest  (or git checkout feature-quest)',
        concept: 'git switch moves you to a different branch. Your working directory updates to match that branch.',
        check: (state) => state.currentBranch === 'feature-quest',
        xpReward: 15,
      },
    ],
    concept: 'Switching branches changes what files you see in your working directory. Each branch is an independent timeline.',
  },
  {
    id: 'w3_c3_commit_branch',
    title: 'Mark the New Path',
    description: 'While on the feature-quest branch, stage and commit a change to prove that branches are independent.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'feature-quest',
      branches: {
        main: { name: 'main', headCommitId: 'b1a2c3d', isRemote: false },
        'feature-quest': { name: 'feature-quest', headCommitId: 'b1a2c3d', isRemote: false },
      },
      commits: {
        b1a2c3d: { id: 'b1a2c3d', message: 'Base commit', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("base")', true)], timestamp: Date.now() - 86400000 },
      },
      files: [{ name: 'app.js', content: 'console.log("feature")', tracked: true, staged: false, ignored: false }],
    }),
    objectives: [
      {
        id: 'w3_c3_obj1',
        description: 'Stage the modified file and commit it',
        hint: 'git add app.js && git commit -m "Add feature"',
        concept: 'When you commit on a branch, only that branch moves forward. main stays where it was.',
        check: (state) => state.branches['feature-quest']?.headCommitId !== 'b1a2c3d' && state.branches['feature-quest']?.headCommitId !== null,
        xpReward: 20,
      },
    ],
    concept: 'Commits on one branch do not affect other branches. This is what makes branches independent.',
  },
  {
    id: 'w3_c4_merge',
    title: 'Unite the Paths',
    description: 'Switch back to main and merge the feature-quest branch into it.',
    setupState: makeState({
      initialized: true,
      currentBranch: 'feature-quest',
      branches: {
        main: { name: 'main', headCommitId: 'b1a2c3d', isRemote: false },
        'feature-quest': { name: 'feature-quest', headCommitId: 'd4e5f6g', isRemote: false },
      },
      commits: {
        b1a2c3d: { id: 'b1a2c3d', message: 'Base commit', parentIds: [], branch: 'main', files: [createFile('app.js', 'console.log("base")', true)], timestamp: Date.now() - 86400000 },
        d4e5f6g: { id: 'd4e5f6g', message: 'Add feature', parentIds: ['b1a2c3d'], branch: 'feature-quest', files: [createFile('app.js', 'console.log("feature")', true)], timestamp: Date.now() - 43200000 },
      },
      files: [createFile('app.js', 'console.log("feature")', true)],
    }),
    objectives: [
      {
        id: 'w3_c4_obj1',
        description: 'Switch to the main branch',
        hint: 'git switch main',
        concept: 'Before merging, you need to be on the branch you want to merge INTO.',
        check: (state) => state.currentBranch === 'main',
        xpReward: 10,
      },
      {
        id: 'w3_c4_obj2',
        description: 'Merge feature-quest into main',
        hint: 'git merge feature-quest',
        concept: 'git merge brings changes from another branch into your current branch.',
        check: (state) => state.branches['main']?.headCommitId !== 'b1a2c3d',
        xpReward: 20,
      },
    ],
    concept: 'Merging combines the work from one branch into another. The feature is now part of main.',
  },
  {
    id: 'w3_boss',
    title: 'Boss: The Branch Guardian',
    description: 'The Branch Guardian demands you prove your mastery: create a branch, switch to it, commit, switch back, and merge.',
    isBoss: true,
    bossName: 'The Branch Guardian',
    setupState: makeState({
      initialized: true,
      currentBranch: 'main',
      branches: { main: { name: 'main', headCommitId: 'g7f6e5d', isRemote: false } },
      commits: {
        g7f6e5d: { id: 'g7f6e5d', message: 'Base', parentIds: [], branch: 'main', files: [createFile('main.js', 'console.log("main")', true)], timestamp: Date.now() - 86400000 },
      },
      files: [createFile('main.js', 'console.log("main")', true)],
    }),
    objectives: [
      {
        id: 'w3_boss_obj1',
        description: 'Create and switch to a branch called "victory"',
        hint: 'git switch -c victory',
        concept: 'git switch -c creates a new branch and switches to it in one step.',
        check: (state) => state.currentBranch === 'victory' && !!state.branches['victory'],
        xpReward: 15,
      },
      {
        id: 'w3_boss_obj2',
        description: 'Make a commit on the victory branch',
        hint: 'git add . && git commit -m "Victory changes"',
        concept: 'Commit on the new branch to create independent history.',
        check: (state) => state.branches['victory']?.headCommitId !== 'g7f6e5d' && state.branches['victory']?.headCommitId !== null,
        xpReward: 15,
      },
      {
        id: 'w3_boss_obj3',
        description: 'Switch to main and merge victory',
        hint: 'git switch main && git merge victory',
        concept: 'Merge the feature branch back into main to complete the workflow.',
        check: (state) => state.currentBranch === 'main' && state.branches['main']?.headCommitId !== 'g7f6e5d',
        xpReward: 25,
      },
    ],
    concept: 'The full branch workflow: create a branch, make commits, switch back, merge. This is the foundation of Git collaboration.',
  },
];

export const WORLDS: GameWorld[] = [
  {
    id: 1,
    name: 'The Forgotten Repository',
    description: 'An ancient repository lies dormant. Learn to initialize it, stage files, and make your first commit.',
    region: 'Grasslands',
    color: '#22c55e',
    accentColor: '#86efac',
    challenges: world1Challenges,
    unlockCondition: (p) => true,
    bossName: 'The Untracked Beast',
    bossDescription: 'A massive creature made of untracked files, roaming the forgotten repository.',
    position: [0, 0, 0],
  },
  {
    id: 2,
    name: 'The Cave of Lost Commits',
    description: 'Deep within a cave, commit messages have been scattered. Learn to read history and inspect changes.',
    region: 'Underground Cave',
    color: '#78716c',
    accentColor: '#a8a29e',
    challenges: world2Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w1_boss'),
    bossName: 'The History Eater',
    bossDescription: 'A beast that devours commit messages and feeds on repository noise.',
    position: [40, 0, -30],
  },
  {
    id: 3,
    name: 'The Branching Forest',
    description: 'A forest where paths branch in every direction. Master branching, switching, and merging.',
    region: 'Dense Forest',
    color: '#15803d',
    accentColor: '#4ade80',
    challenges: world3Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w2_boss'),
    bossName: 'The Branch Guardian',
    bossDescription: 'A towering guardian that protects the branching paths of the forest.',
    position: [-30, 0, -50],
  },
  {
    id: 4,
    name: 'Conflict Canyon',
    description: 'A treacherous canyon where merge conflicts lurk. Learn to resolve conflicts and complete merges.',
    region: 'Deep Canyon',
    color: '#dc2626',
    accentColor: '#fca5a5',
    challenges: world4Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w3_boss'),
    bossName: 'The Conflict Dragon',
    bossDescription: 'A dragon that creates conflict markers wherever it flies.',
    position: [60, 0, -60],
  },
  {
    id: 5,
    name: 'The Remote Kingdom',
    description: 'A distant kingdom connected by remote repositories. Learn cloning, fetching, pulling, and pushing.',
    region: 'Mountain Kingdom',
    color: '#2563eb',
    accentColor: '#93c5fd',
    challenges: world5Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w4_boss'),
    bossName: 'The Gatekeeper',
    bossDescription: 'A sentinel that guards the gates between local and remote repositories.',
    position: [-60, 0, -80],
  },
  {
    id: 6,
    name: 'The Collaboration Guild',
    description: 'A guild where developers work together. Learn issues, pull requests, code review, and merging.',
    region: 'Guild Hall',
    color: '#ea580c',
    accentColor: '#fdba74',
    challenges: world6Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w5_boss'),
    bossName: 'The Code Review Council',
    bossDescription: 'A council of senior developers who judge every pull request.',
    position: [80, 0, -90],
  },
  {
    id: 7,
    name: 'The Time-Reversal Temple',
    description: 'An ancient temple where time flows backward. Master stash, restore, revert, reset, cherry-pick, and rebase.',
    region: 'Ancient Temple',
    color: '#7c3aed',
    accentColor: '#c4b5fd',
    challenges: world7Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w6_boss'),
    bossName: 'The Timeline Keeper',
    bossDescription: 'A timeless being that controls the flow of Git history.',
    position: [-80, 0, -100],
  },
  {
    id: 8,
    name: "The Dragon's Citadel",
    description: 'The final stronghold. Combine all your skills to defeat the Merge Dragon in the ultimate challenge.',
    region: 'Dragon Citadel',
    color: '#991b1b',
    accentColor: '#f87171',
    challenges: world8Challenges,
    unlockCondition: (p) => p.completedChallenges.some((c) => c.challengeId === 'w7_boss'),
    bossName: 'The Merge Dragon',
    bossDescription: 'The ultimate boss. It tests every Git skill you have learned.',
    position: [0, 0, -130],
    isFinalWorld: true,
  },
];

export { secretMissions };
