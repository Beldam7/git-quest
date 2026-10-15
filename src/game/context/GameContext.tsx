import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { GameProgress, RepositoryState, TerminalLine, GameScreen } from '../types';
import { GameEngine } from '../engine/GameEngine';
import type { GameEngineCallbacks } from '../engine/GameEngine';
import { MockAuthAdapter } from '../adapters/AuthAdapter';
import type { AuthState, AuthUser } from '../adapters/AuthAdapter';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';
import { createAdapters } from '../adapters/config';
import type { Adapters, AdapterMode } from '../adapters/config';

interface GameContextValue {
  progress: GameProgress | null;
  repoState: RepositoryState | null;
  terminalHistory: TerminalLine[];
  screen: GameScreen;
  engine: GameEngine | null;
  authState: AuthState;
  authUser: AuthUser | null;
  authError: string | null;
  /** 'mock' = development-only fake integrations; 'startng' = real (currently unimplemented) adapters. */
  adapterMode: AdapterMode;
  /** True when a saved game exists for the signed-in user. */
  hasSavedGame: boolean;
  /** Set when loading or saving progress failed. The game never starts a fresh save over a failed load. */
  persistenceError: string | null;
  /** The character appearance currently applied to the 3D character (from the appearance adapter). */
  appearance: CharacterAppearance;
  /** Whether the player may edit appearance in-game (dev mock only; Start.ng owns it in production). */
  appearanceEditable: boolean;
  setAppearance: (partial: Partial<CharacterAppearance>) => void;
  startNewGame: () => void;
  continueGame: () => Promise<void>;
  enterWorld: (worldId: number) => void;
  startChallenge: (challengeId: string) => void;
  processCommand: (input: string) => void;
  setScreen: (screen: GameScreen) => void;
  saveProgress: () => Promise<void>;
  devSignIn: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// DEVELOPMENT-ONLY identity used by MockAuthAdapter.devSignIn. Never used in 'startng' mode.
const DEV_USER_ID = 'dev-player';

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function GameProvider({ children }: { children: ReactNode }) {
  // Adapters are created once (lazy) so nothing runs on every render.
  const adaptersRef = useRef<Adapters | null>(null);
  if (adaptersRef.current === null) adaptersRef.current = createAdapters();
  const adapters = adaptersRef.current;

  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [repoState, setRepoState] = useState<RepositoryState | null>(null);
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [screen, setScreenState] = useState<GameScreen>('menu');
  const [authState, setAuthState] = useState<AuthState>(() => adapters.auth.getState());
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => adapters.auth.getUser());
  const [authError, setAuthError] = useState<string | null>(() => adapters.auth.getError());
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [appearance, setAppearanceState] = useState<CharacterAppearance>(() => adapters.appearance.getAppearance());

  const engineRef = useRef<GameEngine | null>(null);
  const savingRef = useRef(false);
  // The authenticated user id the in-memory game belongs to. All persistence is scoped to it.
  const userIdRef = useRef<string | null>(null);

  const callbacks: GameEngineCallbacks = {
    onProgressUpdate: (p) => setProgress(p),
    onRepoStateChange: (s) => setRepoState(s),
    onTerminalOutput: (lines) => setTerminalHistory(lines),
    onChallengeComplete: () => {},
    onScreenChange: (s) => setScreenState(s),
    onRankUp: () => {},
    onAchievementUnlock: () => {},
    onDamage: () => {},
    onHeal: () => {},
  };

  // Auth: follow the adapter. When the user changes (or signs out) drop the in-memory game so
  // one player's progress is never shown or saved under another identity.
  useEffect(() => {
    const apply = (state: AuthState, user: AuthUser | null) => {
      const nextId = state === 'authenticated' && user ? user.id : null;
      if (userIdRef.current !== nextId) {
        userIdRef.current = nextId;
        engineRef.current = null;
        setProgress(null);
        setRepoState(null);
        setTerminalHistory([]);
        setScreenState('menu');
        setHasSavedGame(false);
        setPersistenceError(null);
        if (nextId) {
          adapters.progress
            .load(nextId)
            .then((saved) => {
              if (userIdRef.current === nextId) {
                setHasSavedGame(!!saved && saved.completedChallenges.length > 0);
              }
            })
            .catch((e) => {
              if (userIdRef.current === nextId) {
                setPersistenceError(errorMessage(e, 'Could not load saved progress.'));
              }
            });
        }
      }
      setAuthState(state);
      setAuthUser(user);
      setAuthError(adapters.auth.getError());
    };
    const unsub = adapters.auth.onChange(apply);
    apply(adapters.auth.getState(), adapters.auth.getUser());
    return unsub;
  }, [adapters]);

  // Appearance: the adapter is the single source of truth for the 3D character.
  useEffect(() => {
    const unsub = adapters.appearance.onChange((a) => setAppearanceState(a));
    setAppearanceState(adapters.appearance.getAppearance());
    return unsub;
  }, [adapters]);

  const setAppearance = useCallback(
    (partial: Partial<CharacterAppearance>) => {
      if (!adapters.appearanceEditable) return;
      adapters.appearance.setAppearance(partial);
    },
    [adapters]
  );

  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new GameEngine(callbacks);
    }
    return engineRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScreen = useCallback((s: GameScreen) => {
    const engine = ensureEngine();
    engine.setScreen(s);
    setScreenState(s);
  }, [ensureEngine]);

  const startNewGame = useCallback(() => {
    if (!userIdRef.current) return; // Requires an authenticated user.
    const engine = ensureEngine();
    engine.startNewGame();
    setScreenState(engine.getScreen());
  }, [ensureEngine]);

  const continueGame = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    try {
      const loaded = await adapters.progress.load(userId);
      if (userIdRef.current !== userId) return; // user changed while loading
      const engine = ensureEngine();
      if (loaded) {
        engine.loadProgress(loaded);
      } else {
        engine.startNewGame();
      }
      setScreenState(engine.getScreen());
      setPersistenceError(null);
    } catch (e) {
      // Do NOT fall back to a new game: its autosave would overwrite the progress we failed to read.
      setPersistenceError(errorMessage(e, 'Could not load saved progress.'));
    }
  }, [adapters, ensureEngine]);

  const enterWorld = useCallback((worldId: number) => {
    const engine = ensureEngine();
    engine.enterWorld(worldId);
    setScreenState(engine.getScreen());
  }, [ensureEngine]);

  const startChallenge = useCallback((challengeId: string) => {
    const engine = ensureEngine();
    engine.startChallenge(challengeId);
    setScreenState(engine.getScreen());
  }, [ensureEngine]);

  const processCommand = useCallback((input: string) => {
    const engine = ensureEngine();
    engine.processCommand(input);
    setTerminalHistory(engine.getTerminalHistory());
    setProgress(engine.getProgress());
    setRepoState(engine.getRepoState());
  }, [ensureEngine]);

  const persist = useCallback(
    async (userId: string, data: GameProgress) => {
      try {
        const ok = await adapters.progress.save(userId, data);
        if (userIdRef.current !== userId) return;
        if (ok) {
          setPersistenceError(null);
          if (data.completedChallenges.length > 0) setHasSavedGame(true);
        } else {
          setPersistenceError('Could not save progress.');
        }
      } catch (e) {
        if (userIdRef.current === userId) {
          setPersistenceError(errorMessage(e, 'Could not save progress.'));
        }
      }
    },
    [adapters]
  );

  const saveProgress = useCallback(async () => {
    const userId = userIdRef.current;
    const engine = engineRef.current;
    if (!userId || !engine || !engine.getProgress()) return;
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await persist(userId, engine.getProgress());
    } finally {
      savingRef.current = false;
    }
  }, [persist]);

  // Auto-save on progress change (debounced)
  useEffect(() => {
    const userId = userIdRef.current;
    if (!progress || !userId || screen === 'menu') return;
    const timer = setTimeout(() => {
      void persist(userId, progress);
    }, 2000);
    return () => clearTimeout(timer);
  }, [progress, screen, persist]);

  const devSignIn = useCallback(() => {
    if (adapters.auth instanceof MockAuthAdapter) {
      adapters.auth.devSignIn(DEV_USER_ID, 'Dev Player (mock)');
    }
  }, [adapters]);

  const value: GameContextValue = {
    progress,
    repoState,
    terminalHistory,
    screen,
    engine: engineRef.current,
    authState,
    authUser,
    authError,
    adapterMode: adapters.mode,
    hasSavedGame,
    persistenceError,
    appearance,
    appearanceEditable: adapters.appearanceEditable,
    setAppearance,
    startNewGame,
    continueGame,
    enterWorld,
    startChallenge,
    processCommand,
    setScreen,
    saveProgress,
    devSignIn,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
