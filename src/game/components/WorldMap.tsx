import { ArrowLeft, Lock, MapPin, Star, Skull } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { WORLDS, secretMissions } from '../data/worlds';
import { SECRET_MISSIONS } from '../data/secretMissions';
import { RANKS } from '../data/ranks';

export function WorldMap() {
  const { progress, enterWorld, setScreen, startChallenge } = useGame();

  if (!progress) return null;

  const discoveredMissions = SECRET_MISSIONS.filter((m) => m.discoverCondition(progress) && !progress.secretMissionsCompleted.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-kq-night via-kq-deep to-kq-panel text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setScreen('menu')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Main Menu</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-amber-400 font-semibold text-sm">{progress.rank}</div>
              <div className="text-gray-500 text-xs">{progress.totalXp} XP · Level {progress.level}</div>
            </div>
            <button
              onClick={() => setScreen('explore')}
              className="px-3 py-1.5 text-sm bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg border border-green-500/30 transition-colors"
            >
              Explore Kingdom (3D)
            </button>
            <button
              onClick={() => setScreen('achievements')}
              className="px-3 py-1.5 text-sm bg-kq-panel hover:bg-kq-raised rounded-lg border border-gray-700/50 transition-colors"
            >
              Achievements
            </button>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent animate-gradient-shift">
          World Map
        </h2>
        <p className="text-gray-500 text-sm mb-8 animate-fade-in stagger-2">Choose a world to explore. Complete quests and defeat bosses to unlock new regions.</p>

        {/* Worlds grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORLDS.map((world, idx) => {
            const unlocked = progress.unlockedWorlds.includes(world.id);
            const completedChallenges = world.challenges.filter((c) => progress.completedChallenges.some((pc) => pc.challengeId === c.id));
            const allComplete = completedChallenges.length === world.challenges.length && world.challenges.length > 0;
            const bossDefeated = world.challenges.find((c) => c.isBoss && progress.completedChallenges.some((pc) => pc.challengeId === c.id));

            return (
              <div
                key={world.id}
                className={`relative rounded-xl border transition-all overflow-hidden ${
                  unlocked
                    ? 'cursor-pointer hover:scale-[1.02] hover:border-opacity-60'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                style={{
                  borderColor: unlocked ? world.color + '50' : '#333',
                  background: `linear-gradient(135deg, ${unlocked ? world.color + '15' : '#111'}, #0f1729)`,
                }}
                onClick={() => unlocked && enterWorld(world.id)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {unlocked ? (
                          <MapPin size={14} style={{ color: world.color }} />
                        ) : (
                          <Lock size={14} className="text-gray-600" />
                        )}
                        <span className="text-xs text-gray-500 uppercase tracking-wider">{world.region}</span>
                      </div>
                      <h3 className="text-lg font-bold" style={{ color: unlocked ? world.accentColor : '#666' }}>
                        {world.name}
                      </h3>
                    </div>
                    {allComplete && (
                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        <Star size={12} fill="currentColor" />
                        Complete
                      </div>
                    )}
                  </div>

                  <p className="text-gray-400 text-xs leading-relaxed mb-3">{world.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Skull size={12} className={bossDefeated ? 'text-green-400' : 'text-red-400'} />
                      <span className={bossDefeated ? 'text-green-400' : 'text-red-400'}>
                        {bossDefeated ? 'Boss Defeated' : `Boss: ${world.bossName}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {completedChallenges.length}/{world.challenges.length} quests
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full progress-fill"
                      style={{
                        width: `${world.challenges.length > 0 ? (completedChallenges.length / world.challenges.length) * 100 : 0}%`,
                        backgroundColor: world.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Secret missions */}
        {discoveredMissions.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
              <Star size={18} fill="currentColor" />
              Secret Missions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discoveredMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 cursor-pointer hover:bg-purple-500/10 transition-colors"
                  onClick={() => {
                    const challenge = secretMissions.find((c) => c.id === mission.challengeId);
                    if (challenge) startChallenge(challenge.id);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-400 font-semibold text-sm">{mission.name}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{mission.description}</p>
                  <div className="mt-2 text-xs text-amber-400">+{mission.xpReward} XP · Rare collectible</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rank progression */}
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4 text-gray-300">Rank Progression</h3>
          <div className="flex flex-wrap gap-3">
            {RANKS.map((rank, idx) => {
              const achieved = progress.totalXp >= rank.minXp;
              const isCurrent = progress.rank === rank.name;
              return (
                <div
                  key={rank.name}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all animate-fade-in-scale ${
                    isCurrent
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 animate-ring-pulse'
                      : achieved
                        ? 'border-green-500/30 bg-green-500/5 text-green-400'
                        : 'border-gray-700/50 bg-kq-ink text-gray-600'
                  }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {rank.name}
                  {!achieved && <span className="ml-2 text-xs">({rank.minXp} XP)</span>}
                  {isCurrent && <span className="ml-2 text-xs">★</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
