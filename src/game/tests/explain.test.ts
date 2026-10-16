import { describe, it, expect } from 'vitest';
import { explainFailure } from '../engine/explain';
import { createInitialRepoState, executeCommand } from '../simulator/GitSimulator';

const repo = createInitialRepoState();

describe('explainFailure', () => {
  it('tells beginners what to do when there is no repository', () => {
    const r = executeCommand(repo, 'git add .');
    expect(r.result.success).toBe(false);
    expect(explainFailure('git add .', r.result.output, repo)).toMatch(/git init/);
  });

  it('points at the spelling for an unknown git sub-command', () => {
    const r = executeCommand(repo, 'git stauts');
    expect(explainFailure('git stauts', r.result.output, repo)).toMatch(/spelling|help/i);
  });

  it('explains that non-git input is not a command', () => {
    expect(explainFailure('ls', ['bash: ls'], repo)).toMatch(/start with "git"/);
  });

  it('asks for a message when a commit has none', () => {
    expect(explainFailure('git commit', ['something failed'], repo)).toMatch(/-m/);
  });

  it('always gives some guidance', () => {
    expect(explainFailure('git whatever', ['??'], repo)).toBeTruthy();
  });
});
