import { useSyncExternalStore } from 'react';
import { gameAudio } from './GameAudio';
import type { AudioSettings } from './GameAudio';

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(gameAudio.subscribe, gameAudio.getSettings);
}
