import { Orbit } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Orbit size={18} className="animate-pulse" aria-hidden />
        </span>
        <p className="text-sm text-muted">Loading your flight deck…</p>
      </div>
    </div>
  );
}
