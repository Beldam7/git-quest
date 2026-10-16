import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

export type StickVector = { x: number; z: number };

/** On-screen movement stick for touch devices. Writes a -1..1 vector the 3D controller reads each frame. */
export function TouchStick({ vector, className = 'absolute bottom-6 left-6' }: { vector: MutableRefObject<StickVector>; className?: string }) {
  const RADIUS = 48;
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / RADIUS;
    const nz = dy / RADIUS;
    vector.current = Math.hypot(nx, nz) < 0.15 ? { x: 0, z: 0 } : { x: nx, z: nz };
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    vector.current = { x: 0, z: 0 };
  };

  return (
    <div
      ref={base}
      role="group"
      aria-label="Movement stick"
      className={`${className} h-32 w-32 touch-none select-none rounded-full border border-kq-edge bg-kq-deep/70 backdrop-blur`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-kq-cyan/70 bg-kq-cyan/25"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
