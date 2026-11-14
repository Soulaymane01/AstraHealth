import { getLocalDatabase, type QueuedCheckin } from "@/lib/local-db";
import type { CheckinPayload } from "@/features/checkin/checkin-form";

export async function enqueueCheckin(
  userId: number,
  payload: CheckinPayload,
): Promise<QueuedCheckin> {
  const db = await getLocalDatabase();
  const id = payload.idempotency_key;
  const existing = await db.get("checkinQueue", id);
  if (existing) return existing;

  const item: QueuedCheckin = {
    id,
    userId,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    status: "pending",
  };
  await db.add("checkinQueue", item);
  return item;
}

export async function listQueuedCheckins(userId: number): Promise<QueuedCheckin[]> {
  const db = await getLocalDatabase();
  const items = await db.getAllFromIndex("checkinQueue", "by-user", userId);
  return items.sort((left, right) => left.queuedAt - right.queuedAt);
}

export async function updateQueuedCheckin(
  id: string,
  patch: Partial<QueuedCheckin>,
): Promise<void> {
  const db = await getLocalDatabase();
  const existing = await db.get("checkinQueue", id);
  if (!existing) return;
  await db.put("checkinQueue", { ...existing, ...patch });
}

export async function removeQueuedCheckin(id: string): Promise<void> {
  const db = await getLocalDatabase();
  await db.delete("checkinQueue", id);
}

export async function discardFailedCheckins(userId: number): Promise<number> {
  const items = await listQueuedCheckins(userId);
  const failed = items.filter((item) => item.status === "failed");
  const db = await getLocalDatabase();
  const transaction = db.transaction("checkinQueue", "readwrite");
  await Promise.all(failed.map((item) => transaction.store.delete(item.id)));
  await transaction.done;
  return failed.length;
}
