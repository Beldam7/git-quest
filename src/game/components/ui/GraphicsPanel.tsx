import { graphicsStore } from '../../settings/graphics';
import type { Quality } from '../../settings/graphics';
import { useGraphicsQuality } from '../../settings/graphics';

const OPTIONS: Array<{ id: Quality; label: string; hint: string }> = [
  { id: 'high', label: 'High', hint: 'Shadows and full effects' },
  { id: 'medium', label: 'Medium', hint: 'No shadows' },
  { id: 'low', label: 'Low', hint: 'Fastest, for phones and older laptops' },
];

/** Graphics quality picker for the pause menu. Changing it rebuilds the 3D world. */
export function GraphicsPanel() {
  const q = useGraphicsQuality();
  return (
    <div className="rounded-xl border border-kq-edge bg-kq-deep/60 p-3">
      <div className="mb-2 text-sm text-kq-text">Graphics</div>
      <div className="flex gap-2" role="radiogroup" aria-label="Graphics quality">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={q === o.id}
            title={o.hint}
            onClick={() => graphicsStore.set(o.id)}
            className={`kq-btn !min-h-[38px] flex-1 !px-2 text-sm ${q === o.id ? 'kq-btn-primary' : 'kq-btn-ghost'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-kq-muted">Changing this rebuilds the world.</p>
    </div>
  );
}
