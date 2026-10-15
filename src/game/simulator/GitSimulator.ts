import type {
  RepositoryState,
  SimFile,
  SimCommit,
  CommandResult,
  MergeConflict,
} from '../types';

function generateCommitId(): string {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * 16)];
  return id;
}

export function createInitialRepoState(): RepositoryState {
  return {
    initialized: false,
    currentBranch: 'main',
    branches: {},
    commits: {},
    files: [],
    remotes: {},
    stash: [],
    issues: [],
    pullRequests: [],
    conflicts: [],
    mergeInProgress: false,
    mergeTarget: null,
    rebaseInProgress: false,
    rebaseTarget: null,
    pendingRebaseCommits: [],
    currentRebaseCommit: 0,
    gitignore: [],
    reflog: [],
    rejectedPush: false,
    pushRejectionBranch: null,
  };
}

export function createFile(name: string, content = '', tracked = false): SimFile {
  return { name, content, tracked, staged: false, ignored: false };
}

function cloneFiles(files: SimFile[]): SimFile[] {
  return files.map((f) => ({ ...f }));
}

function cloneState(state: RepositoryState): RepositoryState {
  return {
    ...state,
    branches: Object.fromEntries(Object.entries(state.branches).map(([k, v]) => [k, { ...v }])),
    commits: Object.fromEntries(Object.entries(state.commits).map(([k, v]) => [k, { ...v, files: cloneFiles(v.files), parentIds: [...v.parentIds] }])),
    files: cloneFiles(state.files),
    remotes: Object.fromEntries(Object.entries(state.remotes).map(([k, v]) => [k, { ...v, branches: { ...v.branches } }])),
    stash: state.stash.map((s) => ({ ...s, files: cloneFiles(s.files) })),
    issues: state.issues.map((i) => ({ ...i })),
    pullRequests: state.pullRequests.map((p) => ({ ...p, reviews: p.reviews.map((r) => ({ ...r })) })),
    conflicts: state.conflicts.map((c) => ({ ...c })),
    gitignore: [...state.gitignore],
    reflog: [...state.reflog],
  };
}

function getHeadCommitId(state: RepositoryState, branch?: string): string | null {
  const b = state.branches[branch ?? state.currentBranch];
  return b?.headCommitId ?? null;
}

function getCommitChain(state: RepositoryState, commitId: string | null): SimCommit[] {
  const chain: SimCommit[] = [];
  let current = commitId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    const commit = state.commits[current];
    if (!commit) break;
    chain.push(commit);
    visited.add(current);
    current = commit.parentIds[0] ?? null;
  }
  return chain;
}

function addReflog(state: RepositoryState, action: string, commitId: string): void {
  state.reflog.unshift({ action, commitId, timestamp: Date.now() });
  if (state.reflog.length > 50) state.reflog = state.reflog.slice(0, 50);
}

function isIgnored(fileName: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    if (p === fileName) return true;
    if (p.endsWith('/') && fileName.startsWith(p)) return true;
    const regex = p.replace(/\./g, '\\.').replace(/\*/g, '.*');
    try {
      return new RegExp(`^${regex}$`).test(fileName);
    } catch {
      return false;
    }
  });
}

function stagedFiles(state: RepositoryState): SimFile[] {
  return state.files.filter((f) => f.staged);
}

function trackedFiles(state: RepositoryState): SimFile[] {
  return state.files.filter((f) => f.tracked && !f.ignored);
}

function untrackedFiles(state: RepositoryState): SimFile[] {
  return state.files.filter((f) => !f.tracked && !f.staged && !f.ignored);
}

function modifiedFiles(state: RepositoryState): SimFile[] {
  const head = getHeadCommitId(state);
  if (!head) return state.files.filter((f) => f.tracked);
  const headCommit = state.commits[head];
  if (!headCommit) return [];
  return state.files.filter((f) => {
    const headFile = headCommit.files.find((hf) => hf.name === f.name);
    return f.tracked && (!headFile || headFile.content !== f.content);
  });
}

function shortStatus(state: RepositoryState): string[] {
  const lines: string[] = [];
  const staged = stagedFiles(state);
  const modified = modifiedFiles(state);
  const untracked = untrackedFiles(state);

  for (const f of staged) {
    const isHeadFile = getHeadCommitId(state) && state.commits[getHeadCommitId(state)!]?.files.some((hf) => hf.name === f.name);
    lines.push(`${isHeadFile ? 'M' : 'A'}  ${f.name}`);
  }
  for (const f of modified) {
    if (!f.staged) lines.push(` M ${f.name}`);
  }
  for (const f of untracked) {
    lines.push(`?? ${f.name}`);
  }
  return lines;
}

export function executeCommand(
  prevState: RepositoryState,
  rawInput: string
): { result: CommandResult; newState: RepositoryState } {
  const input = rawInput.trim();
  const state = cloneState(prevState);

  if (!input) {
    return {
      result: { success: false, output: [''], stateChange: false, xpAwarded: 0 },
      newState: prevState,
    };
  }

  const parts = input.split(/\s+/);
  const args = parts.slice(1);

  if (parts[0] !== 'git' && parts[0] !== '.gitignore' && !parts[0].startsWith('echo')) {
    return {
      result: {
        success: false,
        output: [`bash: ${parts[0]}: command not found`, '', "Only git commands and .gitignore are supported in this terminal."],
        stateChange: false,
        xpAwarded: 0,
      },
      newState: prevState,
    };
  }

  // Handle .gitignore pseudo-command for adding patterns
  if (parts[0] === '.gitignore' || (parts[0] === 'echo' && args.includes('>>') && args.some((a) => a.includes('.gitignore')))) {
    return handleGitignore(state, input, args);
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'init':
      return handleInit(state, subArgs);
    case 'status':
      return handleStatus(state);
    case 'add':
      return handleAdd(state, subArgs);
    case 'commit':
      return handleCommit(state, subArgs, input);
    case 'log':
      return handleLog(state, subArgs);
    case 'diff':
      return handleDiff(state, subArgs);
    case 'branch':
      return handleBranch(state, subArgs);
    case 'switch':
    case 'checkout':
      return handleSwitch(state, subArgs);
    case 'merge':
      return handleMerge(state, subArgs);
    case 'clone':
      return handleClone(state, subArgs);
    case 'fetch':
      return handleFetch(state, subArgs);
    case 'pull':
      return handlePull(state, subArgs);
    case 'push':
      return handlePush(state, subArgs);
    case 'stash':
      return handleStash(state, subArgs);
    case 'restore':
      return handleRestore(state, subArgs);
    case 'revert':
      return handleRevert(state, subArgs);
    case 'reset':
      return handleReset(state, subArgs);
    case 'cherry-pick':
      return handleCherryPick(state, subArgs);
    case 'rebase':
      return handleRebase(state, subArgs);
    case 'reflog':
      return handleReflog(state);
    case 'remote':
      return handleRemote(state, subArgs);
    case 'ignore':
      return handleGitignore(state, input, subArgs);
    case 'resolve':
      return handleResolveConflict(state, subArgs);
    case 'issue':
      return handleIssue(state, subArgs, input);
    case 'pr':
      return handlePR(state, subArgs, input);
    default:
      return {
        result: {
          success: false,
          output: [`git: '${subcommand}' is not a git command. See 'git --help'.`, '', 'Supported commands: init, status, add, commit, log, diff, branch, switch, merge, clone, fetch, pull, push, stash, restore, revert, reset, cherry-pick, rebase, reflog, remote'],
          stateChange: false,
          xpAwarded: 0,
        },
        newState: prevState,
      };
  }
}

function handleInit(state: RepositoryState, _args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (state.initialized) {
    return {
      result: { success: false, output: ['Reinitialized existing Git repository'], stateChange: false, xpAwarded: 0 },
      newState: state,
    };
  }
  state.initialized = true;
  state.branches['main'] = { name: 'main', headCommitId: null, isRemote: false };
  state.currentBranch = 'main';
  return {
    result: {
      success: true,
      output: ['Initialized empty Git repository in /repository/.git/', '', 'The repository is now ready for your first commit!'],
      stateChange: true,
      xpAwarded: 5,
      concept: 'git init creates a new Git repository. It sets up the .git directory that tracks all changes.',
    },
    newState: state,
  };
}

function handleStatus(state: RepositoryState): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return {
      result: { success: false, output: ['fatal: not a git repository (or any of the parent directories): .git'], stateChange: false, xpAwarded: 0 },
      newState: state,
    };
  }
  const staged = stagedFiles(state);
  const modified = modifiedFiles(state);
  const untracked = untrackedFiles(state);
  const lines: string[] = [`On branch ${state.currentBranch}`];

  if (state.mergeInProgress) {
    lines.push('', 'You have unmerged paths.', '  (fix conflicts and run "git commit")');
  }

  lines.push('');
  if (staged.length === 0 && modified.length === 0 && untracked.length === 0) {
    lines.push('nothing to commit, working tree clean');
  } else {
    if (staged.length > 0) {
      lines.push('Changes to be committed:');
      lines.push('');
      for (const f of staged) {
        const head = getHeadCommitId(state);
        const isHeadFile = head && state.commits[head]?.files.some((hf) => hf.name === f.name);
        lines.push(`\t${isHeadFile ? 'modified:' : 'new file:'}   ${f.name}`);
      }
      lines.push('');
    }
    if (modified.length > 0) {
      const modifiedNotStaged = modified.filter((f) => !f.staged);
      if (modifiedNotStaged.length > 0) {
        lines.push('Changes not staged for commit:');
        lines.push('');
        for (const f of modifiedNotStaged) {
          lines.push(`\tmodified:   ${f.name}`);
        }
        lines.push('');
      }
    }
    if (untracked.length > 0) {
      lines.push('Untracked files:');
      lines.push('');
      for (const f of untracked) {
        lines.push(`\t${f.name}`);
      }
      lines.push('');
    }
  }

  if (state.conflicts.length > 0) {
    lines.push('Unmerged paths:');
    for (const c of state.conflicts) {
      if (!c.resolved) lines.push(`\tboth modified:   ${c.file}`);
    }
  }

  return {
    result: { success: true, output: lines, stateChange: false, xpAwarded: 2, concept: 'git status shows the current state of the working directory and staging area.' },
    newState: state,
  };
}

function handleAdd(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (args.length === 0) {
    return { result: { success: false, output: ['Nothing specified, nothing added.'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  let added = 0;
  for (const arg of args) {
    if (arg === '.') {
      for (const f of state.files) {
        if (f.ignored) continue;
        f.staged = true;
        if (!f.tracked) f.tracked = true;
        added++;
      }
    } else if (arg === '-A' || arg === '--all') {
      for (const f of state.files) {
        if (f.ignored) continue;
        f.staged = true;
        if (!f.tracked) f.tracked = true;
        added++;
      }
    } else {
      const file = state.files.find((f) => f.name === arg);
      if (file) {
        if (file.ignored) {
          return {
            result: { success: false, output: [`The following paths are ignored by .gitignore:`, arg], stateChange: false, xpAwarded: 0 },
            newState: state,
          };
        }
        file.staged = true;
        if (!file.tracked) file.tracked = true;
        added++;
      } else {
        return {
          result: { success: false, output: [`fatal: pathspec '${arg}' did not match any files`], stateChange: false, xpAwarded: 0 },
          newState: state,
        };
      }
    }
  }
  return {
    result: {
      success: true,
      output: added > 0 ? [`Added ${added} file(s) to staging area.`] : ['No files added.'],
      stateChange: true,
      xpAwarded: 3,
      concept: 'git add stages files for the next commit. Staging lets you choose exactly which changes to commit.',
    },
    newState: state,
  };
}

function handleCommit(state: RepositoryState, args: string[], rawInput: string): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const staged = stagedFiles(state);
  if (staged.length === 0) {
    return {
      result: { success: false, output: ['nothing to commit, working tree clean', '', 'Stage files first with: git add <file>'], stateChange: false, xpAwarded: 0 },
      newState: state,
    };
  }
  let message = '';
  const mIdx = args.indexOf('-m');
  if (mIdx !== -1) {
    // Re-extract message from raw input to handle multi-word quoted messages
    const rawAfterM = rawInput.split(/\s+-m\s+/)[1] || '';
    if (rawAfterM) {
      const match = rawAfterM.match(/^["'](.+?)["']$|^["'](.+)$|^(.+)$/);
      if (match) {
        message = match[1] ?? match[2] ?? match[3] ?? '';
        message = message.replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  if (!message) {
    return {
      result: { success: false, output: ['Aborting commit due to empty commit message.', '', 'Use: git commit -m "your message"'], stateChange: false, xpAwarded: 0 },
      newState: state,
    };
  }
  const parentId = getHeadCommitId(state);
  const commitId = generateCommitId();
  const commit: SimCommit = {
    id: commitId,
    message,
    parentIds: parentId ? [parentId] : [],
    branch: state.currentBranch,
    files: cloneFiles(staged),
    timestamp: Date.now(),
  };
  state.commits[commitId] = commit;
  if (state.branches[state.currentBranch]) {
    state.branches[state.currentBranch].headCommitId = commitId;
  }
  addReflog(state, `commit: ${message}`, commitId);

  // Clear staging
  state.files.forEach((f) => (f.staged = false));

  // If merge in progress and no conflicts, finalize merge
  if (state.mergeInProgress && state.conflicts.every((c) => c.resolved)) {
    state.mergeInProgress = false;
    state.mergeTarget = null;
    state.conflicts = [];
  }

  const fileCount = staged.length;
  return {
    result: {
      success: true,
      output: [`[${state.currentBranch} ${commitId}] ${message}`, ` ${fileCount} file(s) changed`],
      stateChange: true,
      xpAwarded: 8,
      concept: 'git commit saves a snapshot of your staged changes with a message describing what changed.',
    },
    newState: state,
  };
}

function handleLog(state: RepositoryState, _args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const head = getHeadCommitId(state);
  if (!head) {
    return { result: { success: false, output: ['fatal: your current branch does not have any commits yet'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const chain = getCommitChain(state, head);
  const lines: string[] = [];
  for (const commit of chain) {
    lines.push(`commit ${commit.id}`);
    lines.push(`Author: Git Quest Player <player@gitquest.dev>`);
    lines.push(`Date:   ${new Date(commit.timestamp).toLocaleString()}`);
    lines.push('');
    lines.push(`    ${commit.message}`);
    lines.push('');
  }
  return {
    result: { success: true, output: lines, stateChange: false, xpAwarded: 3, concept: 'git log shows the commit history of the current branch, most recent first.' },
    newState: state,
  };
}

function handleDiff(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const staged = args.includes('--cached') || args.includes('--staged');
  const compareFiles = staged ? stagedFiles(state) : modifiedFiles(state);
  const head = getHeadCommitId(state);
  const lines: string[] = [];
  for (const f of compareFiles) {
    const headFile = head ? state.commits[head]?.files.find((hf) => hf.name === f.name) : null;
    lines.push(`diff --git a/${f.name} b/${f.name}`);
    if (!headFile) {
      lines.push(`new file mode 100644`);
      lines.push(`--- /dev/null`);
      lines.push(`+++ b/${f.name}`);
      lines.push(`+${f.content}`);
    } else {
      lines.push(`--- a/${f.name}`);
      lines.push(`+++ b/${f.name}`);
      lines.push(`-${headFile.content}`);
      lines.push(`+${f.content}`);
    }
    lines.push('');
  }
  if (lines.length === 0) {
    lines.push('');
  }
  return {
    result: { success: true, output: lines, stateChange: false, xpAwarded: 3, concept: 'git diff shows the differences between your working directory and the last commit. Use --cached to see staged changes.' },
    newState: state,
  };
}

function handleBranch(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (args.length === 0 || (args.length === 1 && (args[0] === '-a' || args[0] === '--all' || args[0] === '-l' || args[0] === '--list'))) {
    const lines: string[] = [];
    const branchNames = Object.keys(state.branches).sort();
    for (const name of branchNames) {
      const b = state.branches[name];
      const prefix = name === state.currentBranch ? '* ' : '  ';
      const suffix = b.isRemote ? ` -> ${b.remoteName}/${name}` : '';
      lines.push(`${prefix}${name}${suffix}`);
    }
    if (state.mergeInProgress) {
      lines.push('', 'You are currently merging.');
    }
    return {
      result: { success: true, output: lines, stateChange: false, xpAwarded: 3, concept: 'git branch lists branches. The * marks your current branch.' },
      newState: state,
    };
  }
  if (args[0] === '-d' || args[0] === '--delete') {
    const branchName = args[1];
    if (!branchName || !state.branches[branchName]) {
      return { result: { success: false, output: [`error: branch '${branchName}' not found.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    if (branchName === state.currentBranch) {
      return { result: { success: false, output: [`error: Cannot delete the currently checked out branch '${branchName}'.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    delete state.branches[branchName];
    return { result: { success: true, output: [`Deleted branch ${branchName}.`], stateChange: true, xpAwarded: 3 }, newState: state };
  }
  const branchName = args[0];
  if (state.branches[branchName]) {
    return { result: { success: false, output: [`fatal: a branch named '${branchName}' already exists`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const headId = getHeadCommitId(state);
  state.branches[branchName] = { name: branchName, headCommitId: headId, isRemote: false };
  return {
    result: { success: true, output: [`Created branch '${branchName}' at ${headId ?? 'root'}.`], stateChange: true, xpAwarded: 5, concept: 'git branch <name> creates a new branch pointing at the current commit, but does not switch to it.' },
    newState: state,
  };
}

function handleSwitch(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const createFlag = args[0] === '-c' || args[0] === '-b';
  const branchName = createFlag ? args[1] : args[0];
  if (!branchName) {
    return { result: { success: false, output: ['Usage: git switch [-c] <branch>'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (createFlag) {
    if (state.branches[branchName]) {
      return { result: { success: false, output: [`fatal: a branch named '${branchName}' already exists`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    const headId = getHeadCommitId(state);
    state.branches[branchName] = { name: branchName, headCommitId: headId, isRemote: false };
  } else if (!state.branches[branchName]) {
    // Check remote tracking
    const remoteBranch = findRemoteBranch(state, branchName);
    if (remoteBranch) {
      state.branches[branchName] = { name: branchName, headCommitId: remoteBranch.commitId, isRemote: false };
    } else {
      return { result: { success: false, output: [`fatal: invalid reference: ${branchName}`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
  }
  state.currentBranch = branchName;
  // Restore files from branch head
  const headId = getHeadCommitId(state, branchName);
  if (headId && state.commits[headId]) {
    const headFiles = state.commits[headId].files;
    state.files = cloneFiles(headFiles);
  }
  return {
    result: { success: true, output: [`Switched to branch '${branchName}'`], stateChange: true, xpAwarded: 5, concept: 'git switch changes your current branch. Use -c to create a new branch and switch to it in one step.' },
    newState: state,
  };
}

function findRemoteBranch(state: RepositoryState, branchName: string): { commitId: string | null } | null {
  for (const remote of Object.values(state.remotes)) {
    if (remote.branches[branchName] !== undefined) {
      return { commitId: remote.branches[branchName] };
    }
  }
  return null;
}

function handleMerge(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const targetBranch = args[0];
  if (!targetBranch || !state.branches[targetBranch]) {
    return { result: { success: false, output: [`merge: ${targetBranch || 'branch'} - not something we can merge`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (targetBranch === state.currentBranch) {
    return { result: { success: false, output: ['Already up to date.'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const ourHead = getHeadCommitId(state);
  const theirHead = state.branches[targetBranch].headCommitId;
  if (!theirHead) {
    return { result: { success: false, output: ['Already up to date.'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const ourChain = new Set(getCommitChain(state, ourHead).map((c) => c.id));
  if (ourChain.has(theirHead)) {
    return { result: { success: true, output: ['Already up to date.'], stateChange: false, xpAwarded: 1 }, newState: state };
  }
  // Check for conflicts
  const theirCommit = state.commits[theirHead];
  const ourCommit = ourHead ? state.commits[ourHead] : null;
  const conflicts: MergeConflict[] = [];
  if (ourCommit) {
    const ourFileNames = new Set(ourCommit.files.map((f) => f.name));
    for (const theirFile of theirCommit.files) {
      const ourFile = ourCommit.files.find((f) => f.name === theirFile.name);
      if (ourFile && ourFile.content !== theirFile.content) {
        conflicts.push({
          file: theirFile.name,
          ours: ourFile.content,
          theirs: theirFile.content,
          resolved: false,
        });
      }
    }
    // Also check files in our commit not in theirs
    for (const ourFile of ourCommit.files) {
      if (!theirCommit.files.find((f) => f.name === ourFile.name)) {
        // File only in ours — no conflict
      }
    }
  }
  if (conflicts.length > 0) {
    state.mergeInProgress = true;
    state.mergeTarget = targetBranch;
    state.conflicts = conflicts;
    // Update working files with conflict markers
    for (const c of conflicts) {
      const file = state.files.find((f) => f.name === c.file);
      if (file) {
        file.content = `<<<<<<< HEAD\n${c.ours}\n=======\n${c.theirs}\n>>>>>>> ${targetBranch}`;
      }
    }
    return {
      result: {
        success: false,
        output: ['Auto-merging failed. Fix conflicts and then commit the result.', '', 'Conflicting files:']
          .concat(conflicts.map((c) => `  ${c.file}`))
          .concat(['', 'Edit the files to resolve conflicts, then: git add <file> && git commit']),
        stateChange: true,
        xpAwarded: 0,
        conflictCreated: true,
        concept: 'git merge combines another branch into your current branch. When both branches changed the same lines, Git cannot auto-merge and you must resolve the conflict manually.',
      },
      newState: state,
    };
  }
  // Fast-forward or create merge commit
  const mergeCommitId = generateCommitId();
  const mergedFiles = [...(ourCommit?.files || []), ...theirCommit.files.filter((tf) => !ourCommit?.files.find((of) => of.name === tf.name))];
  const mergeCommit: SimCommit = {
    id: mergeCommitId,
    message: `Merge branch '${targetBranch}'`,
    parentIds: [ourHead, theirHead].filter(Boolean) as string[],
    branch: state.currentBranch,
    files: mergedFiles,
    timestamp: Date.now(),
  };
  state.commits[mergeCommitId] = mergeCommit;
  state.branches[state.currentBranch].headCommitId = mergeCommitId;
  state.files = cloneFiles(mergedFiles);
  addReflog(state, `merge ${targetBranch}: ${mergeCommitId}`, mergeCommitId);
  return {
    result: {
      success: true,
      output: [`Merge made by the 'recursive' strategy.`, `${targetBranch} merged into ${state.currentBranch}.`],
      stateChange: true,
      xpAwarded: 10,
      concept: 'git merge integrates changes from another branch. When there are no conflicts, Git creates a merge commit automatically.',
    },
    newState: state,
  };
}

function handleClone(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  const url = args[0];
  if (!url) {
    return { result: { success: false, output: ['fatal: You must specify a repository to clone.'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  state.initialized = true;
  const remoteName = 'origin';
  const remoteUrl = url;
  const defaultBranch = 'main';
  // Create a simulated remote with one commit
  const remoteCommitId = generateCommitId();
  state.commits[remoteCommitId] = {
    id: remoteCommitId,
    message: 'Initial remote commit',
    parentIds: [],
    branch: defaultBranch,
    files: [createFile('README.md', '# Cloned Repository', true)],
    timestamp: Date.now() - 86400000,
  };
  state.remotes[remoteName] = {
    name: remoteName,
    url: remoteUrl,
    branches: { [defaultBranch]: remoteCommitId },
  };
  state.branches[defaultBranch] = { name: defaultBranch, headCommitId: remoteCommitId, isRemote: false };
  state.currentBranch = defaultBranch;
  state.files = [createFile('README.md', '# Cloned Repository', true)];
  addReflog(state, `clone: from ${url}`, remoteCommitId);
  return {
    result: {
      success: true,
      output: [`Cloning into '${url.split('/').pop()?.replace('.git', '') || 'repository'}'...`, `remote: Enumerating objects: 1, done.`, `remote: Counting objects: 100% (1/1), done.`, `Receiving objects: 100% (1/1), done.`, '', `Origin set to ${url}`],
      stateChange: true,
      xpAwarded: 8,
      concept: 'git clone downloads a copy of a remote repository and sets up a remote called "origin" that tracks it.',
    },
    newState: state,
  };
}

function handleFetch(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const remoteName = args[0] || 'origin';
  const remote = state.remotes[remoteName];
  if (!remote) {
    return { result: { success: false, output: [`fatal: '${remoteName}' does not appear to be a git repository`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  // Update remote tracking branches
  const updatedBranches: string[] = [];
  for (const [branchName, commitId] of Object.entries(remote.branches)) {
    const trackingName = `${remoteName}/${branchName}`;
    if (!state.branches[trackingName]) {
      state.branches[trackingName] = { name: trackingName, headCommitId: commitId, isRemote: true, remoteName };
    } else {
      state.branches[trackingName].headCommitId = commitId;
    }
    updatedBranches.push(trackingName);
  }
  return {
    result: {
      success: true,
      output: [`From ${remote.url}`, ...updatedBranches.map((b) => ` * [new branch]      ${b}`), '', 'Remote branches updated. Your local branch is unchanged.'],
      stateChange: true,
      xpAwarded: 6,
      concept: 'git fetch downloads updates from a remote but does NOT merge them into your working branch. You stay where you are.',
    },
    newState: state,
  };
}

function handlePull(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const remoteName = args[0] || 'origin';
  const remote = state.remotes[remoteName];
  if (!remote) {
    return { result: { success: false, output: [`fatal: '${remoteName}' does not appear to be a git repository`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const remoteCommitId = remote.branches[state.currentBranch];
  if (!remoteCommitId) {
    return { result: { success: false, output: [`fatal: couldn't find remote ref ${remoteName}/${state.currentBranch}`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const localHead = getHeadCommitId(state);
  if (localHead === remoteCommitId) {
    return { result: { success: true, output: ['Already up to date.'], stateChange: false, xpAwarded: 2 }, newState: state };
  }
  // Fetch + merge
  const trackingName = `${remoteName}/${state.currentBranch}`;
  state.branches[trackingName] = { name: trackingName, headCommitId: remoteCommitId, isRemote: true, remoteName };
  // Try fast-forward
  const ourChain = new Set(getCommitChain(state, localHead).map((c) => c.id));
  if (ourChain.has(remoteCommitId) || !localHead) {
    state.branches[state.currentBranch].headCommitId = remoteCommitId;
    const remoteCommit = state.commits[remoteCommitId];
    if (remoteCommit) state.files = cloneFiles(remoteCommit.files);
    addReflog(state, `pull: fast-forward`, remoteCommitId);
    return {
      result: { success: true, output: [`Updating ${localHead ?? 'root'}..${remoteCommitId}`, 'Fast-forward'], stateChange: true, xpAwarded: 8, concept: 'git pull = git fetch + git merge. It downloads remote changes AND merges them into your current branch in one step.' },
      newState: state,
    };
  }
  // Simulate merge — update head to remote
  state.branches[state.currentBranch].headCommitId = remoteCommitId;
  const remoteCommit = state.commits[remoteCommitId];
  if (remoteCommit) state.files = cloneFiles(remoteCommit.files);
  addReflog(state, `pull: merge`, remoteCommitId);
  return {
    result: { success: true, output: ['Merge made by recursive strategy.', 'Remote changes integrated.'], stateChange: true, xpAwarded: 8, concept: 'git pull fetches and merges. If the remote and local both have new commits, it creates a merge commit.' },
    newState: state,
  };
}

function handlePush(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const remoteName = args[0] || 'origin';
  const remote = state.remotes[remoteName];
  if (!remote) {
    return { result: { success: false, output: [`fatal: '${remoteName}' does not appear to be a git repository`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const localHead = getHeadCommitId(state);
  const remoteHead = remote.branches[state.currentBranch];
  // Check for rejected push (remote has commits we don't)
  if (remoteHead && localHead) {
    const remoteChain = new Set(getCommitChain(state, remoteHead).map((c) => c.id));
    if (!remoteChain.has(localHead)) {
      state.rejectedPush = true;
      state.pushRejectionBranch = state.currentBranch;
      return {
        result: {
          success: false,
          output: [`To ${remote.url}`, ` ! [rejected]          ${state.currentBranch} -> ${state.currentBranch} (fetch first)`, 'error: failed to push some refs', '', "hint: Updates were rejected because the remote contains work that you do not have locally. Try 'git pull' first."],
          stateChange: false,
          xpAwarded: 2,
          concept: 'git push fails if the remote has commits you do not have. You must pull (fetch + merge) first, then push again.',
        },
        newState: state,
      };
    }
  }
  remote.branches[state.currentBranch] = localHead;
  state.rejectedPush = false;
  state.pushRejectionBranch = null;
  return {
    result: {
      success: true,
      output: [`To ${remote.url}`, ` * [new branch]      ${state.currentBranch} -> ${state.currentBranch}`, '', 'Push successful!'],
      stateChange: true,
      xpAwarded: 8,
      concept: 'git push uploads your local commits to a remote repository so others can see and pull them.',
    },
    newState: state,
  };
}

function handleStash(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (args[0] === 'list') {
    if (state.stash.length === 0) {
      return { result: { success: true, output: ['No stash entries found.'], stateChange: false, xpAwarded: 2 }, newState: state };
    }
    return {
      result: { success: true, output: state.stash.map((s, i) => `stash@{${i}}: WIP on ${s.branch}: ${s.message}`), stateChange: false, xpAwarded: 2 },
      newState: state,
    };
  }
  if (args[0] === 'pop') {
    if (state.stash.length === 0) {
      return { result: { success: false, output: ['No stash entries to pop.'], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    const entry = state.stash.shift()!;
    for (const sf of entry.files) {
      const existing = state.files.find((f) => f.name === sf.name);
      if (existing) {
        existing.content = sf.content;
        existing.tracked = true;
      } else {
        state.files.push({ ...sf });
      }
    }
    return { result: { success: true, output: ['Stash popped. Changes restored to working directory.'], stateChange: true, xpAwarded: 6, concept: 'git stash pop restores the most recently stashed changes and removes them from the stash list.' }, newState: state };
  }
  if (args[0] === 'drop') {
    if (state.stash.length === 0) {
      return { result: { success: false, output: ['No stash entries to drop.'], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    state.stash.shift();
    return { result: { success: true, output: ['Dropped stash@{0}'], stateChange: true, xpAwarded: 3 }, newState: state };
  }
  // Default: stash push
  const mod = [...modifiedFiles(state), ...untrackedFiles(state)];
  if (mod.length === 0) {
    return { result: { success: false, output: ['No local changes to save'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  state.stash.unshift({
    files: cloneFiles(mod),
    branch: state.currentBranch,
    message: 'WIP saved',
  });
  // Clear working changes
  const head = getHeadCommitId(state);
  if (head && state.commits[head]) {
    state.files = cloneFiles(state.commits[head].files);
  } else {
    state.files = [];
  }
  return {
    result: { success: true, output: [`Saved working directory and index state WIP on ${state.currentBranch}`], stateChange: true, xpAwarded: 6, concept: 'git stash temporarily shelves your uncommitted changes so you can work on something else and come back to them later.' },
    newState: state,
  };
}

function handleRestore(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const staged = args.includes('--staged');
  const fileNames = args.filter((a) => !a.startsWith('--'));
  if (fileNames.length === 0) {
    return { result: { success: false, output: ['fatal: you must specify a file to restore'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  for (const fileName of fileNames) {
    const file = state.files.find((f) => f.name === fileName);
    if (!file) {
      return { result: { success: false, output: [`fatal: pathspec '${fileName}' did not match any files`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    const head = getHeadCommitId(state);
    const headFile = head ? state.commits[head]?.files.find((hf) => hf.name === fileName) : null;
    if (staged) {
      // Unstage
      file.staged = false;
      file.tracked = headFile ? true : false;
    } else {
      // Restore working directory from HEAD
      if (headFile) {
        file.content = headFile.content;
        file.tracked = true;
      }
      file.staged = false;
    }
  }
  return {
    result: { success: true, output: [`Restored ${fileNames.length} file(s).`], stateChange: true, xpAwarded: 5, concept: staged ? 'git restore --staged unstages a file without discarding its content changes.' : 'git restore discards working directory changes, bringing a file back to its last committed state.' },
    newState: state,
  };
}

function handleRevert(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const commitRef = args[0];
  if (!commitRef) {
    return { result: { success: false, output: ['Usage: git revert <commit>'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const targetCommit = state.commits[commitRef];
  if (!targetCommit) {
    return { result: { success: false, output: [`fatal: bad revision '${commitRef}'`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const headId = getHeadCommitId(state);
  const revertId = generateCommitId();
  const revertCommit: SimCommit = {
    id: revertId,
    message: `Revert "${targetCommit.message}"`,
    parentIds: headId ? [headId] : [],
    branch: state.currentBranch,
    files: cloneFiles(targetCommit.parentIds[0] ? (state.commits[targetCommit.parentIds[0]]?.files || []) : []),
    timestamp: Date.now(),
  };
  state.commits[revertId] = revertCommit;
  state.branches[state.currentBranch].headCommitId = revertId;
  state.files = cloneFiles(revertCommit.files);
  addReflog(state, `revert ${commitRef}: ${revertId}`, revertId);
  return {
    result: { success: true, output: [`[${state.currentBranch} ${revertId}] Revert "${targetCommit.message}"`, 'This creates a new commit that undoes the changes.'], stateChange: true, xpAwarded: 10, concept: 'git revert creates a NEW commit that undoes a previous commit. It is safe for shared branches because it preserves history.' },
    newState: state,
  };
}

function handleReset(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const mode = args[0]?.startsWith('--') ? args[0] : '--mixed';
  const commitRef = args.find((a) => !a.startsWith('--'));
  const targetCommitId = commitRef ? (state.commits[commitRef]?.id ?? null) : null;
  if (commitRef && !targetCommitId) {
    return { result: { success: false, output: [`fatal: ambiguous argument '${commitRef}': unknown revision`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const headId = getHeadCommitId(state);
  // For this simulation, reset moves the branch pointer
  if (targetCommitId) {
    state.branches[state.currentBranch].headCommitId = targetCommitId;
    addReflog(state, `reset ${mode} to ${targetCommitId}`, targetCommitId);
  } else {
    // Reset to HEAD — unstage everything
    state.files.forEach((f) => (f.staged = false));
    return { result: { success: true, output: ['Reset staging area. Working directory unchanged.'], stateChange: true, xpAwarded: 4, concept: 'git reset without a commit ref unstages all files but keeps your changes in the working directory.' }, newState: state };
  }
  if (mode === '--hard') {
    const targetCommit = state.commits[targetCommitId];
    state.files = cloneFiles(targetCommit.files);
  } else if (mode === '--soft') {
    // Keep working dir and staging as-is
  } else {
    // --mixed: unstage but keep working dir changes
    state.files.forEach((f) => (f.staged = false));
  }
  return {
    result: { success: true, output: [`HEAD is now at ${targetCommitId} ${state.commits[targetCommitId].message}`], stateChange: true, xpAwarded: 8, concept: `git reset ${mode} moves the branch pointer to the specified commit. --soft keeps all changes staged, --mixed unstages but keeps working dir, --hard discards everything.` },
    newState: state,
  };
}

function handleCherryPick(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const commitRef = args[0];
  if (!commitRef) {
    return { result: { success: false, output: ['Usage: git cherry-pick <commit>'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const targetCommit = state.commits[commitRef];
  if (!targetCommit) {
    return { result: { success: false, output: [`fatal: bad revision '${commitRef}'`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const headId = getHeadCommitId(state);
  const newId = generateCommitId();
  const cherryPickCommit: SimCommit = {
    id: newId,
    message: targetCommit.message,
    parentIds: headId ? [headId] : [],
    branch: state.currentBranch,
    files: cloneFiles(targetCommit.files),
    timestamp: Date.now(),
  };
  state.commits[newId] = cherryPickCommit;
  state.branches[state.currentBranch].headCommitId = newId;
  state.files = cloneFiles(targetCommit.files);
  addReflog(state, `cherry-pick ${commitRef}: ${newId}`, newId);
  return {
    result: { success: true, output: [`[${state.currentBranch} ${newId}] ${targetCommit.message}`, `Cherry-picked commit ${commitRef} onto ${state.currentBranch}.`], stateChange: true, xpAwarded: 10, concept: 'git cherry-pick applies a single commit from another branch onto your current branch, without merging the entire branch.' },
    newState: state,
  };
}

function handleRebase(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const targetBranch = args[0];
  if (!targetBranch || !state.branches[targetBranch]) {
    return { result: { success: false, output: [`fatal: invalid upstream '${targetBranch}'`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const ourHead = getHeadCommitId(state);
  const theirHead = state.branches[targetBranch].headCommitId;
  if (!ourHead || !theirHead) {
    return { result: { success: false, output: ['Nothing to rebase.'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  // Simulate: replay our commits on top of theirs
  const ourChain = getCommitChain(state, ourHead);
  const theirChain = new Set(getCommitChain(state, theirHead).map((c) => c.id));
  const commitsToReplay = ourChain.filter((c) => !theirChain.has(c.id)).reverse();
  let currentHead = theirHead;
  for (const oldCommit of commitsToReplay) {
    const newId = generateCommitId();
    state.commits[newId] = {
      ...oldCommit,
      id: newId,
      parentIds: [currentHead],
      timestamp: Date.now(),
    };
    currentHead = newId;
    addReflog(state, `rebase: ${newId}`, newId);
  }
  state.branches[state.currentBranch].headCommitId = currentHead;
  if (state.commits[currentHead]) {
    state.files = cloneFiles(state.commits[currentHead].files);
  }
  return {
    result: { success: true, output: [`Successfully rebased and updated refs/heads/${state.currentBranch}.`, '', 'Your commits have been replayed on top of the target branch, creating a clean linear history.'], stateChange: true, xpAwarded: 12, concept: 'git rebase moves your commits on top of another branch, creating a linear history without merge commits. It rewrites commit hashes.' },
    newState: state,
  };
}

function handleReflog(state: RepositoryState): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (state.reflog.length === 0) {
    return { result: { success: true, output: ['No reflog entries.'], stateChange: false, xpAwarded: 2 }, newState: state };
  }
  const lines = state.reflog.map((entry, i) => `${entry.commitId} HEAD@{${i}}: ${entry.action}`);
  return {
    result: { success: true, output: lines, stateChange: false, xpAwarded: 8, concept: 'git reflog records every change to HEAD. Even after a reset or rebase, you can find old commits here to recover them.' },
    newState: state,
  };
}

function handleRemote(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (args[0] === '-v' || args.length === 0) {
    const lines: string[] = [];
    for (const remote of Object.values(state.remotes)) {
      lines.push(`${remote.name}\t${remote.url} (fetch)`);
      lines.push(`${remote.name}\t${remote.url} (push)`);
    }
    if (lines.length === 0) lines.push('No remotes configured.');
    return { result: { success: true, output: lines, stateChange: false, xpAwarded: 3 }, newState: state };
  }
  if (args[0] === 'add') {
    const name = args[1];
    const url = args[2];
    if (!name || !url) {
      return { result: { success: false, output: ['Usage: git remote add <name> <url>'], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    state.remotes[name] = { name, url, branches: {} };
    return { result: { success: true, output: [`Added remote '${name}'`], stateChange: true, xpAwarded: 4 }, newState: state };
  }
  return { result: { success: false, output: ['Unsupported remote subcommand.'], stateChange: false, xpAwarded: 0 }, newState: state };
}

function handleGitignore(state: RepositoryState, _input: string, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  // Accept: git ignore <pattern> or .gitignore <pattern>
  const pattern = args.find((a) => !a.startsWith('-') && a !== '>>' && a !== '.gitignore');
  if (!pattern) {
    // Show current
    if (state.gitignore.length === 0) {
      return { result: { success: true, output: ['.gitignore is empty. Add patterns with: git ignore <pattern>'], stateChange: false, xpAwarded: 1 }, newState: state };
    }
    return { result: { success: true, output: ['.gitignore contents:', ...state.gitignore], stateChange: false, xpAwarded: 1 }, newState: state };
  }
  if (state.gitignore.includes(pattern)) {
    return { result: { success: false, output: [`Pattern '${pattern}' already in .gitignore`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  state.gitignore.push(pattern);
  // Apply to files
  for (const f of state.files) {
    if (isIgnored(f.name, state.gitignore)) {
      f.ignored = true;
      f.staged = false;
      f.tracked = false;
    }
  }
  // Ensure .gitignore file exists in repo
  let gitignoreFile = state.files.find((f) => f.name === '.gitignore');
  if (!gitignoreFile) {
    gitignoreFile = createFile('.gitignore', state.gitignore.join('\n'), true);
    state.files.push(gitignoreFile);
  } else {
    gitignoreFile.content = state.gitignore.join('\n');
  }
  return {
    result: { success: true, output: [`Added '${pattern}' to .gitignore`, 'Matching files will no longer appear as untracked.'], stateChange: true, xpAwarded: 6, concept: '.gitignore tells Git which files to ignore. Ignored files do not appear in git status or get tracked.' },
    newState: state,
  };
}

function handleResolveConflict(state: RepositoryState, args: string[]): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (state.conflicts.length === 0) {
    return { result: { success: false, output: ['No conflicts to resolve.'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const fileName = args[0];
  const resolution = args[1];
  if (!fileName || !resolution) {
    return { result: { success: false, output: ['Usage: git resolve <file> <ours|theirs|manual>'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  const conflict = state.conflicts.find((c) => c.file === fileName);
  if (!conflict) {
    return { result: { success: false, output: [`No conflict found for file '${fileName}'`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (resolution !== 'ours' && resolution !== 'theirs' && resolution !== 'manual') {
    return { result: { success: false, output: [`Invalid resolution. Use: ours, theirs, or manual`], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  conflict.resolved = true;
  conflict.resolution = resolution as 'ours' | 'theirs' | 'manual';
  const file = state.files.find((f) => f.name === fileName);
  if (file) {
    if (resolution === 'ours') {
      file.content = conflict.ours;
    } else if (resolution === 'theirs') {
      file.content = conflict.theirs;
    } else {
      file.content = `${conflict.ours}\n${conflict.theirs}`;
    }
    file.tracked = true;
  }
  return {
    result: {
      success: true,
      output: [`Resolved conflict in ${fileName} using ${resolution}.`, '', 'Now stage the file with: git add ' + fileName, 'Then commit with: git commit -m "Resolve conflict"'],
      stateChange: true,
      xpAwarded: 10,
      concept: 'Resolving a conflict means choosing which version to keep (ours, theirs, or a manual combination), then removing conflict markers and staging the result.',
    },
    newState: state,
  };
}

function handleIssue(state: RepositoryState, args: string[], rawInput: string): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (args[0] === 'create') {
    let title = '';
    const match = rawInput.match(/create\s+["'](.+?)["']/);
    if (match) {
      title = match[1];
    } else {
      title = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
    }
    if (!title) {
      return { result: { success: false, output: ['Usage: git issue create "Issue title"'], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    const issueId = state.issues.length > 0 ? Math.max(...state.issues.map((i) => i.id)) + 1 : 1;
    state.issues.push({ id: issueId, title, body: '', state: 'open', author: 'player' });
    return {
      result: { success: true, output: [`Created issue #${issueId}: ${title}`, '', 'Issues are a GitHub feature for tracking bugs and tasks — not a Git command.'], stateChange: true, xpAwarded: 10, concept: 'Issues track bugs and feature requests on GitHub. They are part of GitHub, not Git itself.' },
      newState: state,
    };
  }
  if (args[0] === 'list') {
    if (state.issues.length === 0) {
      return { result: { success: true, output: ['No issues found.'], stateChange: false, xpAwarded: 2 }, newState: state };
    }
    return {
      result: { success: true, output: state.issues.map((i) => `#${i.id} [${i.state}] ${i.title}`), stateChange: false, xpAwarded: 2 },
      newState: state,
    };
  }
  if (args[0] === 'close') {
    const id = parseInt(args[1] || '');
    const issue = state.issues.find((i) => i.id === id);
    if (!issue) {
      return { result: { success: false, output: [`Issue #${id} not found.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    issue.state = 'closed';
    return { result: { success: true, output: [`Closed issue #${id}`], stateChange: true, xpAwarded: 5 }, newState: state };
  }
  return { result: { success: false, output: ['Usage: git issue create|list|close'], stateChange: false, xpAwarded: 0 }, newState: state };
}

function handlePR(state: RepositoryState, args: string[], rawInput: string): { result: CommandResult; newState: RepositoryState } {
  if (!state.initialized) {
    return { result: { success: false, output: ['fatal: not a git repository'], stateChange: false, xpAwarded: 0 }, newState: state };
  }
  if (args[0] === 'create') {
    // git pr create "title" sourceBranch targetBranch
    let title = '';
    const titleMatch = rawInput.match(/create\s+["'](.+?)["']/);
    if (titleMatch) {
      title = titleMatch[1];
    } else {
      title = args[1]?.replace(/^["']|["']$/g, '') || '';
    }
    // Extract branch names that come after the quoted title
    const afterTitle = rawInput.split(/["'].*?["']/)[1] || '';
    const branchArgs = afterTitle.trim().split(/\s+/).filter(Boolean);
    const sourceBranch = branchArgs[0] || state.currentBranch;
    const targetBranch = branchArgs[1] || 'main';
    if (!title) {
      return { result: { success: false, output: ['Usage: git pr create "PR title" <source> <target>'], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    if (!state.branches[sourceBranch]) {
      return { result: { success: false, output: [`Source branch '${sourceBranch}' not found.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    if (!state.branches[targetBranch]) {
      return { result: { success: false, output: [`Target branch '${targetBranch}' not found.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    const prId = state.pullRequests.length > 0 ? Math.max(...state.pullRequests.map((p) => p.id)) + 1 : 1;
    state.pullRequests.push({
      id: prId,
      title,
      body: '',
      sourceBranch,
      targetBranch,
      state: 'open',
      author: 'player',
      reviews: [],
    });
    return {
      result: { success: true, output: [`Created pull request #${prId}: ${title}`, `  ${sourceBranch} -> ${targetBranch}`, '', 'Pull requests are a GitHub feature for proposing and reviewing changes — not a Git command.'], stateChange: true, xpAwarded: 15, concept: 'A pull request asks team members to review your branch before merging it. It is a GitHub feature, not a Git command.' },
      newState: state,
    };
  }
  if (args[0] === 'list') {
    if (state.pullRequests.length === 0) {
      return { result: { success: true, output: ['No pull requests found.'], stateChange: false, xpAwarded: 2 }, newState: state };
    }
    return {
      result: { success: true, output: state.pullRequests.map((p) => `#${p.id} [${p.state}] ${p.title} (${p.sourceBranch} -> ${p.targetBranch})`), stateChange: false, xpAwarded: 2 },
      newState: state,
    };
  }
  if (args[0] === 'merge') {
    const id = parseInt(args[1] || '');
    const pr = state.pullRequests.find((p) => p.id === id);
    if (!pr) {
      return { result: { success: false, output: [`Pull request #${id} not found.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    if (pr.state !== 'open') {
      return { result: { success: false, output: [`Pull request #${id} is already ${pr.state}.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    pr.state = 'merged';
    // Merge the source branch into target
    const sourceHead = state.branches[pr.sourceBranch]?.headCommitId;
    if (sourceHead && state.branches[pr.targetBranch]) {
      state.branches[pr.targetBranch].headCommitId = sourceHead;
    }
    return {
      result: { success: true, output: [`Merged pull request #${id}: ${pr.title}`, `${pr.sourceBranch} has been merged into ${pr.targetBranch}.`], stateChange: true, xpAwarded: 20, concept: 'Merging a pull request integrates the reviewed changes into the target branch, typically main.' },
      newState: state,
    };
  }
  if (args[0] === 'review') {
    const id = parseInt(args[1] || '');
    const status = args[2] as 'approved' | 'changes_requested' | 'commented';
    const pr = state.pullRequests.find((p) => p.id === id);
    if (!pr) {
      return { result: { success: false, output: [`Pull request #${id} not found.`], stateChange: false, xpAwarded: 0 }, newState: state };
    }
    const reviewId = pr.reviews.length > 0 ? Math.max(...pr.reviews.map((r) => r.id)) + 1 : 1;
    pr.reviews.push({ id: reviewId, author: 'reviewer', body: status === 'approved' ? 'Looks good!' : 'Please fix issues.', status });
    return {
      result: { success: true, output: [`Added review to PR #${id}: ${status}`], stateChange: true, xpAwarded: 5 },
      newState: state,
    };
  }
  return { result: { success: false, output: ['Usage: git pr create|list|merge|review'], stateChange: false, xpAwarded: 0 }, newState: state };
}
