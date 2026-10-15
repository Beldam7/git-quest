import { ArrowLeft, Trophy, Lock, Star, Gem, Award } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ACHIEVEMENTS, COLLECTIBLES, RANKS } from '../data/ranks';
import { SECRET_MISSIONS } from '../data/secretMissions';

export function AchievementsScreen() {
  const { progress, setScreen } = useGame();

  if (!progress) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-kq-night via-kq-deep to-kq-panel text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setScreen('menu')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
            Achievements
          </h2>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-kq-ink border border-gray-800 rounded-xl p-4 text-center animate-fade-in-up stagger-1 card-lift">
            <Trophy size={20} className="mx-auto mb-2 text-amber-400" />
            <div className="text-2xl font-bold">{progress.achievements.length}</div>
            <div className="text-xs text-gray-500">Unlocked</div>
          </div>
          <div className="bg-kq-ink border border-gray-800 rounded-xl p-4 text-center animate-fade-in-up stagger-2 card-lift">
            <Gem size={20} className="mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold">{progress.collectibles.length}</div>
            <div className="text-xs text-gray-500">Collectibles</div>
          </div>
          <div className="bg-kq-ink border border-gray-800 rounded-xl p-4 text-center animate-fade-in-up stagger-3 card-lift">
            <Star size={20} className="mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{progress.secretMissionsCompleted.length}</div>
            <div className="text-xs text-gray-500">Secret Missions</div>
          </div>
        </div>

        {/* Achievements list */}
        <h3 className="text-xl font-bold mb-4 text-gray-200">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {ACHIEVEMENTS.map((ach, idx) => {
            const unlocked = progress.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-all animate-fade-in-scale card-lift ${
                  unlocked
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-gray-800 bg-kq-ink'
                }`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${unlocked ? 'bg-amber-500/20' : 'bg-gray-800'}`}>
                    {unlocked ? <Award size={20} className="text-amber-400" /> : <Lock size={16} className="text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${unlocked ? 'text-amber-400' : 'text-gray-500'}`}>
                      {ach.hidden && !unlocked ? 'Hidden Achievement' : ach.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ach.hidden && !unlocked ? 'Discover to reveal' : ach.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collectibles */}
        <h3 className="text-xl font-bold mb-4 text-gray-200">Collectibles</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {COLLECTIBLES.map((col, idx) => {
            const owned = progress.collectibles.includes(col.id);
            const rarityColor = col.rarity === 'legendary' ? 'text-amber-400' : col.rarity === 'rare' ? 'text-purple-400' : 'text-blue-400';
            return (
              <div
                key={col.id}
                className={`p-3 rounded-xl border text-center animate-fade-in-scale card-lift ${owned ? 'border-gray-700/50 bg-kq-ink' : 'border-gray-800/50 bg-kq-night opacity-50'}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <Gem size={24} className={`mx-auto mb-2 ${owned ? rarityColor : 'text-gray-700'}`} />
                <div className={`text-xs font-semibold ${owned ? 'text-gray-300' : 'text-gray-600'}`}>
                  {owned ? col.name : '???'}
                </div>
                <div className={`text-xs ${owned ? rarityColor : 'text-gray-700'} capitalize`}>{col.rarity}</div>
              </div>
            );
          })}
        </div>

        {/* Secret missions */}
        <h3 className="text-xl font-bold mb-4 text-gray-200">Secret Missions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {SECRET_MISSIONS.map((mission) => {
            const completed = progress.secretMissionsCompleted.includes(mission.id);
            const discovered = mission.discoverCondition(progress) || completed;
            return (
              <div
                key={mission.id}
                className={`p-4 rounded-xl border ${
                  completed
                    ? 'border-purple-500/30 bg-purple-500/5'
                    : discovered
                      ? 'border-purple-500/20 bg-purple-500/5'
                      : 'border-gray-800 bg-kq-ink'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star size={14} className={completed ? 'text-purple-400' : discovered ? 'text-purple-400/60' : 'text-gray-700'} fill="currentColor" />
                  <span className={`font-semibold text-sm ${completed ? 'text-purple-400' : discovered ? 'text-purple-300' : 'text-gray-600'}`}>
                    {discovered || completed ? mission.name : 'Undiscovered'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {discovered || completed ? mission.description : 'Complete more challenges to discover this mission.'}
                </p>
                {completed && <div className="mt-2 text-xs text-green-400">Completed · +{mission.xpReward} XP</div>}
              </div>
            );
          })}
        </div>

        {/* Rank overview */}
        <h3 className="text-xl font-bold mb-4 text-gray-200">Ranks</h3>
        <div className="space-y-2 mb-8">
          {RANKS.map((rank) => {
            const achieved = progress.totalXp >= rank.minXp;
            const isCurrent = progress.rank === rank.name;
            return (
              <div
                key={rank.name}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isCurrent ? 'border-amber-500/40 bg-amber-500/10' : achieved ? 'border-green-500/20 bg-green-500/5' : 'border-gray-800 bg-kq-ink'
                }`}
              >
                <div>
                  <div className={`font-semibold text-sm ${isCurrent ? 'text-amber-400' : achieved ? 'text-green-400' : 'text-gray-500'}`}>
                    {rank.name}
                  </div>
                  <div className="text-xs text-gray-600">{rank.description}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {rank.minXp} XP · {rank.requiredWorlds} worlds
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setScreen('menu')}
          className="w-full py-3 bg-kq-panel hover:bg-kq-raised rounded-xl font-semibold transition-colors border border-gray-700/50 btn-press animate-fade-in-up stagger-8"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
