import type { RepositoryState } from '../types';

/**
 * Turn a failed command into a plain-language "why, and what to do". Built from the simulator's real error
 * messages, so a beginner learns from a mistake instead of just losing health. Returns null when there is
 * nothing useful to add.
 */
export function explainFailure(input: string, output: string[], repo: RepositoryState): string | null {
  const text = output.join(' ').toLowerCase();
  const cmd = input.trim().toLowerCase();
  const has = (s: string) => text.includes(s);

  if (!cmd.startsWith('git')) return 'That is not a Git command. Git commands start with "git", like `git status`. Type `help` to see them all.';
  if (has('is not a git command')) return 'Git does not know that sub-command. Check the spelling, or type `help` for the list.';
  if (has('not a git repository')) return 'There is no repository here yet. Create one first with `git init`.';
  if (has('does not have any commits yet')) return 'Make your first commit before doing this: `git add .` and then `git commit -m "your message"`.';
  if (has('pathspec')) return 'Git cannot find that file. Run `git status` to see the exact file names.';
  if (has('failed to push some refs')) return 'The remote has changes you do not have yet. Run `git pull`, then `git push` again.';
  if (has('cannot delete the currently checked out branch')) return 'You are standing on that branch. Switch to another one first (`git switch <name>`), then delete it.';
  if (has('a branch named')) return 'That branch name is already taken. Pick a new name, or move to it with `git switch <name>`.';
  if (has('invalid reference') || has('bad revision') || has('ambiguous argument') || has('invalid upstream')) {
    return 'Git does not recognise that name. Check `git branch` or `git log --oneline` for the names that exist.';
  }
  if (has('must specify a repository to clone')) return 'Add the repository address after the command: `git clone <url>`.';
  if (has('must specify a file to restore')) return 'Say which file to restore: `git restore <file>`.';
  if (/^git\s+commit\b/.test(cmd) && !/\s-m\b/.test(cmd)) return 'A commit needs a message: `git commit -m "describe your change"`.';
  if (repo.mergeInProgress || repo.conflicts.some((c) => !c.resolved)) return 'You are in the middle of a merge. Resolve the conflicts first, then commit.';
  return 'That did not work. Type `hint` for a nudge, or `help` to see the commands.';
}
