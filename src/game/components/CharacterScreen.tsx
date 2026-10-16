import { Suspense, lazy } from 'react';
import { ArrowLeft, ExternalLink, RotateCcw } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { SceneBoundary } from './ui/SceneBoundary';
import { ACCESSORY_OPTIONS, BODY_OPTIONS, DEFAULT_APPEARANCE, HAIR_OPTIONS, HAT_OPTIONS } from '../adapters/CharacterAppearanceAdapter';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

const CharacterPreview = lazy(() => import('./CharacterPreview').then((m) => ({ default: m.CharacterPreview })));

const SWATCHES = {
  primaryColor: ['#3b82f6', '#ef4444', '#22c55e', '#a55eea', '#f59e0b', '#14b8a6', '#ec4899', '#e5e7eb'],
  secondaryColor: ['#4b3a2c', '#1f2937', '#0c6e5a', '#7c3aed', '#374151', '#92400e', '#1e3a8a', '#be123c'],
  skinColor: ['#f8d9c0', '#e0ac85', '#c68642', '#8d5524', '#5b3a29', '#3b2219'],
  hairColor: ['#17120f', '#4a2c17', '#8a5a2b', '#d4a017', '#b34b2b', '#9ca3af', '#f3f4f6', '#a55eea'],
} as const;

const COLOR_ROWS: Array<{ key: keyof typeof SWATCHES; label: string }> = [
  { key: 'primaryColor', label: 'Top (tunic and cloak)' },
  { key: 'secondaryColor', label: 'Trousers or skirt' },
  { key: 'skinColor', label: 'Skin' },
  { key: 'hairColor', label: 'Hair color' },
];

/**
 * Your start.ng character on the 3D hero. In production the character is owned by start.ng and this screen is
 * read-only (change it on start.ng). In development a local editor lets you try every option.
 */
export function CharacterScreen() {
  const { appearance, appearanceEditable, setAppearance, setScreen, authUser } = useGame();
  const set = (partial: Partial<CharacterAppearance>) => { if (appearanceEditable) setAppearance(partial); };

  const choice = <K extends 'body' | 'hair' | 'hat' | 'accessory'>(key: K, label: string, options: readonly CharacterAppearance[K][]) => (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-kq-text">{label}</h3>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            role="radio"
            aria-checked={appearance[key] === o}
            onClick={() => set({ [key]: o } as Partial<CharacterAppearance>)}
            className={`kq-btn !min-h-[38px] !px-3 text-sm capitalize ${appearance[key] === o ? 'kq-btn-primary' : 'kq-btn-ghost'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-kq-night via-kq-deep to-kq-panel text-kq-text">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <button onClick={() => setScreen('menu')} className="kq-btn kq-btn-ghost mb-4 text-sm"><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <h1 className="mb-1 text-3xl font-bold">Your character</h1>
        <p className="mb-5 text-kq-muted">
          {appearanceEditable
            ? 'Development editor: design a character to see every option on the 3D hero. In production your character comes from start.ng.'
            : `This is your start.ng character${authUser?.displayName ? `, ${authUser.displayName}` : ''}. It looks the same in every start.ng game. Change it on start.ng.`}
        </p>

        <div className="grid gap-6 md:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-3">
            <SceneBoundary fallback={<div className="grid h-72 w-56 place-items-center rounded-2xl border border-kq-edge px-4 text-center text-sm text-kq-muted">3D preview isn&apos;t available on this device.</div>}>
              <Suspense fallback={<div className="grid h-72 w-56 place-items-center rounded-2xl border border-kq-edge text-sm text-kq-muted" role="status">Loading preview…</div>}>
                <CharacterPreview appearance={appearance} />
              </Suspense>
            </SceneBoundary>
            {!appearanceEditable && (
              <a href="https://start.ng" target="_blank" rel="noopener noreferrer" className="kq-btn kq-btn-gold text-sm">
                Edit on start.ng <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            {appearanceEditable && (
              <button onClick={() => setAppearance({ ...DEFAULT_APPEARANCE })} className="kq-btn kq-btn-ghost text-sm"><RotateCcw size={14} aria-hidden="true" /> Reset</button>
            )}
          </div>

          <fieldset disabled={!appearanceEditable} className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-80">
            {choice('body', 'Body', BODY_OPTIONS)}
            {COLOR_ROWS.map(({ key, label }) => (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold">{label}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES[key].map((c) => (
                    <button
                      key={c}
                      onClick={() => set({ [key]: c })}
                      aria-label={`${label} ${c}`}
                      aria-pressed={appearance[key] === c}
                      className={`h-9 w-9 rounded-lg transition-all ${appearance[key] === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a1327]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  {appearanceEditable && (
                    <input type="color" value={appearance[key]} onChange={(e) => set({ [key]: e.target.value })} aria-label={`Custom ${label}`} className="h-9 w-9 cursor-pointer rounded-lg border border-kq-edge bg-transparent" />
                  )}
                </div>
              </div>
            ))}
            {choice('hair', 'Hair', HAIR_OPTIONS)}
            {choice('hat', 'Hat', HAT_OPTIONS)}
            {choice('accessory', 'Accessory', ACCESSORY_OPTIONS)}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
