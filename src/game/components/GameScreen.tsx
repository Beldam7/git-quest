import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Trophy, Settings as SettingsIcon, Save, Heart, Star, Zap, Sparkles, Lightbulb, Swords, Terminal as TerminalIcon } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameTerminal } from './Terminal';
import { SceneBoundary } from './ui/SceneBoundary';
import { WORLDS, secretMissions } from '../data/worlds';
import { ABILITIES, getXpForNextLevel } from '../data/ranks';
import type { WorldChallenge } from '../types';
import { TouchStick } from './ui/TouchStick';
import type { StickVector } from './ui/TouchStick';
import { deriveSignals } from '../world3d/signals';
import type { WorldSignals } from '../world3d/types';
import { useCoarsePointer } from '../hooks/usePrefersReducedMotion';

// Three.js is loaded on demand so the menu stays light.
const WorldCanvas = lazy(() => import('./WorldCanvas').then((m) => ({ default: m.WorldCanvas })));

function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

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

  // 3D world reacts to the simulator's real state. Stabilised so the canvas only updates when a fact changes.
  const worldDone = progress && currentWorld ? progress.completedChallenges.filter((c: { worldId: number }) => c.worldId === currentWorld.id).length : 0;
  const rawSignals = deriveSignals(repoState ?? null, worldDone, currentWorld?.challenges.length ?? 0);
  const sigRef = useRef<{ key: string; value: WorldSignals } | null>(null);
  const sigKey = JSON.stringify(rawSignals);
  if (!sigRef.current || sigRef.current.key !== sigKey) sigRef.current = { key: sigKey, value: rawSignals };
  const signals = sigRef.current.value;

  const stick = useRef<StickVector>({ x: 0, z: 0 });
  const coarse = useCoarsePointer();
  const wide = useWide();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [termPx, setTermPx] = useState<number | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const defaultTerm = () => {
    const r = splitRef.current?.getBoundingClientRect();
    return r ? (wide ? r.width * 0.4 : r.height * 0.36) : 360;
  };
  const clampTerm = (v: number) => {
    const r = splitRef.current?.getBoundingClientRect();
    const max = r ? (wide ? r.width * 0.7 : r.height * 0.7) : 700;
    return Math.min(max, Math.max(wide ? 300 : 140, v));
  };
  const dragTerm = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !splitRef.current) return;
    const r = splitRef.current.getBoundingClientRect();
    setTermPx(clampTerm(wide ? r.right - e.clientX : r.bottom - e.clientY));
  };
  const nudgeTerm = (e: React.KeyboardEvent) => {
    const grow = wide ? 'ArrowLeft' : 'ArrowUp';
    const shrink = wide ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== grow && e.key !== shrink) return;
    e.preventDefault();
    setTermPx(clampTerm((termPx ?? defaultTerm()) + (e.key === grow ? 32 : -32)));
  };

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
  const nextObjective = challengeInfo ? challengeInfo.challenge.objectives.find((o) => !objectivesCompleted.includes(o.id)) : undefined;
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
        {/* Compact quest bar: the next step is always visible, details expand on demand */}
        {challengeInfo && (
          <section aria-label="Current quest" className="bg-kq-deep/95 border-b border-kq-edge border-l-4 border-l-kq-gold px-3 sm:px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isBoss && <Swords size={16} className="text-kq-violet shrink-0" aria-label="Boss quest" />}
                  <h2 className="truncate text-base font-bold">{challengeInfo.challenge.title}</h2>
                  <span className="shrink-0 text-xs text-kq-muted tabular-nums">{objectivesCompleted.length}/{challengeInfo.challenge.objectives.length}</span>
                </div>
                <p className="truncate text-sm text-kq-muted">
                  {allObjectivesDone ? 'All objectives complete.' : `Next: ${nextObjective?.description ?? ''}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {allObjectivesDone ? (
                  nextChallenge ? (
                    <button onClick={() => startChallenge(nextChallenge.id)} className="kq-btn kq-btn-gold !min-h-[40px] text-sm" role="status">Next quest →</button>
                  ) : (
                    <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-primary !min-h-[40px] text-sm" role="status">Back to map →</button>
                  )
                ) : (
                  <button onClick={() => processCommand('hint')} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" title="Optional. Using a hint skips the no-hints bonus.">
                    <Lightbulb size={14} className="text-kq-gold" aria-hidden="true" /> <span className="hidden sm:inline">Hint</span>
                  </button>
                )}
                <button onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm">
                  {detailsOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />} <span className="hidden sm:inline">Details</span>
                </button>
                <button onClick={() => setShowTerminal(!showTerminal)} aria-expanded={showTerminal} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm">
                  <TerminalIcon size={14} className="text-kq-cyan" aria-hidden="true" /> <span className="hidden sm:inline">Terminal</span>
                </button>
              </div>
            </div>
            {detailsOpen && (
              <div className="mt-2 max-h-[30vh] overflow-y-auto border-t border-kq-edge/60 pt-2">
                <p className="mb-2 text-base text-kq-muted">{challengeInfo.challenge.description}</p>
                <ul className="space-y-1">
                  {challengeInfo.challenge.objectives.map((obj) => {
                    const done = objectivesCompleted.includes(obj.id);
                    return (
                      <li key={obj.id} className="flex items-center gap-2 text-base">
                        <span className={done ? 'text-kq-emerald' : 'text-kq-muted'} aria-hidden="true">{done ? '✓' : '○'}</span>
                        <span className={done ? 'text-kq-emerald line-through' : 'text-kq-text'}>
                          <span className="sr-only">{done ? 'Done: ' : 'To do: '}</span>{obj.description}
                        </span>
                        <span className="text-sm text-kq-gold">+{obj.xpReward} XP</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-sm text-kq-muted">Hints are optional; using one skips the no-hints bonus.</p>
              </div>
            )}
          </section>
        )}

        <div ref={splitRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* 3D world */}
          <div
            className="relative min-h-[220px] min-w-0 flex-1 bg-kq-night"
            onPointerDown={() => {
              // Clicking the world hands the keyboard to the hero (WASD) instead of the terminal.
              const a = document.activeElement;
              if (a instanceof HTMLElement) a.blur();
            }}
          >
            <SceneBoundary
              fallback={
                <div className="absolute inset-0 grid place-items-center px-6 text-center text-kq-muted">
                  3D view isn&apos;t available on this device. You can still play with the terminal.
                </div>
              }
            >
              <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-kq-muted" role="status">Building the world…</div>}>
                <WorldCanvas
                  worldId={currentWorld?.id ?? 1}
                  signals={signals}
                  appearance={appearance}
                  showBoss={isBoss}
                  bossName={bossName}
                  stick={stick}
                  controlsEnabled={!paused}
                />
              </Suspense>
            </SceneBoundary>

            {isBoss && bossName && challengeInfo && (
              <div className="pointer-events-none absolute left-1/2 top-3 w-60 -translate-x-1/2 kq-panel border-kq-violet/60 px-3 py-1.5 text-center">
                <div className="font-display text-sm text-kq-violet">{bossName}</div>
                <div
                  role="progressbar" aria-label="Boss defeat progress" aria-valuemin={0}
                  aria-valuemax={challengeInfo.challenge.objectives.length} aria-valuenow={objectivesCompleted.length}
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800"
                >
                  <div className="h-full bg-gradient-to-r from-kq-violet to-kq-ruby transition-all duration-500" style={{ width: `${(objectivesCompleted.length / Math.max(1, challengeInfo.challenge.objectives.length)) * 100}%` }} />
                </div>
              </div>
            )}

            {repoState && (
              <div className="pointer-events-none absolute left-3 top-3 max-w-[55%] kq-panel px-3 py-2 font-mono text-xs">
                <div>Branch: <span className="text-kq-cyan">{repoState.currentBranch}</span></div>
                <div>Repo: <span className={repoState.initialized ? 'text-kq-emerald' : 'text-kq-ruby'}>{repoState.initialized ? 'initialized' : 'not initialized'}</span></div>
                {repoState.mergeInProgress && <div className="text-kq-gold">⚠ merge in progress</div>}
                {unresolvedConflicts > 0 && <div className="text-kq-ruby">conflicts: {unresolvedConflicts}</div>}
              </div>
            )}

            {unlockedAbilities.length > 0 && (
              <ul className="absolute right-3 top-3 hidden flex-col gap-1.5 xl:flex" aria-label="Unlocked abilities">
                {unlockedAbilities.slice(0, 4).map((ability) => (
                  <li key={ability.id} className="kq-panel flex items-center gap-2 px-2.5 py-1.5 text-sm" title={ability.description}>
                    <Star size={12} className="text-kq-gold" aria-hidden="true" />
                    <span>{ability.name}</span>
                  </li>
                ))}
              </ul>
            )}

            {!coarse && (
              <div className="pointer-events-none absolute bottom-3 left-3 kq-panel px-3 py-1.5 text-xs text-kq-muted">
                Click the world, then <b className="text-kq-text">WASD</b> to walk · click the terminal to type
              </div>
            )}
            {coarse && <TouchStick vector={stick} className="absolute bottom-4 left-4" />}
          </div>

          {/* Resizable, collapsible terminal */}
          {showTerminal && (
            <>
              <div
                role="separator"
                tabIndex={0}
                aria-label="Resize terminal"
                aria-orientation={wide ? 'vertical' : 'horizontal'}
                aria-valuenow={Math.round(termPx ?? defaultTerm())}
                onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
                onPointerMove={dragTerm}
                onKeyDown={nudgeTerm}
                className={`${wide ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'} shrink-0 touch-none bg-kq-edge/60 transition-colors hover:bg-kq-cyan/50`}
              />
              <div className="min-h-0 min-w-0 shrink-0" style={wide ? { width: termPx ?? '40%' } : { height: termPx ?? '36vh' }}>
                <GameTerminal history={terminalHistory} onCommand={processCommand} onClose={() => setShowTerminal(false)} isActive={!paused} />
              </div>
            </>
          )}
        </div>
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
