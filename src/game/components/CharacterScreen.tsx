import { Suspense, lazy, useEffect, useState } from 'react';
import { ArrowLeft, Palette, Shirt, Sparkles, Save } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { SceneBoundary } from './ui/SceneBoundary';
import { ACCESSORY_OPTIONS, MATERIAL_OPTIONS, DEFAULT_APPEARANCE, sanitizeAppearance } from '../adapters/CharacterAppearanceAdapter';
import type { CharacterAccessory, CharacterAppearance, CharacterMaterial } from '../adapters/CharacterAppearanceAdapter';

const CharacterPreview = lazy(() => import('./CharacterPreview').then((m) => ({ default: m.CharacterPreview })));

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#fbbf24', '#a855f7',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6',
];

export function CharacterScreen() {
  const { appearance, appearanceEditable, setAppearance, setScreen, adapterMode } = useGame();
  const [draft, setDraft] = useState<CharacterAppearance>(appearance);

  useEffect(() => {
    if (!appearanceEditable) setDraft(appearance);
  }, [appearance, appearanceEditable]);

  const updateDraft = (partial: Partial<CharacterAppearance>) => {
    setDraft((prev) => sanitizeAppearance({ ...prev, ...partial }));
  };

  const applyChanges = () => {
    if (appearanceEditable) setAppearance(draft);
  };

  const resetToDefault = () => {
    setDraft({ ...DEFAULT_APPEARANCE });
    if (appearanceEditable) setAppearance({ ...DEFAULT_APPEARANCE });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-kq-night via-kq-deep to-kq-panel text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setScreen('menu')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Character
          </h2>
        </div>

        {/* Source-of-truth notice */}
        <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400/80">
          {appearanceEditable
            ? 'MOCK styling (development only): these local preview settings are not Start.ng\'s centralized styling. In production the appearance adapter must supply them. See docs/START_NG_INTEGRATION.md.'
            : `Your character's appearance is managed by Start.ng${adapterMode === 'startng' ? ' (integration not yet connected, so defaults are shown)' : ''}. It cannot be edited inside the game.`}
        </div>

        {/* Character preview: the real 3D model, driven by the same appearance values the game uses */}
        <div className="mb-8 flex items-center justify-center animate-fade-in-scale">
          <SceneBoundary fallback={<div className="grid h-72 w-56 place-items-center rounded-2xl border border-kq-edge px-4 text-center text-sm text-kq-muted">3D preview isn&apos;t available on this device.</div>}>
            <Suspense fallback={<div className="grid h-72 w-56 place-items-center rounded-2xl border border-kq-edge text-sm text-kq-muted" role="status">Loading preview…</div>}>
              <CharacterPreview appearance={draft} />
            </Suspense>
          </SceneBoundary>
        </div>

        <fieldset disabled={!appearanceEditable} className="border-0 p-0 m-0 min-w-0 disabled:opacity-60">
        {/* Primary color */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Palette size={14} /> Primary Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateDraft({ primaryColor: color })}
                aria-label={`primary color ${color}`}
                aria-pressed={draft.primaryColor === color}
                className={`w-10 h-10 rounded-lg transition-all ${draft.primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-kq-deep scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Secondary color */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Palette size={14} /> Secondary Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateDraft({ secondaryColor: color })}
                aria-label={`secondary color ${color}`}
                aria-pressed={draft.secondaryColor === color}
                className={`w-10 h-10 rounded-lg transition-all ${draft.secondaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-kq-deep scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Sparkles size={14} /> Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateDraft({ accentColor: color })}
                aria-label={`accent color ${color}`}
                aria-pressed={draft.accentColor === color}
                className={`w-10 h-10 rounded-lg transition-all ${draft.accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-kq-deep scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Accessory */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Shirt size={14} /> Accessory
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {ACCESSORY_OPTIONS.map((acc: CharacterAccessory) => (
              <button
                key={acc}
                onClick={() => updateDraft({ accessory: acc })}
                className={`px-3 py-2 rounded-lg text-xs capitalize transition-all ${
                  draft.accessory === acc
                    ? 'bg-blue-600 text-white'
                    : 'bg-kq-ink text-gray-400 border border-gray-700/50 hover:bg-kq-panel'
                }`}
              >
                {acc.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Material variant */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Sparkles size={14} /> Material
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {MATERIAL_OPTIONS.map((mat: CharacterMaterial) => (
              <button
                key={mat}
                onClick={() => updateDraft({ materialVariant: mat })}
                className={`px-3 py-2 rounded-lg text-xs capitalize transition-all ${
                  draft.materialVariant === mat
                    ? 'bg-green-600 text-white'
                    : 'bg-kq-ink text-gray-400 border border-gray-700/50 hover:bg-kq-panel'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>

        </fieldset>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { applyChanges(); setScreen('menu'); }}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 btn-press"
          >
            <Save size={16} /> {appearanceEditable ? 'Save Appearance' : 'Back'}
          </button>
          <button
            onClick={resetToDefault}
            disabled={!appearanceEditable}
            className="disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3 bg-kq-panel hover:bg-kq-raised rounded-xl font-semibold transition-colors border border-gray-700/50 btn-press"
          >
            Reset
          </button>
        </div>

        {/* Manual verification */}
        <div className="mt-8 p-4 rounded-xl bg-kq-ink border border-gray-700/30">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Manual Verification Procedure</h4>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Change a supported setting above</li>
            <li>Return to the game and observe the 3D character</li>
            <li>Confirm the character's colors, accessory, and material match your selection</li>
            <li>In production: change a Start.ng centralized styling setting, reopen Git Quest, and verify the 3D character reflects the change</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
