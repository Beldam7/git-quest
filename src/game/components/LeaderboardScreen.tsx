import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Crown, Gem, RefreshCw, Swords } from 'lucide-react';
import { useGame } from '../context/GameContext';
import type { LeaderboardEntry } from '../adapters/LeaderboardAdapter';
import { Backdrop } from './ui/Backdrop';

const MEDAL = ['🥇', '🥈', '🥉'];

export function LeaderboardScreen() {
  const { setScreen, loadLeaderboard, leaderboardIsMock, leaderboardLabel, authUser, signIn, canSignIn } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setEntries(null);
    setError(null);
    loadLeaderboard(20).then(setEntries).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the leaderboard.'));
  }, [loadLeaderboard]);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-kq-night text-kq-text">
      <Backdrop />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button onClick={() => setScreen('menu')} className="kq-btn kq-btn-ghost text-sm"><ArrowLeft size={16} aria-hidden="true" /> Menu</button>
          <button onClick={load} className="kq-btn kq-btn-ghost text-sm"><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
        </div>

        <div className="mb-5 text-center">
          <Crown size={40} className="mx-auto text-kq-gold" aria-hidden="true" />
          <h1 className="kq-gold-text mt-2 text-4xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-kq-muted">The top Git adventurers, ranked by XP.</p>
        </div>

        {leaderboardIsMock && (
          <div role="note" className="kq-panel kq-panel-gold mb-4 px-4 py-2 text-center text-sm text-kq-gold">
            {leaderboardLabel}. Players marked DEMO are samples. This is not a shared online ranking yet.
          </div>
        )}

        {authUser?.isGuest && !authUser.offline && canSignIn && (
          <div className="kq-panel mb-4 flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="text-kq-muted">You are playing as a guest. Sign in with start.ng to put your score on the board.</span>
            <button onClick={signIn} className="kq-btn kq-btn-gold shrink-0 !min-h-[40px]">Sign in</button>
          </div>
        )}

        {error && <div role="alert" className="kq-panel mb-4 border-red-500/40 px-4 py-3 text-center text-sm text-red-300">{error}</div>}
        {!error && entries === null && <div className="py-10 text-center text-kq-muted" role="status">Loading the hall of heroes…</div>}
        {entries && entries.length === 0 && <div className="py-10 text-center text-kq-muted">No scores yet. Be the first!</div>}

        {entries && entries.length > 0 && (
          <ol className="space-y-2" aria-label="Top players">
            {entries.map((e, i) => {
              const me = authUser?.id === e.userId;
              return (
                <li key={e.userId} className={`kq-panel flex items-center gap-3 px-3 py-2.5 sm:px-4 ${me ? 'border-kq-cyan/70 ring-1 ring-kq-cyan/40' : ''}`}>
                  <div className="w-9 shrink-0 text-center font-display text-lg text-kq-gold">{MEDAL[i] ?? i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold">{e.displayName}</span>
                      {me && <span className="rounded bg-kq-cyan/20 px-1.5 text-xs text-kq-cyan">You</span>}
                      {e.demo && <span className="rounded bg-gray-700/60 px-1.5 text-xs text-kq-muted">DEMO</span>}
                    </div>
                    <div className="truncate text-sm text-kq-muted">{e.rank || 'Adventurer'} · Level {e.level}</div>
                  </div>
                  <div className="hidden items-center gap-3 text-sm text-kq-muted sm:flex">
                    <span title="Worlds cleared" className="flex items-center gap-1"><Swords size={14} aria-hidden="true" />{e.worldsCleared}/8</span>
                    <span title="Gems" className="flex items-center gap-1"><Gem size={14} className="text-kq-cyan" aria-hidden="true" />{e.gems}</span>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <div className="font-display text-lg font-bold text-kq-gold tabular-nums">{e.totalXp}</div>
                    <div className="text-xs text-kq-muted">XP</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
