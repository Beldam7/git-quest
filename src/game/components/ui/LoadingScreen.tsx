export function LoadingScreen({ label = 'Loading the kingdom…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-kq-night text-kq-text" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-full border-4 border-kq-edge border-t-kq-cyan animate-spin" aria-hidden="true" />
      <p className="font-display text-lg text-kq-muted">{label}</p>
    </div>
  );
}
