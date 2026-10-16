import { useEffect, useRef } from 'react';
import { Footprints, Swords, HeartCrack, Gem, X } from 'lucide-react';

/** First-visit tutorial: four plain-language cards that explain the whole loop at a glance. */
export function HowToPlay({ touch, onClose }: { touch: boolean; onClose: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cards = [
    { icon: <Footprints size={26} className="text-kq-cyan" />, title: 'Follow the glowing path', text: touch ? 'Drag the stick to walk, tap Jump to leap, or tap "Walk to monster".' : 'Walk with WASD or the arrow keys, press Space to jump, or press "Walk to monster". Scroll to zoom.' },
    { icon: <Swords size={26} className="text-kq-gold" />, title: 'Fight with Git commands', text: 'Stand near a monster, then type the right Git command in the terminal. A correct command hurts it. Stuck? Press Hint.' },
    { icon: <HeartCrack size={26} className="text-kq-ruby" />, title: 'Wrong commands hurt you', text: 'Each mistake costs health, but the game explains what went wrong. At zero you restart the level. Beating a monster heals you. Want zero pressure? Turn on Practice mode in the Pause menu.' },
    { icon: <Gem size={26} className="text-kq-emerald" />, title: 'Collect gems', text: 'Walk through the gems along the path for bonus XP. Defeat the boss at the end to clear the world.' },
  ];

  return (
    <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="howto-title" className="kq-panel kq-panel-gold w-full max-w-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="howto-title" className="kq-gold-text text-2xl font-bold sm:text-3xl">How to play</h2>
          <button onClick={onClose} aria-label="Close tutorial" className="p-1 text-kq-muted hover:text-kq-text"><X size={20} /></button>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {cards.map((c, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-kq-edge bg-kq-deep/70 p-3">
              <div className="mt-0.5 shrink-0">{c.icon}</div>
              <div>
                <div className="font-bold text-kq-text">{i + 1}. {c.title}</div>
                <p className="text-base text-kq-muted">{c.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <button ref={ok} onClick={onClose} className="kq-btn kq-btn-primary mt-5 w-full text-lg">Start playing</button>
      </div>
    </div>
  );
}
