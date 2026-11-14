import { api, isNetworkError } from "@/lib/api/client";
import {
  listQueuedCheckins,
  removeQueuedCheckin,
  updateQueuedCheckin,
} from "@/features/offline/queue";

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
  stoppedByNetwork: boolean;
  stoppedByAuth: boolean;
}

function permanentFailure(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401 && status !== 429;
}

function responseMessage(status: number): string {
  if (status === 404) return "A reading in this check-in is no longer available.";
  if (status === 422) return "The server rejected this check-in. Discard it and submit again.";
  if (status === 409)
    return "This check-in conflicted with the server. Discard it and submit again.";
  return `The server rejected this check-in (${status}).`;
}

export async function syncQueuedCheckins(userId: number): Promise<SyncResult> {
  const items = await listQueuedCheckins(userId);
  let synced = 0;
  let failed = 0;
  let stoppedByNetwork = false;
  let stoppedByAuth = false;

  for (const item of items) {
    if (item.status === "failed") continue;

    try {
      const { data, response } = await api.POST("/checkins", { body: item.payload });
      if (data) {
        await removeQueuedCheckin(item.id);
        synced += 1;
        continue;
      }

      const status = response.status;
      if (permanentFailure(status)) {
        await updateQueuedCheckin(item.id, {
          status: "failed",
          attempts: item.attempts + 1,
          lastAttemptAt: Date.now(),
          lastError: responseMessage(status),
        });
        failed += 1;
        continue;
      }

      if (status === 401) {
        stoppedByAuth = true;
        break;
      }

      await updateQueuedCheckin(item.id, {
        attempts: item.attempts + 1,
        lastAttemptAt: Date.now(),
        lastError:
          status === 429
            ? "The server is rate limiting sync. It will retry shortly."
            : "The server is unavailable. It will retry at the next sync.",
      });
      break;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await updateQueuedCheckin(item.id, {
        attempts: item.attempts + 1,
        lastAttemptAt: Date.now(),
        lastError: "Waiting for a connection.",
      });
      stoppedByNetwork = true;
      break;
    }
  }

  const remaining = (await listQueuedCheckins(userId)).filter(
    (item) => item.status === "pending",
  ).length;
  return { synced, failed, remaining, stoppedByNetwork, stoppedByAuth };
}
