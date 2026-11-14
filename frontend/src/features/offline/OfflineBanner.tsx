import { AlertTriangle, CloudUpload, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatCommsWindow, nextCommsWindow } from "@/features/offline/comms";
import { useOfflineStore } from "@/features/offline/store";

export function OfflineBanner() {
  const online = useOfflineStore((state) => state.online);
  const pending = useOfflineStore((state) => state.pending);
  const failed = useOfflineStore((state) => state.failed);
  const syncing = useOfflineStore((state) => state.syncing);
  const lastError = useOfflineStore((state) => state.lastError);
  const sync = useOfflineStore((state) => state.sync);
  const discardFailed = useOfflineStore((state) => state.discardFailed);

  if (online && pending === 0 && failed === 0 && !syncing) return null;

  const windowLabel = formatCommsWindow(nextCommsWindow());
  const queuedLabel = pending === 1 ? "1 check-in" : `${pending} check-ins`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-line bg-watch-soft/70 px-4 py-2 text-watch lg:px-8"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          {!online ? (
            <WifiOff size={13} className="mt-0.5 shrink-0" aria-hidden />
          ) : failed > 0 ? (
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
          ) : syncing ? (
            <Spinner className="mt-0.5 text-watch" />
          ) : (
            <CloudUpload size={13} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <p className="text-[11px] leading-relaxed">
            {!online ? (
              <>
                <span className="font-medium">Offline.</span> Showing last synced data where
                available; check-in drafts stay on this device.
                {pending > 0 && <> {queuedLabel} queued.</>} Next comms window at{" "}
                <span className="tabular">{windowLabel}</span>.
              </>
            ) : failed > 0 ? (
              <>
                <span className="font-medium">
                  {failed === 1 ? "1 check-in" : `${failed} check-ins`} could not sync.
                </span>{" "}
                {lastError ?? "Discard it and submit a new check-in."}
              </>
            ) : syncing ? (
              <>
                <span className="font-medium">Syncing {queuedLabel}…</span> Data is submitted
                exactly once.
              </>
            ) : (
              <>
                <span className="font-medium">{queuedLabel} waiting to sync.</span> Next comms
                window at <span className="tabular">{windowLabel}</span>.
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-5 sm:pl-0">
          {failed > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="border-watch/20 bg-surface text-watch hover:bg-watch-soft"
              onClick={() => void discardFailed()}
            >
              Discard failed
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="border-watch/20 bg-surface text-watch hover:bg-watch-soft"
              disabled={!online || syncing || pending === 0}
              onClick={() => void sync()}
            >
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
