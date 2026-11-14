import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AstraHealth runtime error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6">
          <div className="card-shadow w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-critical-soft text-critical">
              <AlertTriangle size={20} aria-hidden />
            </span>
            <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              The interface hit an unexpected error. Reload to return to the flight deck.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload
              </Button>
              <Button variant="secondary" onClick={() => window.location.assign("/")}>
                Go to Flight Deck
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
