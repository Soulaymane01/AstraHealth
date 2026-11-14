import { draftKey, getLocalDatabase, type CheckinDraft } from "@/lib/local-db";

export type { CheckinDraft };

export async function loadCheckinDraft(userId: number): Promise<CheckinDraft | null> {
  const draft = await (await getLocalDatabase()).get("drafts", draftKey(userId));
  if (!draft || draft.version !== 1 || !draft.form) return null;
  return {
    ...draft,
    form: {
      ...draft.form,
      metrics: draft.form.metrics ?? {},
      metricsMeta: draft.form.metricsMeta ?? {},
      symptoms: draft.form.symptoms ?? [],
      notes: draft.form.notes ?? "",
    },
  };
}

export async function saveCheckinDraft(userId: number, draft: CheckinDraft): Promise<void> {
  await (await getLocalDatabase()).put("drafts", draft, draftKey(userId));
}

export async function deleteCheckinDraft(userId: number): Promise<void> {
  await (await getLocalDatabase()).delete("drafts", draftKey(userId));
}
