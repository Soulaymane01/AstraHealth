import { RefreshCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/Button";

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "The page could not be loaded.";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      <div className="card-shadow w-full max-w-lg rounded-xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-critical-soft text-critical">
          <RefreshCw size={20} aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
          This screen could not be loaded
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{message}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          The app shell and your local drafts are still on this device.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Link to="/">
            <Button variant="secondary" size="sm">
              Back to Flight Deck
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
