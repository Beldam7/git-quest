import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp, Gem, HelpCircle, Heart, Lightbulb, Save, Settings as SettingsIcon, Star, Swords,
  Terminal as TerminalIcon, Trophy, Zap, ZoomIn, ZoomOut, Footprints, Sparkles,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameTerminal } from './Terminal';
import { SceneBoundary } from './ui/SceneBoundary';
import { HowToPlay } from './ui/HowToPlay';
import { AudioPanel, AudioToggle } from './ui/AudioControls';
import { GraphicsPanel } from './ui/GraphicsPanel';
import { gameAudio } from '../audio/GameAudio';
import { useCombatEvents } from '../hooks/useCombatEvents';
import { secretMapForChallenge } from '../world3d/secretMaps';
import { TouchStick } from './ui/TouchStick';
import type { StickVector } from './ui/TouchStick';
import { WORLDS, secretMissions } from '../data/worlds';
import { ABILITIES, getXpForNextLevel } from '../data/ranks';
import type { WorldChallenge } from '../types';
import { deriveSignals } from '../world3d/signals';
import type { WorldSignals } from '../world3d/types';
import { gemCount } from '../world3d/path';
import { clampZoom } from '../world3d/zoom';
import { useCoarsePointer } from '../hooks/usePrefersReducedMotion';

// Three.js is loaded on demand so the menu stays light.
const WorldCanvas = lazy(() => import('./WorldCanvas').then((m) => ({ default: m.WorldCanvas })));

const HELP_KEY = 'gitquest:howto-seen'; // device-level UI preference, not game progress
const FREE_COMMANDS = ['help', 'hint', 'clear'];

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

type Toast = { id: number; kind: 'good' | 'bad' | 'warn' | 'gem'; text: string };

export function GameScreen() {
  const {
    progress, repoState, terminalHistory, processCommand, setScreen, engine, startChallenge, saveProgress,
    appearance, lastCombat, combatEvents, runKey, restartLevel, collectGem, practiceMode, setPracticeMode,
  } = useGame() as any;
  const [showTerminal, setShowTerminal] = useState(true);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);

  const challengeId: string | null = engine?.getCurrentChallengeId() ?? null;
  const challengeInfo = challengeId ? findChallenge(challengeId) : null;
  const currentWorld = WORLDS.find((w) => w.id === (engine?.getCurrentWorldId() ?? 1));
  const secretMap = secretMapForChallenge(challengeId);
  const mapId = secretMap?.id ?? currentWorld?.id ?? 1;
  // A secret mission is its own one-fight map; otherwise the world's quests in order.
  const worldChallenges: WorldChallenge[] = secretMap && challengeInfo ? [challengeInfo.challenge] : currentWorld?.challenges ?? [];
  const challengeList = useMemo(
    () => worldChallenges.map((c) => ({ id: c.id, isBoss: secretMap ? true : c.isBoss, bossName: secretMap ? secretMap.guardian : c.bossName })),
    [mapId] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const activeIdx = worldChallenges.findIndex((c) => c.id === challengeId);
  const nextChallenge: WorldChallenge | null = activeIdx >= 0 ? worldChallenges[activeIdx + 1] ?? null : null;

  // Derived before the effects that depend on it (must not be declared after an early return).
  const chProgress = challengeId && progress ? progress.challengeProgress[challengeId] : null;
  const objectivesCompleted: string[] = chProgress?.objectivesCompleted ?? [];
  const totalObjectives = challengeInfo?.challenge.objectives.length ?? 0;
  const allObjectivesDone = !!challengeInfo && objectivesCompleted.length >= totalObjectives && totalObjectives > 0;
  const finished = worldChallenges.map((c) => {
    const cp = progress?.challengeProgress?.[c.id];
    return !!cp && cp.objectivesCompleted.length >= c.objectives.length;
  });
  const fighting = activeIdx >= 0 && !finished[activeIdx];
  const defeated = !!progress && progress.health <= 0;

  const [questComplete, setQuestComplete] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const prevLevel = useRef(progress?.level ?? 1);
  const wasDone = useRef(allObjectivesDone);
  const celebrate = useRef(false);

  const [engaged, setEngaged] = useState(false);
  const [autoWalk, setAutoWalk] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showHelp, setShowHelp] = useState(() => {
    try { return localStorage.getItem(HELP_KEY) !== '1'; } catch { return true; }
  });
  const zoomRef = useRef(1);
  const jumpRef = useRef(false);
  const firstCombatId = useRef(lastCombat?.id ?? 0);

  useEffect(() => {
    if (progress && progress.level > prevLevel.current) {
      setLevelUp(true);
      gameAudio.playSfx('levelup');
      const t = setTimeout(() => setLevelUp(false), 2500);
      prevLevel.current = progress.level;
      return () => clearTimeout(t);
    }
    prevLevel.current = progress?.level ?? 1;
  }, [progress?.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Celebrate only when a monster is defeated now, not when re-entering an already cleared fight.
  useEffect(() => {
    if (allObjectivesDone && !wasDone.current) {
      celebrate.current = true;
      setQuestComplete(true);
      const t = setTimeout(() => setQuestComplete(false), 2200);
      wasDone.current = allObjectivesDone;
      return () => clearTimeout(t);
    }
    wasDone.current = allObjectivesDone;
  }, [allObjectivesDone]);

  // After a victory, move on to the next monster automatically and start walking toward it.
  useEffect(() => {
    if (!allObjectivesDone || !nextChallenge || defeated) return;
    const t = setTimeout(() => {
      celebrate.current = false;
      startChallenge(nextChallenge.id);
    }, celebrate.current ? 2300 : 350);
    return () => clearTimeout(t);
  }, [allObjectivesDone, nextChallenge?.id, defeated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Short, friendly feedback and sound for every combat beat (each event exactly once, in order).
  useCombatEvents(combatEvents, (e) => {
    const later = (fn: () => void, ms: number) => { setTimeout(fn, ms); };
    let t: Omit<Toast, 'id'> | null = null;
    if (e.type === 'hit') {
      t = { kind: 'good', text: e.remaining > 0 ? `Direct hit! ${e.remaining} more to go` : 'Final blow!' };
      later(() => gameAudio.playSfx('hit'), 380);
      later(() => gameAudio.playSfx('xp'), 800);
    }
    if (e.type === 'defeated') {
      t = { kind: 'good', text: e.healed > 0 ? `Monster defeated! +${e.healed} HP` : 'Monster defeated!' };
      later(() => gameAudio.playSfx('victory'), 1000);
    }
    if (e.type === 'miss') {
      t = { kind: 'warn', text: 'That worked, but it did not hurt the monster' };
      gameAudio.playSfx('miss');
    }
    if (e.type === 'player-hit') {
      if (e.damage > 0) {
        t = { kind: 'bad', text: `Wrong command! -${e.damage} HP` };
        later(() => gameAudio.playSfx('hurt'), 450);
      } else {
        t = { kind: 'warn', text: 'Wrong command (practice mode: no damage)' };
        later(() => gameAudio.playSfx('miss'), 300);
      }
    }
    if (e.type === 'shield') {
      t = { kind: 'good', text: 'Commit Shield blocked the hit!' };
      later(() => gameAudio.playSfx('shield'), 450);
    }
    if (e.type === 'heal') {
      t = { kind: 'good', text: `Recovery Crystal! +${e.amount} HP` };
      gameAudio.playSfx('heal');
    }
    if (e.type === 'player-down') later(() => gameAudio.playSfx('defeat'), 900);
    if (e.type === 'gem') {
      t = { kind: 'gem', text: `Gem! +${e.xp} XP` };
      gameAudio.playSfx('gem');
    }
    if (e.type === 'restart') {
      t = { kind: 'good', text: 'Level restarted. Health restored' };
      gameAudio.playSfx('restart');
    }
    if (!t) return;
    const id = e.id;
    setToast({ id, ...t });
    setTimeout(() => setToast((cur) => (cur && cur.id === id ? null : cur)), 2400);
  });

  // Music follows the map; the battle theme plays only while a fight is on.
  useEffect(() => { gameAudio.setTheme(mapId); }, [mapId]);
  useEffect(() => {
    gameAudio.setMood(engaged && fighting ? 'battle' : 'explore');
    if (engaged && fighting) gameAudio.playSfx('engage');
  }, [engaged, fighting]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT') return;
        if (showHelp) return;
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp]);

  // 3D world reacts to the simulator's real state. Stabilised so the canvas only updates when a fact changes.
  const worldDone = finished.filter(Boolean).length;
  const rawSignals = deriveSignals(repoState ?? null, worldDone, worldChallenges.length);
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
  const defeatRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (defeated) defeatRef.current?.focus();
  }, [defeated]);

  // A rebuilt world or a new monster starts un-engaged; the hero re-reports engagement on the next frame.
  useEffect(() => {
    setEngaged(false);
  }, [runKey, challengeId]);

  const closeHelp = useCallback(() => {
    try { localStorage.setItem(HELP_KEY, '1'); } catch { /* storage unavailable: the tutorial will show again next visit */ }
    setShowHelp(false);
  }, []);

  const onEngagedChange = useCallback((v: boolean) => {
    setEngaged(v);
    if (v) {
      setAutoWalk(false);
      setFocusToken((n) => n + 1);
    }
  }, []);

  const onBlocked = useCallback(() => {
    setToast({ id: Date.now(), kind: 'warn', text: 'A monster blocks the road! Defeat it to pass.' });
    gameAudio.playSfx('blocked');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveProgress();
    setTimeout(() => setSaving(false), 500);
  };

  // Commands only count when you are standing at the monster, so every question has a place in the world.
  const handleCommand = (input: string) => {
    const t = input.trim().toLowerCase();
    if (fighting && !engaged && !defeated && !FREE_COMMANDS.includes(t)) {
      setToast({ id: Date.now(), kind: 'warn', text: 'Walk up to the monster first. Follow the glowing path.' });
      gameAudio.playSfx('blocked');
      return;
    }
    processCommand(input);
  };

  const zoomBy = (factor: number) => { zoomRef.current = clampZoom(zoomRef.current * factor); };

  if (!progress) return null;

  const xpInfo = getXpForNextLevel(progress.totalXp);
  const healthPercent = (progress.health / progress.maxHealth) * 100;
  const unlockedAbilities = ABILITIES.filter((a) => progress.unlockedAbilities.includes(a.id));
  const nextObjective = challengeInfo ? challengeInfo.challenge.objectives.find((o) => !objectivesCompleted.includes(o.id)) : undefined;
  const unresolvedConflicts = repoState ? repoState.conflicts.filter((c: { resolved: boolean }) => !c.resolved).length : 0;

  const normalCount = challengeList.filter((c) => !c.isBoss).length;
  const gemsTotal = gemCount(normalCount);
  const gemsHere = (progress.collectedGems ?? []).filter((id: string) => id.startsWith(`g${mapId}-`)).length;
  const worldCleared = activeIdx >= 0 && !fighting && allObjectivesDone && !nextChallenge && !!challengeInfo;
  const activeStationName = activeIdx >= 0 ? (worldChallenges[activeIdx].isBoss ? worldChallenges[activeIdx].bossName ?? currentWorld?.bossName ?? 'the boss' : 'the monster') : 'the monster';

  const placeholder = engaged
    ? 'Attack! Type a Git command here…'
    : fighting
      ? 'Walk to the monster to fight (you can still type help or hint)'
      : 'Type a git command, e.g. git status';

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-kq-night text-kq-text">
      {/* Top HUD */}
      <header className="z-20 flex items-center justify-between gap-3 border-b border-kq-edge bg-kq-ink px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" aria-label="Back to world map">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Map</span>
          </button>
          {secretMap ? (
            <div className="hidden truncate text-sm sm:block">
              <span className="text-kq-muted">Secret: </span>
              <span className="font-display" style={{ color: secretMap.accent }}>{secretMap.name}</span>
            </div>
          ) : currentWorld && (
            <div className="hidden truncate text-sm sm:block">
              <span className="text-kq-muted">World {currentWorld.id}: </span>
              <span className="font-display" style={{ color: currentWorld.accentColor }}>{currentWorld.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`flex items-center gap-2 ${progress.health < progress.maxHealth * 0.3 ? 'animate-shake' : ''}`}>
            <Heart size={15} className="text-kq-ruby" fill="currentColor" aria-hidden="true" />
            <div
              role="progressbar" aria-label="Your health" aria-valuemin={0} aria-valuemax={progress.maxHealth} aria-valuenow={progress.health}
              className="h-2.5 w-16 overflow-hidden rounded-full bg-gray-800 sm:w-28"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-[#c93247] to-kq-ruby transition-all duration-500" style={{ width: `${healthPercent}%` }} />
            </div>
            <span className="text-sm tabular-nums text-kq-muted">{progress.health}/{progress.maxHealth}</span>
          </div>
          <div className="hidden items-center gap-1.5 text-sm sm:flex" title="Gems collected in this world">
            <Gem size={15} className="text-kq-cyan" aria-hidden="true" />
            <span className="tabular-nums">{gemsHere}/{gemsTotal}</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Zap size={15} className="text-kq-gold" fill="currentColor" aria-hidden="true" />
            <div
              role="progressbar" aria-label="Experience toward next level" aria-valuemin={0} aria-valuemax={xpInfo.needed} aria-valuenow={xpInfo.current}
              className="h-2.5 w-24 overflow-hidden rounded-full bg-gray-800"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-[#d9962a] to-kq-gold transition-all duration-500" style={{ width: `${(xpInfo.current / xpInfo.needed) * 100}%` }} />
            </div>
            <span className="text-sm tabular-nums text-kq-muted">{progress.totalXp} XP</span>
          </div>
          <div className="hidden font-display text-sm text-kq-gold xl:block">{progress.rank}</div>
          {practiceMode && <span className="hidden rounded-full border border-kq-cyan/50 bg-kq-cyan/10 px-2.5 py-1 text-xs text-kq-cyan md:inline" title="Wrong commands do not cost health">Practice mode</span>}
          {engine?.canUseRecoveryCrystal?.() && (
            <button onClick={() => engine.useRecoveryCrystal()} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" title="Recovery Crystal: restore full health (once per level)">
              <Gem size={14} className="text-kq-cyan" aria-hidden="true" /> <span className="hidden lg:inline">Heal</span>
            </button>
          )}
          <AudioToggle />
          <button onClick={() => setShowHelp(true)} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" aria-label="How to play">
            <HelpCircle size={16} aria-hidden="true" />
          </button>
          <button onClick={handleSave} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm" aria-live="polite">
            <Save size={14} className={saving ? 'text-kq-emerald' : 'text-kq-muted'} aria-hidden="true" />
            <span className="hidden sm:inline">{saving ? 'Saved!' : 'Save'}</span>
          </button>
          <button onClick={() => setPaused(true)} className="kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm">Pause</button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {/* Compact quest bar */}
        {challengeInfo && (
          <section aria-label="Current quest" className="border-b border-l-4 border-kq-edge border-l-kq-gold bg-kq-deep/95 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {challengeInfo.challenge.isBoss && <Swords size={16} className="shrink-0 text-kq-violet" aria-label="Boss quest" />}
                  <h2 className="truncate text-base font-bold">{challengeInfo.challenge.title}</h2>
                  <span className="shrink-0 text-xs tabular-nums text-kq-muted">{objectivesCompleted.length}/{totalObjectives}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
              </div>
            )}
          </section>
        )}

        <div ref={splitRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* 3D world */}
          <div
            className="relative min-h-[240px] min-w-0 flex-1 bg-kq-night"
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
                  worldId={mapId}
                  runKey={runKey}
                  signals={signals}
                  appearance={appearance}
                  challenges={challengeList}
                  worldBossName={secretMap ? secretMap.guardian : currentWorld?.bossName}
                  activeChallengeId={challengeId}
                  finished={finished}
                  objectivesDone={objectivesCompleted.length}
                  objectivesTotal={Math.max(1, totalObjectives)}
                  collectedGems={[...(progress.collectedGems ?? [])]}
                  events={combatEvents}
                  stick={stick}
                  zoomRef={zoomRef}
                  controlsEnabled={!paused && !showHelp && !defeated}
                  autoWalk={autoWalk}
                  onAutoWalkChange={setAutoWalk}
                  engaged={engaged}
                  onEngagedChange={onEngagedChange}
                  onCollectGem={collectGem}
                  onBlocked={onBlocked}
                  jumpRef={jumpRef}
                />
              </Suspense>
            </SceneBoundary>

            {lastCombat?.type === 'player-hit' && lastCombat.damage > 0 && lastCombat.id > firstCombatId.current && <div key={lastCombat.id} className="hurt-flash" aria-hidden="true" />}

            {/* The coach: always says exactly what to do next */}
            {challengeInfo && !defeated && (
              <div className="absolute left-1/2 top-3 z-10 w-[min(640px,94%)] -translate-x-1/2" role="status" aria-live="polite">
                <div className={`kq-panel flex items-center gap-3 px-4 py-2.5 ${engaged ? 'border-kq-ruby/70' : worldCleared ? 'kq-panel-gold' : ''}`}>
                  <div className="min-w-0 flex-1">
                    {worldCleared ? (
                      <p className="text-lg font-bold text-kq-gold">{secretMap ? 'Secret mission complete! 🌟' : 'World cleared! 🎉'}</p>
                    ) : allObjectivesDone ? (
                      <p className="text-lg font-bold text-kq-emerald">{activeStationName === 'the monster' ? 'Monster' : activeStationName} defeated! Heading to the next one…</p>
                    ) : fighting && engaged ? (
                      <>
                        <p className="text-sm font-bold uppercase tracking-wide text-kq-ruby">⚔ Fight! Type the right Git command</p>
                        <p className="text-lg font-semibold leading-snug">{nextObjective?.description}</p>
                      </>
                    ) : fighting ? (
                      <>
                        <p className="text-sm font-bold uppercase tracking-wide text-kq-cyan">Next: {activeStationName}</p>
                        <p className="text-lg font-semibold leading-snug">Follow the glowing path to the monster</p>
                      </>
                    ) : (
                      <p className="text-lg font-semibold">Type a git command in the terminal</p>
                    )}
                  </div>
                  {fighting && !engaged && (
                    <button onClick={() => setAutoWalk(!autoWalk)} className="kq-btn kq-btn-primary shrink-0 !min-h-[44px] text-sm">
                      <Footprints size={16} aria-hidden="true" /> {autoWalk ? 'Stop' : 'Walk to monster'}
                    </button>
                  )}
                  {fighting && engaged && (
                    <button onClick={() => processCommand('hint')} className="kq-btn kq-btn-gold shrink-0 !min-h-[44px] text-sm" title="Optional. Using a hint skips the no-hints bonus.">
                      <Lightbulb size={16} aria-hidden="true" /> Hint
                    </button>
                  )}
                </div>
              </div>
            )}

            {worldCleared && (
              <div className="absolute left-1/2 top-28 z-10 w-[min(380px,92%)] -translate-x-1/2 kq-panel kq-panel-gold p-4 text-center">
                <p className="mb-3 text-base text-kq-text">{secretMap ? 'You defeated the guardian of this hidden place.' : 'You defeated every monster and the boss of this world.'}</p>
                <div className="flex gap-2">
                  {mapId === 8 && !secretMap && progress.completedChallenges.some((c: { challengeId: string }) => c.challengeId === 'w8_boss') && (
                    <button onClick={() => setScreen('victory')} className="kq-btn kq-btn-gold flex-1">Claim victory!</button>
                  )}
                  <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-primary flex-1">World map</button>
                  <button onClick={() => restartLevel()} className="kq-btn kq-btn-ghost flex-1">Replay level</button>
                </div>
              </div>
            )}

            {repoState && (
              <div className="pointer-events-none absolute left-3 top-24 hidden max-w-[40%] kq-panel px-3 py-2 font-mono text-xs md:block">
                <div>Branch: <span className="text-kq-cyan">{repoState.currentBranch}</span></div>
                <div>Repo: <span className={repoState.initialized ? 'text-kq-emerald' : 'text-kq-ruby'}>{repoState.initialized ? 'initialized' : 'not initialized'}</span></div>
                {repoState.mergeInProgress && <div className="text-kq-gold">⚠ merge in progress</div>}
                {unresolvedConflicts > 0 && <div className="text-kq-ruby">conflicts: {unresolvedConflicts}</div>}
              </div>
            )}

            {unlockedAbilities.length > 0 && (
              <ul className="absolute right-3 top-24 hidden flex-col gap-1.5 xl:flex" aria-label="Unlocked abilities">
                {unlockedAbilities.slice(0, 4).map((ability) => (
                  <li key={ability.id} className="kq-panel flex items-center gap-2 px-2.5 py-1.5 text-sm" title={ability.description}>
                    <Star size={12} className="text-kq-gold" aria-hidden="true" />
                    <span>{ability.name}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Zoom */}
            <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5" role="group" aria-label="Camera zoom">
              <button onClick={() => zoomBy(0.8)} className="kq-btn kq-btn-ghost !min-h-[40px] !w-10 !px-0" aria-label="Zoom in" title="Zoom in (+ or scroll up)"><ZoomIn size={18} /></button>
              <button onClick={() => zoomBy(1.25)} className="kq-btn kq-btn-ghost !min-h-[40px] !w-10 !px-0" aria-label="Zoom out" title="Zoom out (- or scroll down)"><ZoomOut size={18} /></button>
            </div>

            {toast && (
              <div
                key={toast.id}
                className={`toast-pop kq-panel absolute bottom-6 left-1/2 z-20 px-4 py-2 text-lg font-bold ${
                  toast.kind === 'good' ? 'text-kq-emerald' : toast.kind === 'bad' ? 'text-kq-ruby' : toast.kind === 'gem' ? 'text-kq-cyan' : 'text-kq-gold'
                }`}
                role="status"
              >
                {toast.text}
              </div>
            )}

            {!coarse && (
              <div className="pointer-events-none absolute bottom-3 left-3 hidden kq-panel px-3 py-1.5 text-xs text-kq-muted lg:block">
                <b className="text-kq-text">WASD</b> walk · <b className="text-kq-text">Space</b> jump · <b className="text-kq-text">scroll</b> zoom · click the terminal to type
              </div>
            )}
            {coarse && <TouchStick vector={stick} className="absolute bottom-4 left-4" />}
            {coarse && (
              <button
                onPointerDown={() => { jumpRef.current = true; }}
                className="kq-btn kq-btn-primary absolute bottom-6 right-4 z-10 !min-h-[72px] !w-[72px] !rounded-full text-sm"
                aria-label="Jump"
              >
                Jump
              </button>
            )}
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
                <GameTerminal
                  history={terminalHistory}
                  onCommand={handleCommand}
                  onClose={() => setShowTerminal(false)}
                  isActive={!paused && !defeated}
                  placeholder={placeholder}
                  focusToken={focusToken}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Level-up / quest-complete feedback */}
      {levelUp && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center" role="status">
          <div className="animate-bounce-in text-center">
            <div className="kq-gold-text mb-2 font-display text-5xl font-bold sm:text-6xl">LEVEL UP!</div>
            <div className="flex items-center justify-center gap-2 text-xl text-kq-gold">
              <Sparkles size={20} className="animate-spin-slow" aria-hidden="true" /> Level {progress.level}
              <Sparkles size={20} className="animate-spin-slow" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}
      {questComplete && !levelUp && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center" role="status">
          <div className="animate-celebrate text-center">
            <div className="mb-1 font-display text-4xl font-bold text-kq-emerald [text-shadow:0_2px_12px_rgba(0,0,0,0.7)] sm:text-5xl">Victory!</div>
            <div className="text-lg text-kq-text [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">Monster defeated. Rewards added.</div>
          </div>
        </div>
      )}

      {/* Defeat: health reached zero */}
      {defeated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="defeat-title" className="kq-panel mx-4 w-full max-w-sm border-kq-ruby/60 p-7 text-center animate-fade-in-scale">
            <div className="mb-2 text-5xl" aria-hidden="true">💀</div>
            <h2 id="defeat-title" className="mb-2 font-display text-3xl font-bold text-kq-ruby">You were defeated</h2>
            <p className="mb-5 text-base text-kq-muted">Wrong commands cost you health. Restart the level, and remember: type <b className="text-kq-text">hint</b> if you are stuck.</p>
            <div className="flex flex-col gap-3">
              <button ref={defeatRef} onClick={() => restartLevel()} className="kq-btn kq-btn-primary text-lg">Restart level</button>
              {!practiceMode && <button onClick={() => { setPracticeMode(true); restartLevel(); }} className="kq-btn kq-btn-ghost">Restart in practice mode (no damage)</button>}
              <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-ghost">World map</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause dialog */}
      {paused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 animate-fade-in">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pause-title" className="kq-panel mx-4 w-full max-w-sm p-7 animate-fade-in-scale">
            <h2 id="pause-title" className="kq-gold-text mb-5 text-center text-3xl font-bold">Paused</h2>
            <div className="mb-4 space-y-3">
              <AudioPanel />
              <GraphicsPanel />
              <label className="flex items-center gap-3 rounded-xl border border-kq-edge bg-kq-deep/60 p-3 text-sm">
                <input type="checkbox" checked={!!practiceMode} onChange={(e) => setPracticeMode(e.target.checked)} className="h-4 w-4 accent-[#3dd6f5]" />
                <span><b className="text-kq-text">Practice mode</b><span className="block text-kq-muted">Wrong commands never cost health.</span></span>
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <button ref={resumeRef} onClick={() => setPaused(false)} className="kq-btn kq-btn-primary">Resume</button>
              <button onClick={() => { setPaused(false); setShowHelp(true); }} className="kq-btn kq-btn-ghost"><HelpCircle size={16} aria-hidden="true" /> How to play</button>
              <button onClick={() => { setPaused(false); setScreen('worldMap'); }} className="kq-btn kq-btn-ghost">World map</button>
              <button onClick={() => { setPaused(false); setScreen('achievements'); }} className="kq-btn kq-btn-ghost">
                <Trophy size={16} className="text-kq-gold" aria-hidden="true" /> Achievements
              </button>
              <button onClick={() => { setPaused(false); setScreen('character'); }} className="kq-btn kq-btn-ghost">
                <SettingsIcon size={16} className="text-kq-cyan" aria-hidden="true" /> Character
              </button>
              <button onClick={async () => { await handleSave(); setPaused(false); setScreen('menu'); }} className="kq-btn kq-btn-danger">Save &amp; quit</button>
            </div>
            <p className="mt-4 text-center text-sm text-kq-muted">Press Esc to resume.</p>
          </div>
        </div>
      )}

      {showHelp && <HowToPlay touch={coarse} onClose={closeHelp} />}
    </div>
  );
}
