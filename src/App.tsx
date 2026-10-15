import { Suspense, lazy } from 'react';
import { GameProvider, useGame } from '@/game/context/GameContext';
import { MainMenu } from '@/game/components/MainMenu';
import { WorldMap } from '@/game/components/WorldMap';
import { GameScreen } from '@/game/components/GameScreen';
import { AchievementsScreen } from '@/game/components/AchievementsScreen';
import { CharacterScreen } from '@/game/components/CharacterScreen';
import { ProficiencyReport } from '@/game/components/ProficiencyReport';
import { LoadingScreen } from '@/game/components/ui/LoadingScreen';

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
