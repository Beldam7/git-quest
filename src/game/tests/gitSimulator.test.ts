import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialRepoState, createFile } from '../simulator/GitSimulator';
import type { RepositoryState, SimFile } from '../types';

function freshState(): RepositoryState {
  return createInitialRepoState();
}

function stateWithFiles(files: SimFile[], initialized = true): RepositoryState {
  const state = freshState();
  state.initialized = initialized;
  state.branches = { main: { name: 'main', headCommitId: null, isRemote: false } };
  state.files = files;
  return state;
}

describe('Git Simulator - Basic Commands', () => {
  it('git init initializes the repository', () => {
    const state = freshState();
    const { result, newState } = executeCommand(state, 'git init');
    expect(result.success).toBe(true);
    expect(newState.initialized).toBe(true);
    expect(newState.branches['main']).toBeDefined();
  });

  it('git status shows untracked files', () => {
    const state = stateWithFiles([createFile('README.md', '# Test', false)]);
    const { result } = executeCommand(state, 'git status');
    expect(result.success).toBe(true);
    expect(result.output.some((l) => l.includes('Untracked'))).toBe(true);
  });

  it('git status fails on uninitialized repo', () => {
    const state = freshState();
    const { result } = executeCommand(state, 'git status');
    expect(result.success).toBe(false);
  });

  it('git add stages files', () => {
    const state = stateWithFiles([createFile('app.js', 'console.log("app")', false)]);
    const { result, newState } = executeCommand(state, 'git add app.js');
    expect(result.success).toBe(true);
    expect(newState.files[0].staged).toBe(true);
    expect(newState.files[0].tracked).toBe(true);
  });

  it('git add . stages all files', () => {
    const state = stateWithFiles([createFile('a.js', '', false), createFile('b.js', '', false)]);
    const { result, newState } = executeCommand(state, 'git add .');
    expect(result.success).toBe(true);
    expect(newState.files.every((f) => f.staged)).toBe(true);
  });

  it('git commit creates a commit with message', () => {
    const state = stateWithFiles([
      { name: 'app.js', content: 'console.log("app")', tracked: true, staged: true, ignored: false },
    ]);
    const { result, newState } = executeCommand(state, 'git commit -m "Initial commit"');
    expect(result.success).toBe(true);
    expect(newState.branches['main'].headCommitId).not.toBeNull();
    const commit = newState.commits[newState.branches['main'].headCommitId!];
    expect(commit.message).toBe('Initial commit');
  });

  it('git commit fails without staged files', () => {
    const state = stateWithFiles([createFile('app.js', '', false)]);
    const { result, newState } = executeCommand(state, 'git commit -m "test"');
    expect(result.success).toBe(false);
    expect(newState.branches['main'].headCommitId).toBeNull();
  });

  it('git commit fails without -m message', () => {
    const state = stateWithFiles([
      { name: 'app.js', content: 'test', tracked: true, staged: true, ignored: false },
    ]);
    const { result } = executeCommand(state, 'git commit');
    expect(result.success).toBe(false);
  });

  it('git log shows commit history', () => {
    const state = stateWithFiles([]);
    state.commits['abc123'] = {
      id: 'abc123', message: 'Test commit', parentIds: [], branch: 'main',
      files: [createFile('app.js', '', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'abc123';
    const { result } = executeCommand(state, 'git log');
    expect(result.success).toBe(true);
    expect(result.output.some((l) => l.includes('abc123'))).toBe(true);
    expect(result.output.some((l) => l.includes('Test commit'))).toBe(true);
  });

  it('git diff shows changes', () => {
    const state = stateWithFiles([]);
    state.commits['def456'] = {
      id: 'def456', message: 'Base', parentIds: [], branch: 'main',
      files: [createFile('index.html', '<h1>Old</h1>', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'def456';
    state.files = [{ name: 'index.html', content: '<h1>New</h1>', tracked: true, staged: false, ignored: false }];
    const { result } = executeCommand(state, 'git diff');
    expect(result.success).toBe(true);
    expect(result.output.some((l) => l.includes('diff --git'))).toBe(true);
  });
});

describe('Git Simulator - Branch Operations', () => {
  it('git branch creates a new branch', () => {
    const state = stateWithFiles([]);
    state.commits['base1'] = {
      id: 'base1', message: 'Base', parentIds: [], branch: 'main',
      files: [], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'base1';
    const { result, newState } = executeCommand(state, 'git branch feature');
    expect(result.success).toBe(true);
    expect(newState.branches['feature']).toBeDefined();
    expect(newState.branches['feature'].headCommitId).toBe('base1');
  });

  it('git switch changes current branch', () => {
    const state = stateWithFiles([]);
    state.commits['base1'] = {
      id: 'base1', message: 'Base', parentIds: [], branch: 'main',
      files: [], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'base1';
    state.branches['feature'] = { name: 'feature', headCommitId: 'base1', isRemote: false };
    const { result, newState } = executeCommand(state, 'git switch feature');
    expect(result.success).toBe(true);
    expect(newState.currentBranch).toBe('feature');
  });

  it('git switch -c creates and switches to new branch', () => {
    const state = stateWithFiles([]);
    state.commits['base1'] = {
      id: 'base1', message: 'Base', parentIds: [], branch: 'main',
      files: [], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'base1';
    const { result, newState } = executeCommand(state, 'git switch -c new-feature');
    expect(result.success).toBe(true);
    expect(newState.currentBranch).toBe('new-feature');
    expect(newState.branches['new-feature']).toBeDefined();
  });

  it('git merge integrates another branch', () => {
    const state = stateWithFiles([]);
    state.commits['base1'] = {
      id: 'base1', message: 'Base', parentIds: [], branch: 'main',
      files: [createFile('app.js', 'v1', true)], timestamp: Date.now(),
    };
    state.commits['feat1'] = {
      id: 'feat1', message: 'Feature', parentIds: ['base1'], branch: 'feature',
      files: [createFile('app.js', 'v1', true), createFile('feat.js', 'new', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'base1';
    state.branches['feature'] = { name: 'feature', headCommitId: 'feat1', isRemote: false };
    const { result, newState } = executeCommand(state, 'git merge feature');
    expect(result.success).toBe(true);
    expect(newState.branches['main'].headCommitId).not.toBe('base1');
  });
});

describe('Git Simulator - Merge Conflicts', () => {
  it('git merge detects conflicts when both branches change same file', () => {
    const state = stateWithFiles([]);
    state.commits['base'] = {
      id: 'base', message: 'Base', parentIds: [], branch: 'main',
      files: [createFile('file.txt', 'original', true)], timestamp: Date.now(),
    };
    state.commits['main1'] = {
      id: 'main1', message: 'Main change', parentIds: ['base'], branch: 'main',
      files: [createFile('file.txt', 'main version', true)], timestamp: Date.now(),
    };
    state.commits['feat1'] = {
      id: 'feat1', message: 'Feature change', parentIds: ['base'], branch: 'feature',
      files: [createFile('file.txt', 'feature version', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'main1';
    state.branches['feature'] = { name: 'feature', headCommitId: 'feat1', isRemote: false };
    state.files = [{ name: 'file.txt', content: 'main version', tracked: true, staged: false, ignored: false }];
    const { result, newState } = executeCommand(state, 'git merge feature');
    expect(result.success).toBe(false);
    expect(newState.mergeInProgress).toBe(true);
    expect(newState.conflicts.length).toBeGreaterThan(0);
    expect(result.conflictCreated).toBe(true);
  });

  it('git resolve resolves a conflict', () => {
    const state = stateWithFiles([]);
    state.mergeInProgress = true;
    state.mergeTarget = 'feature';
    state.conflicts = [{ file: 'file.txt', ours: 'main', theirs: 'feature', resolved: false }];
    state.files = [{ name: 'file.txt', content: '<<<<<<< HEAD\nmain\n=======\nfeature\n>>>>>>> feature', tracked: true, staged: false, ignored: false }];
    state.branches = { main: { name: 'main', headCommitId: 'main1', isRemote: false } };
    const { result, newState } = executeCommand(state, 'git resolve file.txt ours');
    expect(result.success).toBe(true);
    expect(newState.conflicts[0].resolved).toBe(true);
    expect(newState.files[0].content).toBe('main');
  });
});

describe('Git Simulator - Remote Operations', () => {
  it('git clone initializes repo with origin', () => {
    const state = freshState();
    const { result, newState } = executeCommand(state, 'git clone https://github.com/test/repo.git');
    expect(result.success).toBe(true);
    expect(newState.initialized).toBe(true);
    expect(newState.remotes['origin']).toBeDefined();
    expect(newState.remotes['origin'].url).toBe('https://github.com/test/repo.git');
  });

  it('git fetch updates remote tracking branches', () => {
    const state = stateWithFiles([]);
    state.commits['local1'] = {
      id: 'local1', message: 'Local', parentIds: [], branch: 'main',
      files: [], timestamp: Date.now(),
    };
    state.commits['remote1'] = {
      id: 'remote1', message: 'Remote', parentIds: [], branch: 'main',
      files: [], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'local1';
    state.remotes = { origin: { name: 'origin', url: 'https://github.com/test/repo.git', branches: { main: 'remote1' } } };
    const { result, newState } = executeCommand(state, 'git fetch origin');
    expect(result.success).toBe(true);
    expect(newState.branches['origin/main']).toBeDefined();
    // Local branch should NOT change
    expect(newState.branches['main'].headCommitId).toBe('local1');
  });

  describe('pull and push follow real Git rules', () => {
    const commit = (state: ReturnType<typeof stateWithFiles>, id: string, parents: string[], file: string) => {
      state.commits[id] = { id, message: id, parentIds: parents, branch: 'main', files: [createFile(file, id, true)], timestamp: Date.now() };
    };
    const withRemote = (state: ReturnType<typeof stateWithFiles>, remoteTip: string | null) => {
      state.remotes = { origin: { name: 'origin', url: 'https://github.com/test/repo.git', branches: { main: remoteTip } } };
    };

    it('pull with diverged histories makes a merge commit that keeps BOTH sides', () => {
      const state = stateWithFiles([]);
      commit(state, 'local1', [], 'local.js');
      commit(state, 'remote1', [], 'remote.js');
      state.branches['main'].headCommitId = 'local1';
      withRemote(state, 'remote1');
      const { result, newState } = executeCommand(state, 'git pull origin main');
      expect(result.success).toBe(true);
      const head = newState.commits[newState.branches['main'].headCommitId as string];
      expect(head.parentIds).toEqual(['local1', 'remote1']);
      expect(head.files.map((f) => f.name).sort()).toEqual(['local.js', 'remote.js']);
    });

    it('pull when you are behind fast-forwards to the remote commit', () => {
      const state = stateWithFiles([]);
      commit(state, 'base', [], 'a.js');
      commit(state, 'remote1', ['base'], 'a.js');
      state.branches['main'].headCommitId = 'base';
      withRemote(state, 'remote1');
      const { result, newState } = executeCommand(state, 'git pull');
      expect(result.output.join(' ')).toMatch(/Fast-forward/);
      expect(newState.branches['main'].headCommitId).toBe('remote1');
    });

    it('pull when you are ahead changes nothing ("Already up to date")', () => {
      const state = stateWithFiles([]);
      commit(state, 'base', [], 'a.js');
      commit(state, 'mine', ['base'], 'a.js');
      state.branches['main'].headCommitId = 'mine';
      withRemote(state, 'base');
      const { result, newState } = executeCommand(state, 'git pull');
      expect(result.output.join(' ')).toMatch(/up to date/i);
      expect(newState.branches['main'].headCommitId).toBe('mine');
    });

    it('push when you are ahead of the remote succeeds and moves the remote forward', () => {
      const state = stateWithFiles([]);
      commit(state, 'base', [], 'a.js');
      commit(state, 'mine', ['base'], 'a.js');
      state.branches['main'].headCommitId = 'mine';
      withRemote(state, 'base');
      const { result, newState } = executeCommand(state, 'git push origin main');
      expect(result.success).toBe(true);
      expect(newState.remotes['origin'].branches['main']).toBe('mine');
    });

    it('push is rejected only when the remote has commits you do not have', () => {
      const state = stateWithFiles([]);
      commit(state, 'local1', [], 'l.js');
      commit(state, 'remote1', [], 'r.js');
      state.branches['main'].headCommitId = 'local1';
      withRemote(state, 'remote1');
      const { result, newState } = executeCommand(state, 'git push origin main');
      expect(result.success).toBe(false);
      expect(newState.rejectedPush).toBe(true);
      expect(newState.remotes['origin'].branches['main']).toBe('remote1');
    });

    it('pull then push after a rejection succeeds, and pushing again is "up-to-date"', () => {
      let state = stateWithFiles([]);
      commit(state, 'local1', [], 'l.js');
      commit(state, 'remote1', [], 'r.js');
      state.branches['main'].headCommitId = 'local1';
      withRemote(state, 'remote1');
      state = executeCommand(state, 'git push origin main').newState;
      state = executeCommand(state, 'git pull origin main').newState;
      const pushed = executeCommand(state, 'git push origin main');
      expect(pushed.result.success).toBe(true);
      expect(pushed.newState.remotes['origin'].branches['main']).toBe(pushed.newState.branches['main'].headCommitId);
      expect(pushed.newState.rejectedPush).toBe(false);
      expect(executeCommand(pushed.newState, 'git push origin main').result.output.join(' ')).toMatch(/up-to-date/);
    });
  });

  it('git push uploads commits to remote', () => {
    const state = stateWithFiles([]);
    state.commits['push1'] = {
      id: 'push1', message: 'New commit', parentIds: [], branch: 'main',
      files: [createFile('app.js', 'new', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'push1';
    state.remotes = { origin: { name: 'origin', url: 'https://github.com/test/repo.git', branches: { main: null } } };
    const { result, newState } = executeCommand(state, 'git push origin main');
    expect(result.success).toBe(true);
    expect(newState.remotes['origin'].branches['main']).toBe('push1');
  });

  it('git push is rejected when remote has diverged', () => {
    const state = stateWithFiles([]);
    state.commits['local1'] = {
      id: 'local1', message: 'Local', parentIds: [], branch: 'main',
      files: [createFile('local.js', '', true)], timestamp: Date.now(),
    };
    state.commits['remote1'] = {
      id: 'remote1', message: 'Remote', parentIds: [], branch: 'main',
      files: [createFile('remote.js', '', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'local1';
    state.remotes = { origin: { name: 'origin', url: 'https://github.com/test/repo.git', branches: { main: 'remote1' } } };
    const { result, newState } = executeCommand(state, 'git push origin main');
    expect(result.success).toBe(false);
    expect(newState.rejectedPush).toBe(true);
  });
});

describe('Git Simulator - Time-Reversal Commands', () => {
  it('git stash saves and restores changes', () => {
    const state = stateWithFiles([]);
    state.commits['base'] = {
      id: 'base', message: 'Base', parentIds: [], branch: 'main',
      files: [createFile('app.js', 'original', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'base';
    state.files = [{ name: 'app.js', content: 'modified', tracked: true, staged: false, ignored: false }];
    const { result: stashResult, newState: stashState } = executeCommand(state, 'git stash');
    expect(stashResult.success).toBe(true);
    expect(stashState.stash.length).toBe(1);
    expect(stashState.files[0].content).toBe('original');
    const { result: popResult, newState: popState } = executeCommand(stashState, 'git stash pop');
    expect(popResult.success).toBe(true);
    expect(popState.stash.length).toBe(0);
    expect(popState.files[0].content).toBe('modified');
  });

  it('git restore discards working directory changes', () => {
    const state = stateWithFiles([]);
    state.commits['base'] = {
      id: 'base', message: 'Base', parentIds: [], branch: 'main',
      files: [createFile('file.js', 'original', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'base';
    state.files = [{ name: 'file.js', content: 'corrupted', tracked: true, staged: false, ignored: false }];
    const { result, newState } = executeCommand(state, 'git restore file.js');
    expect(result.success).toBe(true);
    expect(newState.files[0].content).toBe('original');
  });

  it('git revert creates a new commit that undoes changes', () => {
    const state = stateWithFiles([]);
    state.commits['bad'] = {
      id: 'bad', message: 'Bad commit', parentIds: ['good'], branch: 'main',
      files: [], timestamp: Date.now(),
    };
    state.commits['good'] = {
      id: 'good', message: 'Good commit', parentIds: [], branch: 'main',
      files: [createFile('important.js', 'important', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'bad';
    const { result, newState } = executeCommand(state, 'git revert bad');
    expect(result.success).toBe(true);
    expect(newState.branches['main'].headCommitId).not.toBe('bad');
  });

  it('git reset moves branch pointer', () => {
    const state = stateWithFiles([]);
    state.commits['v3'] = {
      id: 'v3', message: 'v3', parentIds: ['v2'], branch: 'main',
      files: [createFile('data.js', 'v3', true)], timestamp: Date.now(),
    };
    state.commits['v2'] = {
      id: 'v2', message: 'v2', parentIds: ['v1'], branch: 'main',
      files: [createFile('data.js', 'v2', true)], timestamp: Date.now(),
    };
    state.commits['v1'] = {
      id: 'v1', message: 'v1', parentIds: [], branch: 'main',
      files: [createFile('data.js', 'v1', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'v3';
    state.files = [createFile('data.js', 'v3', true)];
    const { result, newState } = executeCommand(state, 'git reset --hard v1');
    expect(result.success).toBe(true);
    expect(newState.branches['main'].headCommitId).toBe('v1');
    expect(newState.files[0].content).toBe('v1');
  });

  it('git cherry-pick applies a commit from another branch', () => {
    const state = stateWithFiles([]);
    state.commits['main1'] = {
      id: 'main1', message: 'Main', parentIds: [], branch: 'main',
      files: [createFile('main.js', 'main', true)], timestamp: Date.now(),
    };
    state.commits['feat1'] = {
      id: 'feat1', message: 'Feature commit', parentIds: ['main1'], branch: 'feature',
      files: [createFile('main.js', 'main', true), createFile('magic.js', 'magic', true)], timestamp: Date.now(),
    };
    state.branches['main'].headCommitId = 'main1';
    state.branches['feature'] = { name: 'feature', headCommitId: 'feat1', isRemote: false };
    state.currentBranch = 'main';
    state.files = [createFile('main.js', 'main', true)];
    const { result, newState } = executeCommand(state, 'git cherry-pick feat1');
    expect(result.success).toBe(true);
    expect(newState.branches['main'].headCommitId).not.toBe('main1');
  });

  it('git reflog shows history of HEAD changes', () => {
    const state = stateWithFiles([]);
    state.reflog = [
      { action: 'commit: test', commitId: 'abc', timestamp: Date.now() },
      { action: 'reset: to def', commitId: 'def', timestamp: Date.now() },
    ];
    const { result } = executeCommand(state, 'git reflog');
    expect(result.success).toBe(true);
    expect(result.output.some((l) => l.includes('abc'))).toBe(true);
  });
});

describe('Git Simulator - .gitignore', () => {
  it('git ignore adds pattern to .gitignore', () => {
    const state = stateWithFiles([
      createFile('app.js', '', true),
      createFile('debug.log', 'debug', false),
    ]);
    const { result, newState } = executeCommand(state, 'git ignore debug.log');
    expect(result.success).toBe(true);
    expect(newState.gitignore.includes('debug.log')).toBe(true);
    expect(newState.files.find((f) => f.name === 'debug.log')?.ignored).toBe(true);
  });

  it('ignored files cannot be staged', () => {
    const state = stateWithFiles([
      createFile('app.js', '', true),
      { name: 'secret.env', content: 'SECRET', tracked: false, staged: false, ignored: true },
    ]);
    state.gitignore = ['secret.env'];
    const { result } = executeCommand(state, 'git add secret.env');
    expect(result.success).toBe(false);
  });
});

describe('Git Simulator - GitHub Simulations', () => {
  it('git issue create makes a new issue', () => {
    const state = stateWithFiles([]);
    const { result, newState } = executeCommand(state, 'git issue create "Fix bug"');
    expect(result.success).toBe(true);
    expect(newState.issues.length).toBe(1);
    expect(newState.issues[0].title).toBe('Fix bug');
  });

  it('git pr create makes a pull request', () => {
    const state = stateWithFiles([]);
    state.branches['main'].headCommitId = 'base';
    state.branches['feature'] = { name: 'feature', headCommitId: 'feat', isRemote: false };
    state.commits['base'] = { id: 'base', message: 'Base', parentIds: [], branch: 'main', files: [], timestamp: Date.now() };
    state.commits['feat'] = { id: 'feat', message: 'Feature', parentIds: ['base'], branch: 'feature', files: [], timestamp: Date.now() };
    const { result, newState } = executeCommand(state, 'git pr create "Add feature" feature main');
    expect(result.success).toBe(true);
    expect(newState.pullRequests.length).toBe(1);
    expect(newState.pullRequests[0].sourceBranch).toBe('feature');
  });

  it('git pr merge merges a pull request', () => {
    const state = stateWithFiles([]);
    state.branches['main'].headCommitId = 'base';
    state.branches['feature'] = { name: 'feature', headCommitId: 'feat', isRemote: false };
    state.commits['base'] = { id: 'base', message: 'Base', parentIds: [], branch: 'main', files: [], timestamp: Date.now() };
    state.commits['feat'] = { id: 'feat', message: 'Feature', parentIds: ['base'], branch: 'feature', files: [], timestamp: Date.now() };
    state.pullRequests = [{
      id: 1, title: 'Test PR', body: '', sourceBranch: 'feature', targetBranch: 'main',
      state: 'open', author: 'player', reviews: [],
    }];
    const { result, newState } = executeCommand(state, 'git pr merge 1');
    expect(result.success).toBe(true);
    expect(newState.pullRequests[0].state).toBe('merged');
  });
});

describe('Git Simulator - Destructive Safeguards', () => {
  it('unknown command returns error', () => {
    const state = stateWithFiles([]);
    const { result } = executeCommand(state, 'git nonexistent');
    expect(result.success).toBe(false);
  });

  it('non-git command returns error', () => {
    const state = stateWithFiles([]);
    const { result } = executeCommand(state, 'rm -rf /');
    expect(result.success).toBe(false);
    expect(result.output[0]).toContain('command not found');
  });

  it('git reset --hard on unknown commit fails', () => {
    const state = stateWithFiles([]);
    state.commits['v1'] = { id: 'v1', message: 'v1', parentIds: [], branch: 'main', files: [], timestamp: Date.now() };
    state.branches['main'].headCommitId = 'v1';
    const { result } = executeCommand(state, 'git reset --hard nonexistent');
    expect(result.success).toBe(false);
  });
});
