import { ArrowLeft, Award, TrendingUp, Target, Star, Zap, GitBranch, Trophy } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RANKS } from '../data/ranks';
import { WORLDS } from '../data/worlds';
import { SECRET_MISSIONS } from '../data/secretMissions';

export function ProficiencyReport() {
  const { progress, setScreen, engine } = useGame() as any;
  if (!progress || !engine) return null;

  const report = engine.getProficiencyReport();

  return (
    <div className="min-h-screen bg-gradient-to-b from-kq-night via-kq-deep to-kq-panel text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setScreen('menu')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Proficiency Report
          </h2>
        </div>

        {/* Overall score */}
        <div className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-kq-ink to-kq-panel border border-gray-700/50 text-center animate-fade-in-scale">
          <div className="text-6xl font-bold bg-gradient-to-r from-amber-400 to-green-400 bg-clip-text text-transparent mb-2 animate-gradient-shift">
            {report.proficiencyScore}
          </div>
          <div className="text-sm text-gray-400 mb-4">Proficiency Score</div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold animate-ring-pulse">
            Rank: {report.rank}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Target size={18} />} label="Quests" value={`${report.completedChallenges}/${report.totalChallenges}`} color="text-blue-400" delay={0.05} />
          <StatCard icon={<Zap size={18} />} label="Total XP" value={report.totalXp.toString()} color="text-amber-400" delay={0.1} />
          <StatCard icon={<Star size={18} />} label="Secret Missions" value={`${report.secretMissionsCompleted}/${SECRET_MISSIONS.length}`} color="text-purple-400" delay={0.15} />
          <StatCard icon={<Award size={18} />} label="No-Hint Quests" value={report.noHintChallenges.toString()} color="text-green-400" delay={0.2} />
        </div>

        {/* Worlds completed */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-200">
            <GitBranch size={18} className="text-blue-400" /> Worlds Completed
          </h3>
          <div className="space-y-2">
            {WORLDS.map((world) => {
              const completed = world.challenges.filter((c) => progress.completedChallenges.some((pc: { challengeId: string }) => pc.challengeId === c.id));
              const allDone = completed.length === world.challenges.length && world.challenges.length > 0;
              return (
                <div key={world.id} className="flex items-center justify-between p-3 rounded-lg bg-kq-ink border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${allDone ? 'bg-green-400' : completed.length > 0 ? 'bg-amber-400' : 'bg-gray-700'}`} />
                    <span className="text-sm text-gray-300">{world.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{completed.length}/{world.challenges.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Command statistics */}
        {Object.keys(report.commandStats).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-200">
              <TrendingUp size={18} className="text-green-400" /> Command Usage
            </h3>
            <div className="p-4 rounded-lg bg-kq-ink border border-gray-800">
              {Object.entries(report.commandStats)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([cmd, count]) => (
                  <div key={cmd} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="font-mono text-cyan-400">{cmd}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count as number) * 10)}%` }} />
                      </div>
                      <span className="text-gray-500 text-xs w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Rank progression */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-200">
            <Trophy size={18} className="text-amber-400" /> Rank Journey
          </h3>
          <div className="flex flex-wrap gap-2">
            {RANKS.map((rank) => {
              const achieved = progress.totalXp >= rank.minXp;
              return (
                <div
                  key={rank.name}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    achieved ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-gray-800 bg-kq-ink text-gray-600'
                  }`}
                >
                  {rank.name}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setScreen('menu')}
          className="w-full py-3 bg-kq-panel hover:bg-kq-raised rounded-xl font-semibold transition-colors border border-gray-700/50 btn-press animate-fade-in-up stagger-6"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, delay = 0 }: { icon: React.ReactNode; label: string; value: string; color: string; delay?: number }) {
  return (
    <div className="bg-kq-ink border border-gray-800 rounded-xl p-4 text-center animate-fade-in-up card-lift" style={{ animationDelay: `${delay}s` }}>
      <div className={`mx-auto mb-2 ${color}`}>{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
