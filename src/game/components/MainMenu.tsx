import { Sword, Trophy, User, Play, ChevronRight, Crown } from 'lucide-react';
import { AudioToggle } from './ui/AudioControls';
import { useGame } from '../context/GameContext';
import { Logo } from './ui/Logo';
import { Backdrop } from './ui/Backdrop';

export function MainMenu() {
  const {
    startNewGame, continueGame, setScreen, progress, authState, authUser, authError,
    adapterMode, hasSavedGame, persistenceError, devSignIn, signIn, canSignIn,
  } = useGame();

  const canPlay = authState === 'authenticated';
  const hasProgress = canPlay && (hasSavedGame || (!!progress && progress.completedChallenges.length > 0));

  return (
    <main className="relative min-h-screen overflow-hidden bg-kq-night text-kq-text">
      <Backdrop />
      <div className="absolute right-3 top-3 z-20"><AudioToggle /></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-7 px-5 py-10">
        <div className="animate-fade-in-down">
          <Logo />
        </div>

        {/* Account status */}
        <div className="w-full max-w-sm animate-fade-in-up stagger-3" aria-live="polite">
          {authState === 'authenticated' ? (
            <div className="kq-panel flex items-center gap-3 px-4 py-2.5 text-left text-sm">
              {authUser?.face && <img src={authUser.face} alt="" className="h-11 w-11 shrink-0 rounded-full border border-kq-edge bg-kq-deep" />}
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  {authUser?.isGuest ? 'Playing as ' : 'Signed in as '}
                  <strong className="text-kq-text">{authUser?.displayName}</strong>
                  {authUser?.account && <span className="text-kq-muted"> @{authUser.account}</span>}
                </div>
                {adapterMode === 'mock' && <div className="text-xs text-kq-gold">MOCK sign-in (development only), not a start.ng session</div>}
                {authUser?.offline && <div className="text-xs text-kq-muted">Not connected to start.ng: playing offline. Scores are not shared.</div>}
                {authUser?.isGuest && !authUser.offline && <div className="text-xs text-kq-muted">Guests can play, but only signed-in players are saved to the leaderboard.</div>}
              </div>
              {authUser?.isGuest && !authUser.offline && canSignIn && (
                <button onClick={signIn} className="kq-btn kq-btn-gold shrink-0 !min-h-[40px] text-sm">Sign in</button>
              )}
            </div>
          ) : authState === 'unauthenticated' ? (
            <div className="kq-panel kq-panel-gold px-4 py-3 text-center">
              <p className="text-sm text-kq-gold">
                {adapterMode === 'mock'
                  ? 'Development mode: Start.ng authentication is not connected.'
                  : 'Please sign in to Start.ng to play.'}
              </p>
              {adapterMode === 'mock' && (
                <button onClick={devSignIn} className="kq-btn kq-btn-ghost mt-2 w-full">
                  Sign in with the mock dev account
                </button>
              )}
            </div>
          ) : authState === 'error' ? (
            <div role="alert" className="kq-panel px-4 py-3 text-center text-sm text-red-300 border-red-500/40">
              {authError ?? 'Authentication is unavailable.'}
            </div>
          ) : (
            <div className="text-center text-sm text-kq-muted">Checking your Start.ng session…</div>
          )}
          {persistenceError && (
            <div role="alert" className="kq-panel mt-2 px-4 py-2 text-center text-sm text-red-300 border-red-500/40">
              {persistenceError}
            </div>
          )}
        </div>

        {/* Menu */}
        <nav aria-label="Main menu" className="kq-panel w-full max-w-sm p-4 flex flex-col gap-3 animate-fade-in-up stagger-4">
          {hasProgress && (
            <button onClick={continueGame} disabled={!canPlay} className="kq-btn kq-btn-primary justify-between text-lg">
              <span className="flex items-center gap-3"><Play size={20} /> Continue your quest</span>
              <ChevronRight size={18} />
            </button>
          )}
          <button
            onClick={startNewGame}
            disabled={!canPlay}
            className={`kq-btn ${hasProgress ? 'kq-btn-ghost' : 'kq-btn-primary text-lg'} justify-between`}
          >
            <span className="flex items-center gap-3"><Sword size={20} /> New Game</span>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setScreen('leaderboard')} className="kq-btn kq-btn-ghost justify-between">
            <span className="flex items-center gap-3"><Crown size={20} className="text-kq-gold" /> Leaderboard</span>
            <ChevronRight size={18} className="text-kq-muted" />
          </button>
          <button onClick={() => setScreen('achievements')} className="kq-btn kq-btn-ghost justify-between">
            <span className="flex items-center gap-3"><Trophy size={20} className="text-kq-gold" /> Achievements</span>
            <ChevronRight size={18} className="text-kq-muted" />
          </button>
          <button onClick={() => setScreen('character')} className="kq-btn kq-btn-ghost justify-between">
            <span className="flex items-center gap-3"><User size={20} className="text-kq-cyan" /> Character</span>
            <ChevronRight size={18} className="text-kq-muted" />
          </button>
          {!canPlay && authState !== 'loading' && (
            <p className="text-center text-sm text-kq-muted pt-1">Sign in to begin your adventure.</p>
          )}
        </nav>

        {hasProgress && progress && (
          <p className="text-center text-sm text-kq-muted animate-fade-in stagger-6">
            <span className="text-kq-gold font-semibold">{progress.rank}</span> · {progress.totalXp} XP ·{' '}
            {progress.completedChallenges.length} quests completed
          </p>
        )}
      </div>
    </main>
  );
}
