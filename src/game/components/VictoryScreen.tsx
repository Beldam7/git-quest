import { useEffect } from 'react';
import { Crown, Gem, Star, Swords, Trophy } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Backdrop } from './ui/Backdrop';
import { gameAudio } from '../audio/GameAudio';

/** Shown after the Merge Dragon falls: the player has completed the kingdom. */
export function VictoryScreen() {
  const { progress, engine, setScreen } = useGame();

  useEffect(() => {
    gameAudio.playSfx('levelup');
    const t = setTimeout(() => gameAudio.playSfx('victory'), 700);
    return () => clearTimeout(t);
  }, []);

  if (!progress || !engine) return null;
  const report = engine.getProficiencyReport();
  const stat = (icon: React.ReactNode, label: string, value: string | number) => (
    <div className="kq-panel flex items-center gap-3 px-4 py-3">
      <div className="text-kq-gold" aria-hidden="true">{icon}</div>
      <div>
        <div className="font-display text-xl font-bold tabular-nums">{value}</div>
        <div className="text-sm text-kq-muted">{label}</div>
      </div>
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-kq-night text-kq-text">
      <Backdrop />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <Crown size={64} className="animate-float text-kq-gold" aria-hidden="true" />
        <div>
          <h1 className="kq-gold-text text-5xl font-bold sm:text-6xl">Kingdom Saved!</h1>
          <p className="mt-3 text-lg text-kq-muted">The Merge Dragon has fallen and every repository in the realm is whole again.</p>
        </div>
        <div className="kq-panel kq-panel-gold w-full px-5 py-4">
          <div className="text-sm text-kq-muted">Your rank</div>
          <div className="font-display text-3xl font-bold text-kq-gold">{progress.rank}</div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3">
          {stat(<Star size={22} />, 'Total XP', progress.totalXp)}
          {stat(<Swords size={22} />, 'Quests completed', `${report.completedChallenges}/${report.totalChallenges}`)}
          {stat(<Gem size={22} />, 'Gems collected', progress.collectedGems?.length ?? 0)}
          {stat(<Trophy size={22} />, 'Proficiency score', `${report.proficiencyScore}/100`)}
        </div>
        <p className="text-sm text-kq-muted">
          {report.secretMissionsCompleted}/4 secret missions found · {report.noHintChallenges} quests cleared without hints
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button onClick={() => setScreen('leaderboard')} className="kq-btn kq-btn-gold flex-1 text-lg">See the leaderboard</button>
          <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-primary flex-1 text-lg">Keep exploring</button>
        </div>
        <button onClick={() => setScreen('menu')} className="kq-btn kq-btn-ghost">Main menu</button>
      </div>
    </main>
  );
}
