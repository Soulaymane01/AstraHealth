import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6">
      <div className="card-shadow w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Compass size={20} aria-hidden />
        </span>
        <p className="mt-4 text-xs font-medium text-accent">404</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          This page is off course.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          The route does not exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
        >
          Back to the flight deck
        </Link>
      </div>
    </div>
  );
}
