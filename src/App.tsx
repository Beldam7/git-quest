import { Suspense, lazy, useEffect } from 'react';
import { GameProvider, useGame } from '@/game/context/GameContext';
import { MainMenu } from '@/game/components/MainMenu';
import { WorldMap } from '@/game/components/WorldMap';
import { GameScreen } from '@/game/components/GameScreen';
import { AchievementsScreen } from '@/game/components/AchievementsScreen';
import { CharacterScreen } from '@/game/components/CharacterScreen';
import { ProficiencyReport } from '@/game/components/ProficiencyReport';
import { LoadingScreen } from '@/game/components/ui/LoadingScreen';
import { LeaderboardScreen } from '@/game/components/LeaderboardScreen';
import { VictoryScreen } from '@/game/components/VictoryScreen';
import { gameAudio } from '@/game/audio/GameAudio';

// The 3D exploration view pulls in Three.js; load it only when the player opens it.
const ExploreView = lazy(() => import('@/game/components/ExploreView').then((m) => ({ default: m.ExploreView })));

function CurrentScreen({ screen }: { screen: string }) {
  switch (screen) {
    case 'worldMap':
      return <WorldMap />;
    case 'explore':
      return <ExploreView />;
    case 'game':
      return <GameScreen />;
    case 'victory':
      return <VictoryScreen />;
    case 'leaderboard':
      return <LeaderboardScreen />;
    case 'achievements':
      return <AchievementsScreen />;
    case 'character':
      return <CharacterScreen />;
    case 'report':
      return <ProficiencyReport />;
    default:
      return <MainMenu />;
  }
}

function GameRouter() {
  const { screen } = useGame();

  // Browsers only allow sound after a gesture: unlock on the first click/tap/key, and click-sound for buttons.
  useEffect(() => {
    const unlock = () => gameAudio.unlock();
    const click = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('button')) gameAudio.playSfx('click');
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', click, true);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', click, true);
    };
  }, []);

  // Outside a fight screen the music follows the menu / explore hub; GameScreen picks the map's theme itself.
  useEffect(() => {
    if (screen === 'game') return;
    gameAudio.setTheme(screen === 'explore' ? 1 : 'menu');
    gameAudio.setMood(screen === 'explore' ? 'explore' : 'menu');
  }, [screen]);
  // The key is the screen name: it replays the enter animation on navigation only.
  // (A random key would remount the whole screen, including the WebGL canvas, on every render.)
  return (
    <div key={screen} className="screen-enter">
      <Suspense fallback={<LoadingScreen />}>
        <CurrentScreen screen={screen} />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}

export default App;
