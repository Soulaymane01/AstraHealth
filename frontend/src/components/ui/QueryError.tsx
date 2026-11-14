import { AlertTriangle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

export interface QueryErrorProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  secondaryAction?: ReactNode;
  className?: string;
}

export function QueryError({
  title,
  message = "The data could not be loaded. Check the connection and try again.",
  onRetry,
  retrying = false,
  secondaryAction,
  className,
}: QueryErrorProps) {
  return (
    <div className={cn("mx-auto max-w-xl py-8", className)}>
      <Panel title={title}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted">
            <AlertTriangle size={16} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">That view is unavailable.</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{message}</p>
            {onRetry && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={retrying}
                onClick={onRetry}
              >
                <RotateCcw size={12} aria-hidden />
                {retrying ? "Trying again…" : "Try again"}
              </Button>
            )}
            {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
          </div>
        </div>
      </Panel>
    </div>
  );
}
