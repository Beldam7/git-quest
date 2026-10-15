import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { ArrowLeft, Trophy, Settings as SettingsIcon, Save, Heart, Star, Zap, Sparkles, Lightbulb, Swords } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameTerminal } from './Terminal';
import { SceneBoundary } from './ui/SceneBoundary';
import { WORLDS, secretMissions } from '../data/worlds';
import { ABILITIES, getXpForNextLevel } from '../data/ranks';
import type { WorldChallenge } from '../types';

// Three.js is loaded on demand so the menu stays light.
const QuestStage = lazy(() => import('./QuestStage').then((m) => ({ default: m.QuestStage })));

function findChallenge(challengeId: string): { challenge: WorldChallenge; worldId: number } | null {
  for (const world of WORLDS) {
    const c = world.challenges.find((c) => c.id === challengeId);
    if (c) return { challenge: c, worldId: world.id };
  }
  const sm = secretMissions.find((c) => c.id === challengeId);
  if (sm) return { challenge: sm, worldId: 0 };
  return null;
}

export function GameScreen() {
  const { progress, repoState, terminalHistory, processCommand, setScreen, engine, startChallenge, saveProgress, appearance } = useGame() as any;
  const [showTerminal, setShowTerminal] = useState(true);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);

  const challengeId = engine?.getCurrentChallengeId() ?? null;
  const challengeInfo = challengeId ? findChallenge(challengeId) : null;
  const currentWorld = WORLDS.find((w) => w.id === (engine?.getCurrentWorldId() ?? 1));
  // Derived before the effects that depend on it (must not be declared after an early return).
  const chProgress = challengeId && progress ? progress.challengeProgress[challengeId] : null;
  const objectivesCompleted = chProgress?.objectivesCompleted ?? [];
  const allObjectivesDone = !!challengeInfo && objectivesCompleted.length === challengeInfo.challenge.objectives.length;
  const [questComplete, setQuestComplete] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const prevLevel = useRef(progress?.level ?? 1);

  useEffect(() => {
    if (progress && progress.level > prevLevel.current) {
      setLevelUp(true);
      const t = setTimeout(() => setLevelUp(false), 2500);
      prevLevel.current = progress.level;
      return () => clearTimeout(t);
    }
    prevLevel.current = progress?.level ?? 1;
  }, [progress?.level]);

  useEffect(() => {
    if (allObjectivesDone && challengeInfo) {
      setQuestComplete(true);
      const t = setTimeout(() => setQuestComplete(false), 3000);
      return () => clearTimeout(t);
    }
  }, [allObjectivesDone]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT') return;
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const resumeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!paused) return;
    resumeRef.current?.focus();
    // Keep Tab inside the pause dialog while it is open.
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', trap);
    return () => window.removeEventListener('keydown', trap);
  }, [paused]);

  const handleSave = async () => {
    setSaving(true);
    await saveProgress();
    setTimeout(() => setSaving(false), 500);
  };

  if (!progress) return null;

  const xpInfo = getXpForNextLevel(progress.totalXp);
  const healthPercent = (progress.health / progress.maxHealth) * 100;

  // Find next challenge
  let nextChallenge: WorldChallenge | null = null;
  if (challengeInfo && currentWorld) {
    const idx = currentWorld.challenges.findIndex((c) => c.id === challengeId);
    nextChallenge = currentWorld.challenges[idx + 1] ?? null;
  }

  const unlockedAbilities = ABILITIES.filter((a) => progress.unlockedAbilities.includes(a.id));

  const bossName = challengeInfo?.challenge.bossName ?? (challengeInfo?.challenge.isBoss ? currentWorld?.bossName : undefined);
  const isBoss = !!challengeInfo?.challenge.isBoss;
  const unresolvedConflicts = repoState ? repoState.conflicts.filter((c: { resolved: boolean }) => !c.resolved).length : 0;

  return (
    <div className="h-dvh flex flex-col bg-kq-night text-kq-text overflow-hidden">
      {/* Top HUD */}
      <header className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-kq-ink border-b border-kq-edge z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" aria-label="Back to world map">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Map</span>
          </button>
          {currentWorld && (
            <div className="hidden sm:block text-sm truncate">
              <span className="text-kq-muted">World {currentWorld.id}: </span>
              <span className="font-display" style={{ color: currentWorld.accentColor }}>{currentWorld.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`flex items-center gap-2 ${progress.health < progress.maxHealth * 0.3 ? 'animate-shake' : ''}`}>
            <Heart size={15} className="text-kq-ruby" fill="currentColor" aria-hidden="true" />
            <div
              role="progressbar" aria-label="Health" aria-valuemin={0} aria-valuemax={progress.maxHealth} aria-valuenow={progress.health}
              className="w-16 sm:w-24 h-2.5 bg-gray-800 rounded-full overflow-hidden"
            >
              <div className="h-full bg-gradient-to-r from-[#c93247] to-kq-ruby rounded-full transition-all duration-500" style={{ width: `${healthPercent}%` }} />
            </div>
            <span className="text-sm text-kq-muted tabular-nums">{progress.health}/{progress.maxHealth}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Zap size={15} className="text-kq-gold" fill="currentColor" aria-hidden="true" />
            <div
              role="progressbar" aria-label="Experience toward next level" aria-valuemin={0} aria-valuemax={xpInfo.needed} aria-valuenow={xpInfo.current}
              className="w-24 md:w-32 h-2.5 bg-gray-800 rounded-full overflow-hidden"
            >
              <div className="h-full bg-gradient-to-r from-[#d9962a] to-kq-gold rounded-full transition-all duration-500" style={{ width: `${(xpInfo.current / xpInfo.needed) * 100}%` }} />
            </div>
            <span className="text-sm text-kq-muted tabular-nums">{progress.totalXp} XP</span>
          </div>
          <div className="hidden lg:block font-display text-sm text-kq-gold">{progress.rank}</div>
          <button onClick={handleSave} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" aria-live="polite">
            <Save size={14} className={saving ? 'text-kq-emerald' : 'text-kq-muted'} aria-hidden="true" />
            {saving ? 'Saved!' : 'Save'}
          </button>
          <button onClick={() => setPaused(true)} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm">Pause</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {/* Quest tracker */}
        {challengeInfo && (
          <section aria-label="Current quest" className="px-4 py-3 bg-kq-deep/95 border-b border-kq-edge border-l-4 border-l-kq-gold max-h-[34vh] overflow-y-auto animate-fade-in-down">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-kq-text flex items-center gap-2">
                  {isBoss && <Swords size={18} className="text-kq-violet" aria-label="Boss quest" />}
                  {challengeInfo.challenge.title}
                </h2>
                <p className="text-base text-kq-muted mb-2">{challengeInfo.challenge.description}</p>
                <ul className="space-y-1">
                  {challengeInfo.challenge.objectives.map((obj) => {
                    const done = objectivesCompleted.includes(obj.id);
                    return (
                      <li key={obj.id} className="flex items-center gap-2 text-base">
                        <span className={done ? 'text-kq-emerald animate-bounce-in' : 'text-kq-muted'} aria-hidden="true">{done ? '✓' : '○'}</span>
                        <span className={done ? 'text-kq-emerald line-through' : 'text-kq-text'}>
                          <span className="sr-only">{done ? 'Done: ' : 'To do: '}</span>
                          {obj.description}
                        </span>
                        <span className="text-kq-gold text-sm">+{obj.xpReward} XP</span>
                      </li>
                    );
                  })}
                </ul>
                {!allObjectivesDone && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button onClick={() => processCommand('hint')} className="kq-btn kq-btn-ghost !min-h-[36px] !py-1 text-sm">
                      <Lightbulb size={14} className="text-kq-gold" aria-hidden="true" /> Need a hint?
                    </button>
                    <span className="text-sm text-kq-muted">Optional. Using a hint skips the no-hints bonus.</span>
                  </div>
                )}
              </div>
              {allObjectivesDone && (
                <div className="flex flex-col gap-2 shrink-0 animate-celebrate" role="status">
                  <div className="text-kq-emerald text-base font-bold text-center">Quest complete!</div>
                  {nextChallenge ? (
                    <button onClick={() => startChallenge(nextChallenge.id)} className="kq-btn kq-btn-gold whitespace-nowrap">Next quest →</button>
                  ) : (
                    <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-primary whitespace-nowrap">Back to the map →</button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3D stage */}
        <div className="flex-1 relative min-h-[140px] bg-gradient-to-b from-kq-night to-kq-panel">
          <SceneBoundary
            fallback={
              <div className="absolute inset-0 grid place-items-center text-center px-6 text-kq-muted">
                3D view isn&apos;t available on this device. You can still play with the terminal below.
              </div>
            }
          >
            <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-kq-muted" role="status">Preparing the quest stage…</div>}>
              <QuestStage accent={currentWorld?.accentColor ?? '#3dd6f5'} isBoss={isBoss} bossName={bossName} appearance={appearance} />
            </Suspense>
          </SceneBoundary>

          {isBoss && bossName && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 kq-panel px-4 py-1.5 border-kq-violet/60 text-center">
              <span className="font-display text-kq-violet">Boss: {bossName}</span>
            </div>
          )}

          {repoState && (
            <div className="absolute top-3 left-3 kq-panel px-3 py-2 text-sm font-mono max-w-[60%]">
              <div className="text-kq-muted mb-0.5">Repository</div>
              <div>Branch: <span className="text-kq-cyan">{repoState.currentBranch}</span></div>
              <div>Initialized: <span className={repoState.initialized ? 'text-kq-emerald' : 'text-kq-ruby'}>{repoState.initialized ? 'yes' : 'no'}</span></div>
              {repoState.mergeInProgress && <div className="text-kq-gold">⚠ Merge in progress</div>}
              {unresolvedConflicts > 0 && <div className="text-kq-ruby">Conflicts: {unresolvedConflicts}</div>}
            </div>
          )}

          {unlockedAbilities.length > 0 && (
            <ul className="absolute top-3 right-3 hidden md:flex flex-col gap-1.5" aria-label="Unlocked abilities">
              {unlockedAbilities.slice(0, 4).map((ability) => (
                <li key={ability.id} className="kq-panel flex items-center gap-2 px-2.5 py-1.5 text-sm" title={ability.description}>
                  <Star size={12} className="text-kq-gold" aria-hidden="true" />
                  <span>{ability.name}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 kq-btn kq-btn-ghost !min-h-[38px] !py-1 text-sm"
            aria-expanded={showTerminal}
          >
            {showTerminal ? 'Hide terminal' : 'Show terminal'}
          </button>
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div className="h-[40vh] min-h-[200px] max-h-80 shrink-0">
            <GameTerminal history={terminalHistory} onCommand={processCommand} isActive={!paused} />
          </div>
        )}
      </main>

      {/* Level-up / quest-complete feedback */}
      {levelUp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none" role="status">
          <div className="text-center animate-bounce-in">
            <div className="kq-gold-text font-display text-5xl sm:text-6xl font-bold mb-2">LEVEL UP!</div>
            <div className="text-kq-gold text-xl flex items-center justify-center gap-2">
              <Sparkles size={20} className="animate-spin-slow" aria-hidden="true" /> Level {progress.level}
              <Sparkles size={20} className="animate-spin-slow" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}
      {questComplete && !levelUp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none" role="status">
          <div className="text-center animate-celebrate">
            <div className="text-4xl sm:text-5xl font-display font-bold text-kq-emerald mb-1 [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">Quest complete!</div>
            <div className="text-kq-text text-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">Well done. Rewards added.</div>
          </div>
        </div>
      )}

      {/* Pause dialog */}
      {paused && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center animate-fade-in">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pause-title" className="kq-panel p-7 max-w-sm w-full mx-4 animate-fade-in-scale">
            <h2 id="pause-title" className="text-3xl font-bold text-center mb-5 kq-gold-text">Paused</h2>
            <div className="flex flex-col gap-3">
              <button ref={resumeRef} onClick={() => setPaused(false)} className="kq-btn kq-btn-primary">Resume</button>
              <button onClick={() => { setPaused(false); setScreen('worldMap'); }} className="kq-btn kq-btn-ghost">World map</button>
              <button onClick={() => { setPaused(false); setScreen('achievements'); }} className="kq-btn kq-btn-ghost">
                <Trophy size={16} className="text-kq-gold" aria-hidden="true" /> Achievements
              </button>
              <button onClick={() => { setPaused(false); setScreen('character'); }} className="kq-btn kq-btn-ghost">
                <SettingsIcon size={16} className="text-kq-cyan" aria-hidden="true" /> Character
              </button>
              <button onClick={async () => { await handleSave(); setPaused(false); setScreen('menu'); }} className="kq-btn kq-btn-danger">Save &amp; quit</button>
            </div>
            <p className="text-center text-sm text-kq-muted mt-4">Press Esc to resume.</p>
          </div>
        </div>
      )}
    </div>
  );
}
