import { Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from '../../audio/GameAudio';
import { useAudioSettings } from '../../audio/useAudio';

/** One-tap mute/unmute for music and sound effects. */
export function AudioToggle({ className = '' }: { className?: string }) {
  const s = useAudioSettings();
  const muted = !s.musicOn && !s.sfxOn;
  return (
    <button
      onClick={() => { gameAudio.unlock(); gameAudio.setMuted(!muted); }}
      className={`kq-btn kq-btn-ghost !min-h-[40px] !px-3 text-sm ${className}`}
      aria-label={muted ? 'Turn sound on' : 'Mute sound'}
      aria-pressed={muted}
    >
      {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} className="text-kq-cyan" aria-hidden="true" />}
    </button>
  );
}

/** Volume sliders for the pause menu. */
export function AudioPanel() {
  const s = useAudioSettings();
  const row = (label: string, on: boolean, vol: number, onToggle: () => void, onVol: (v: number) => void) => (
    <div className="flex items-center gap-3">
      <label className="flex w-24 items-center gap-2 text-sm text-kq-text">
        <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 accent-[#3dd6f5]" /> {label}
      </label>
      <input
        type="range" min={0} max={1} step={0.05} value={vol} disabled={!on} aria-label={`${label} volume`}
        onChange={(e) => onVol(Number(e.target.value))}
        className="h-2 flex-1 accent-[#3dd6f5] disabled:opacity-40"
      />
    </div>
  );
  return (
    <div className="space-y-3 rounded-xl border border-kq-edge bg-kq-deep/60 p-3">
      {row('Music', s.musicOn, s.musicVolume, () => { gameAudio.unlock(); gameAudio.update({ musicOn: !s.musicOn }); }, (v) => gameAudio.update({ musicVolume: v }))}
      {row('Effects', s.sfxOn, s.sfxVolume, () => { gameAudio.unlock(); gameAudio.update({ sfxOn: !s.sfxOn }); }, (v) => { gameAudio.update({ sfxVolume: v }); gameAudio.playSfx('xp'); })}
    </div>
  );
}
