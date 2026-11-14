import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { StepKey } from "@/features/checkin/checkin-config";
import type { CheckinFormState, CheckinPayload } from "@/features/checkin/checkin-form";

export interface CheckinDraft {
  version: 1;
  form: CheckinFormState;
  step: number;
  skipped: StepKey[];
  startedAt: string;
  idempotencyKey: string;
  updatedAt: number;
}

export type QueuedCheckinStatus = "pending" | "failed";

export interface QueuedCheckin {
  id: string;
  userId: number;
  payload: CheckinPayload;
  queuedAt: number;
  attempts: number;
  lastAttemptAt: number | null;
  lastError: string | null;
  status: QueuedCheckinStatus;
}

interface AstraHealthDB extends DBSchema {
  drafts: {
    key: string;
    value: CheckinDraft;
  };
  checkinQueue: {
    key: string;
    value: QueuedCheckin;
    indexes: { "by-user": number };
  };
}

let databasePromise: Promise<IDBPDatabase<AstraHealthDB>> | null = null;

function database() {
  if (databasePromise === null) {
    databasePromise = openDB<AstraHealthDB>("astrahealth", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts");
        }
        if (!db.objectStoreNames.contains("checkinQueue")) {
          const queue = db.createObjectStore("checkinQueue", { keyPath: "id" });
          queue.createIndex("by-user", "userId");
        }
      },
    });
  }
  return databasePromise;
}

export function draftKey(userId: number): string {
  return `checkin:${userId}`;
}

export async function getLocalDatabase(): Promise<IDBPDatabase<AstraHealthDB>> {
  return database();
}
