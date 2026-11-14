import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CloudUpload,
  HardDriveDownload,
  Lock,
  LockOpen,
  Radio,
  Save,
  WifiOff,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { CreditChip } from "@/components/ui/RankBadge";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/features/auth/auth-store";
import { PulseCamera } from "@/features/camera/PulseCamera";
import { captureSourceLabel, isCaptureSource } from "@/features/captures/labels";
import { useCaptureFeed } from "@/features/captures/queries";
import { useAcknowledgeSurgeonUpdate } from "@/features/surgeon/queries";
import {
  buildCheckinPayload,
  countStepValues,
  emptyForm,
  hasDraftContent,
  hasStepData,
  stepMetricFields,
  validateNotes,
  validateStep,
  type CheckinFormState,
  type MetricMeta,
  type SymptomDraft,
} from "@/features/checkin/checkin-form";
import { CHECKIN_STEPS, type MetricField, type StepKey } from "@/features/checkin/checkin-config";
import { CheckinProgress } from "@/features/checkin/components/CheckinProgress";
import { MetricInput } from "@/features/checkin/components/MetricInput";
import { OptionalScale } from "@/features/checkin/components/OptionalScale";
import { SymptomStep } from "@/features/checkin/components/SymptomStep";
import { WhyWeAsk } from "@/features/checkin/components/WhyWeAsk";
import {
  deleteCheckinDraft,
  loadCheckinDraft,
  saveCheckinDraft,
  type CheckinDraft,
} from "@/features/checkin/draft";
import { useCreateCheckin } from "@/features/checkin/queries";
import { formatCommsWindow, nextCommsWindow } from "@/features/offline/comms";
import { useOfflineStore } from "@/features/offline/store";
import type { QueuedCheckin } from "@/lib/local-db";
import { cn, formatRelativeTime } from "@/lib/utils";

type PagePhase = "loading" | "resume" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function groupFields(fields: MetricField[]): { section: string; fields: MetricField[] }[] {
  const groups: { section: string; fields: MetricField[] }[] = [];
  for (const field of fields) {
    const section = field.section ?? "";
    const last = groups[groups.length - 1];
    if (last && last.section === section) {
      last.fields.push(field);
    } else {
      groups.push({ section, fields: [field] });
    }
  }
  return groups;
}

export function SystemsCheckPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const createCheckin = useCreateCheckin();
  const reduce = useReducedMotion();
  const online = useOfflineStore((state) => state.online);
  const pending = useOfflineStore((state) => state.pending);
  const syncing = useOfflineStore((state) => state.syncing);
  const syncQueued = useOfflineStore((state) => state.sync);
  const lastSyncedAt = useOfflineStore((state) => state.lastSyncedAt);
  const captureQuery = useCaptureFeed();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const requestId = Number(searchParams.get("request")) || null;
  const acknowledgeSurgeonUpdate = useAcknowledgeSurgeonUpdate();

  const [phase, setPhase] = useState<PagePhase>("loading");
  const [resumeDraft, setResumeDraft] = useState<CheckinDraft | null>(null);
  const [queuedItem, setQueuedItem] = useState<QueuedCheckin | null>(null);
  const [form, setForm] = useState<CheckinFormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState<StepKey[]>([]);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [overrideCaptures, setOverrideCaptures] = useState(false);

  const stepPanelRef = useRef<HTMLDivElement>(null);
  const firstStepRender = useRef(true);
  const captureAppliedRef = useRef<string | null>(null);
  const focusAppliedRef = useRef(false);
  const activeStep = CHECKIN_STEPS[step] ?? CHECKIN_STEPS[0];
  const activeSkipped = skipped.includes(activeStep.key);
  const isLastStep = step === CHECKIN_STEPS.length - 1;
  const readingCount =
    Object.values(form.metrics).filter((value) => value.trim() !== "").length +
    form.symptoms.length;
  const hasCapturedFields = Object.entries(form.metrics).some(
    ([code, value]) =>
      value.trim() !== "" && isCaptureSource(form.metricsMeta[code]?.source),
  );

  useEffect(() => {
    if (phase !== "ready") return;
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    const node = stepPanelRef.current;
    if (!node) return;
    node.scrollIntoView({
      block: "start",
      behavior: reduce ? "auto" : "smooth",
    });
    const heading = node.querySelector<HTMLElement>("h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }, [step, phase, reduce]);

  useEffect(() => {
    if (phase !== "ready" || !focus || focusAppliedRef.current) return;
    const index = CHECKIN_STEPS.findIndex((candidate) => candidate.key === focus);
    if (index < 0) return;
    setStep(index);
    focusAppliedRef.current = true;
  }, [phase, focus]);

  useEffect(() => {
    const feed = captureQuery.data;
    if (!feed || !feed.captured_at || feed.metrics.length === 0) return;
    if (captureAppliedRef.current === feed.captured_at) return;
    captureAppliedRef.current = feed.captured_at;

    setForm((current) => {
      const metrics = { ...current.metrics };
      const metricsMeta = { ...current.metricsMeta };
      let changed = false;

      for (const metric of feed.metrics) {
        const existing = (metrics[metric.metric_code] ?? "").trim();
        const existingMeta = metricsMeta[metric.metric_code];
        // Never overwrite a manual or camera reading. A newer capture may
        // refresh an earlier capture.
        if (existing !== "" && !isCaptureSource(existingMeta?.source)) continue;
        metrics[metric.metric_code] = String(metric.value);
        metricsMeta[metric.metric_code] = {
          source: metric.source as MetricMeta["source"],
          confidence: 0.93,
        };
        changed = true;
      }

      return changed ? { ...current, metrics, metricsMeta } : current;
    });
    setDirty(true);
  }, [captureQuery.data]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    loadCheckinDraft(user.id)
      .then((draft) => {
        if (cancelled) return;
        if (draft && hasDraftContent(draft.form, draft.skipped)) {
          setResumeDraft(draft);
          setPhase("resume");
        } else {
          setPhase("ready");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStorageUnavailable(true);
        setPhase("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (phase !== "ready" || !user || !dirty) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setSaveState("saving");
      const draft: CheckinDraft = {
        version: 1,
        form,
        step,
        skipped,
        startedAt,
        idempotencyKey,
        updatedAt: Date.now(),
      };
      saveCheckinDraft(user.id, draft)
        .then(() => {
          if (active) setSaveState("saved");
        })
        .catch(() => {
          if (!active) return;
          setStorageUnavailable(true);
          setSaveState("error");
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [phase, user, dirty, form, step, skipped, startedAt, idempotencyKey]);

  useEffect(() => {
    if (!queuedItem || pending !== 0 || lastSyncedAt === null) return;
    if (lastSyncedAt < queuedItem.queuedAt) return;
    navigate("/", { replace: true });
  }, [queuedItem, pending, lastSyncedAt, navigate]);

  const resume = () => {
    if (!resumeDraft) return;
    setForm(resumeDraft.form);
    setStep(Math.min(Math.max(resumeDraft.step, 0), CHECKIN_STEPS.length - 1));
    setSkipped(resumeDraft.skipped);
    setStartedAt(resumeDraft.startedAt);
    setIdempotencyKey(resumeDraft.idempotencyKey);
    setResumeDraft(null);
    setPhase("ready");
    setDirty(false);
    setSaveState("saved");
    setOverrideCaptures(false);
    focusAppliedRef.current = false;
  };

  const startFresh = () => {
    if (user) void deleteCheckinDraft(user.id).catch(() => undefined);
    setForm(emptyForm());
    setStep(0);
    setSkipped([]);
    setStartedAt(new Date().toISOString());
    setIdempotencyKey(newIdempotencyKey());
    setResumeDraft(null);
    setPhase("ready");
    setDirty(false);
    setSaveState("idle");
    setErrors({});
    setStepError(null);
    setSubmitError(null);
    setOverrideCaptures(false);
    focusAppliedRef.current = false;
  };

  const updateMetric = (code: string, value: string) => {
    setForm((current) => {
      const metricsMeta = { ...current.metricsMeta };
      delete metricsMeta[code];
      return {
        ...current,
        metrics: { ...current.metrics, [code]: value },
        metricsMeta,
      };
    });
    setErrors((current) => {
      if (!current[code]) return current;
      const next = { ...current };
      delete next[code];
      return next;
    });
    setSkipped((current) => current.filter((key) => key !== activeStep.key));
    setStepError(null);
    setSubmitError(null);
    setDirty(true);
  };

  const updateCameraHeartRate = (bpm: number, confidence: number) => {
    setForm((current) => ({
      ...current,
      metrics: { ...current.metrics, heart_rate: String(bpm) },
      metricsMeta: {
        ...current.metricsMeta,
        heart_rate: { source: "camera_rppg", confidence },
      },
    }));
    setErrors((current) => {
      if (!current.heart_rate) return current;
      const next = { ...current };
      delete next.heart_rate;
      return next;
    });
    setSkipped((current) => current.filter((key) => key !== "vitals"));
    setStepError(null);
    setSubmitError(null);
    setDirty(true);
  };

  const updateSymptoms = (symptoms: SymptomDraft[]) => {
    setForm((current) => ({ ...current, symptoms }));
    setSkipped((current) => current.filter((key) => key !== activeStep.key));
    setStepError(null);
    setSubmitError(null);
    setDirty(true);
  };

  const updateNotes = (notes: string) => {
    setForm((current) => ({ ...current, notes }));
    setSubmitError(null);
    setDirty(true);
  };

  const submit = (override?: { form: CheckinFormState; skipped: StepKey[] }) => {
    if (createCheckin.isPending) return;
    const submissionForm = override?.form ?? form;
    const submissionSkipped = override?.skipped ?? skipped;

    const notesError = validateNotes(submissionForm.notes);
    if (notesError) {
      setStepError(notesError);
      return;
    }

    for (const [index, candidate] of CHECKIN_STEPS.entries()) {
      if (submissionSkipped.includes(candidate.key)) continue;
      const fieldErrors = validateStep(candidate, submissionForm.metrics);
      if (Object.keys(fieldErrors).length > 0) {
        setStep(index);
        setErrors(fieldErrors);
        setStepError("Check the highlighted readings.");
        return;
      }
      if (
        candidate.key !== "symptoms" &&
        !hasStepData(candidate, submissionForm.metrics, submissionForm.symptoms)
      ) {
        setStep(index);
        setErrors({});
        setStepError("Add at least one reading, or skip this step.");
        return;
      }
    }

    const payload = buildCheckinPayload(
      submissionForm,
      submissionSkipped,
      startedAt,
      idempotencyKey,
    );
    if (payload.entries.length === 0 && payload.symptoms.length === 0 && !payload.notes) {
      setStepError("Add at least one reading or note before completing.");
      return;
    }

    setStepError(null);
    setSubmitError(null);
    createCheckin.mutate(payload, {
      onSuccess: (result) => {
        if (user) void deleteCheckinDraft(user.id).catch(() => undefined);
        if (result.kind === "created") {
          if (requestId) {
            acknowledgeSurgeonUpdate.mutate(requestId, {
              onError: () =>
                toast.error("Check-in saved, but the follow-up request could not be closed."),
            });
          }
          navigate(`/check-in/report/${result.checkin.id}`);
          return;
        }
        setDirty(false);
        setSaveState("idle");
        setQueuedItem(result.item);
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      },
      onError: (error) => {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to save the check-in right now.",
        );
      },
    });
  };

  const advance = (override?: { form: CheckinFormState; skipped: StepKey[] }) => {
    if (isLastStep) {
      submit(override);
      return;
    }
    setErrors({});
    setStepError(null);
    setStep((current) => current + 1);
  };

  const goNext = () => {
    setSubmitError(null);
    if (!activeSkipped) {
      const fieldErrors = validateStep(activeStep, form.metrics);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setStepError("Check the highlighted readings.");
        return;
      }
      if (!hasStepData(activeStep, form.metrics, form.symptoms)) {
        setErrors({});
        setStepError(
          activeStep.key === "symptoms"
            ? "Add a symptom, choose “No symptoms today”, or skip this step."
            : "Add at least one reading, or skip this step.",
        );
        return;
      }
    }
    advance();
  };

  const skipStep = () => {
    const metrics = { ...form.metrics };
    const metricsMeta = { ...form.metricsMeta };
    for (const field of stepMetricFields(activeStep)) {
      delete metrics[field.code];
      delete metricsMeta[field.code];
    }
    const nextForm: CheckinFormState = {
      ...form,
      metrics,
      metricsMeta,
      symptoms: activeStep.key === "symptoms" ? [] : form.symptoms,
    };
    const nextSkipped = skipped.includes(activeStep.key) ? skipped : [...skipped, activeStep.key];

    setForm(nextForm);
    setSkipped(nextSkipped);
    setErrors({});
    setStepError(null);
    setSubmitError(null);
    setDirty(true);
    advance({ form: nextForm, skipped: nextSkipped });
  };

  const handleNoSymptoms = () => {
    setForm((current) => ({ ...current, symptoms: [] }));
    setSkipped((current) => current.filter((key) => key !== "symptoms"));
    setErrors({});
    setStepError(null);
    setSubmitError(null);
    setDirty(true);
    advance();
  };

  const goBack = () => {
    setErrors({});
    setStepError(null);
    setSubmitError(null);
    if (step === 0) {
      navigate("/");
      return;
    }
    setStep((current) => current - 1);
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving draft…"
      : saveState === "saved"
        ? "Draft saved on this device"
        : saveState === "error"
          ? "Draft not saved"
          : "Draft saves on this device";

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner className="text-accent" />
        <p className="text-sm text-muted">Loading your draft…</p>
      </div>
    );
  }

  if (queuedItem) {
    const windowLabel = formatCommsWindow(nextCommsWindow());
    const readingCount = queuedItem.payload.entries.length;

    return (
      <div className="mx-auto max-w-xl py-8">
        <Panel
          title="Check-in saved on this device"
          subtitle="The submission is queued and will be sent exactly once."
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-watch-soft text-watch">
              {online ? <CloudUpload size={18} aria-hidden /> : <WifiOff size={18} aria-hidden />}
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                {online ? "The API is unreachable right now." : "You are offline."} Nothing was
                lost.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                The check-in is stored in this browser with{" "}
                <span className="font-mono text-[12px] text-ink">{readingCount}</span>{" "}
                {readingCount === 1 ? "reading" : "readings"}. It will sync automatically when the
                connection returns — next comms window at{" "}
                <span className="font-medium tabular text-ink">{windowLabel}</span>.
              </p>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-line rounded-lg bg-surface-muted/70 px-3">
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-[11px] text-muted">Queued</dt>
              <dd className="text-[11px] text-ink">
                {formatRelativeTime(new Date(queuedItem.queuedAt).toISOString())}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-[11px] text-muted">Queue</dt>
              <dd className="text-[11px] tabular text-ink">
                {pending} waiting · {syncing ? "syncing" : online ? "online" : "offline"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-[11px] text-muted">Exactly once</dt>
              <dd
                className="max-w-[60%] truncate font-mono text-[10px] text-ink-2"
                title={queuedItem.id}
              >
                {queuedItem.id}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={() => navigate("/")}>
              Back to Flight Deck
            </Button>
            <Button
              variant="secondary"
              disabled={!online || syncing}
              onClick={() => {
                void syncQueued().then(() => {
                  if (useOfflineStore.getState().pending === 0) navigate("/");
                });
              }}
            >
              {syncing ? "Syncing…" : "Try sync now"}
            </Button>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-muted">
            The queued check-in keeps the same idempotency key, so a retry cannot create a
            duplicate. Draft storage and the queue live only in this browser.
          </p>
        </Panel>
      </div>
    );
  }

  if (phase === "resume" && resumeDraft) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Panel
          title="Resume your check-in?"
          subtitle={`A draft from ${formatRelativeTime(new Date(resumeDraft.updatedAt).toISOString())} is stored on this device.`}
        >
          <p className="text-sm leading-relaxed text-ink-2">
            You stopped at step {resumeDraft.step + 1} of {CHECKIN_STEPS.length} —{" "}
            <span className="font-medium text-ink">
              {CHECKIN_STEPS[resumeDraft.step]?.title ?? "Vitals"}
            </span>
            . Nothing has been submitted yet.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={resume}>
              Resume draft
            </Button>
            <Button variant="secondary" onClick={startFresh}>
              Start fresh
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const groups = groupFields(activeStep.fields);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Systems Check</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            A two-minute read on your body.
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            Five steps. Skip what you cannot measure. The report explains the score, the factors
            behind it, and the next action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <Save
            size={12}
            className={cn(
              saveState === "saved" && "text-nominal",
              saveState === "error" && "text-critical",
            )}
            aria-hidden
          />
          <span>{storageUnavailable ? "Draft storage unavailable" : saveLabel}</span>
          {hasCapturedFields && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOverrideCaptures((current) => !current)}
              aria-pressed={overrideCaptures}
              title="Unlock or relock all automatically captured values in this check-in."
            >
              {overrideCaptures ? (
                <Lock size={12} aria-hidden />
              ) : (
                <LockOpen size={12} aria-hidden />
              )}
              {overrideCaptures ? "Lock captures" : "Override captures"}
            </Button>
          )}
        </div>
      </div>

      <Panel className="mt-6" padded={false} bodyClassName="px-5 py-4">
        <CheckinProgress steps={CHECKIN_STEPS} current={step} skipped={skipped} />
      </Panel>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <div ref={stepPanelRef} className="scroll-mt-24">
            <Panel
              title={activeStep.title}
              subtitle={activeStep.description}
            actions={
              <span className="text-xs text-muted">
                {readingCount} reading{readingCount === 1 ? "" : "s"}
              </span>
            }
          >
            {focus && (
              <div className="mb-3 rounded-lg border border-accent/25 bg-accent-soft/50 px-3 py-2 text-[11px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">Focused check requested.</span> Complete
                this step and submit; the follow-up request closes automatically.
              </div>
            )}
            {(activeStep.key === "vitals" || activeStep.key === "training") &&
              captureQuery.data?.captured_at && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2 text-[11px] leading-relaxed text-ink-2">
                  <Radio size={13} className="shrink-0 text-accent" aria-hidden />
                  <span>
                    {activeStep.key === "vitals"
                      ? "Vitals captured automatically"
                      : "Captured load is pre-filled"}{" "}
                    from {captureSourceLabel(captureQuery.data.source)}.
                  </span>
                  <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
                    Simulated
                  </span>
                  <span className="text-muted">
                    {formatRelativeTime(captureQuery.data.captured_at)} ·{" "}
                    {overrideCaptures
                      ? "unlocked for editing"
                      : "locked; use Override captures to edit"}
                  </span>
                </div>
              )}
            {activeSkipped && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-muted">
                <HardDriveDownload size={13} className="mt-0.5 shrink-0" aria-hidden />
                This step is skipped. Enter a reading or add a symptom to include it again.
              </div>
            )}

            <motion.div
              key={activeStep.key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeStep.key === "symptoms" ? (
                <SymptomStep
                  symptoms={form.symptoms}
                  onChange={updateSymptoms}
                  onNoSymptoms={handleNoSymptoms}
                />
              ) : (
                <div className="mt-4 space-y-4">
                  {groups.map((group) => (
                    <div key={group.section || "fields"}>
                      {group.section && (
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
                          {group.section}
                        </p>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.fields.map((field) => {
                          const value = form.metrics[field.code] ?? "";
                          const locked =
                            !overrideCaptures &&
                            isCaptureSource(form.metricsMeta[field.code]?.source) &&
                            value.trim() !== "";
                          return (
                            <MetricInput
                              key={field.code}
                              field={field}
                              value={value}
                              locked={locked}
                              error={errors[field.code]}
                              onChange={(next) => updateMetric(field.code, next)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {activeStep.key === "vitals" && (
                    <PulseCamera onMeasured={updateCameraHeartRate} />
                  )}

                  {activeStep.scales.length > 0 && (
                    <div className="space-y-2">
                      {activeStep.scales.map((scale) => {
                        const raw = form.metrics[scale.code] ?? "";
                        return (
                          <OptionalScale
                            key={scale.code}
                            field={scale}
                            value={raw === "" ? undefined : Number(raw)}
                            onChange={(value) =>
                              updateMetric(scale.code, value === undefined ? "" : String(value))
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <WhyWeAsk article={activeStep.article} />
            </motion.div>

            {stepError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-watch/20 bg-watch-soft px-3 py-2 text-[11px] leading-relaxed text-watch">
                <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>{stepError}</span>
              </div>
            )}

            {submitError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-critical/20 bg-critical-soft px-3 py-2 text-[11px] leading-relaxed text-critical">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>{submitError}</span>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft size={13} aria-hidden />
                  Back
                </Button>
                <button
                  type="button"
                  onClick={skipStep}
                  className="text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline"
                >
                  {activeSkipped
                    ? "Continue without this step"
                    : isLastStep
                      ? "Skip and complete"
                      : "Skip this step"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isLastStep && readingCount === 0 && !activeSkipped && (
                  <span className="hidden text-[10px] text-muted sm:inline">
                    No readings yet — the report will show insufficient data.
                  </span>
                )}
                <Button
                  variant="primary"
                  onClick={goNext}
                  disabled={createCheckin.isPending}
                  className="w-full min-w-32 sm:w-auto"
                >
                  {createCheckin.isPending ? (
                    <Spinner className="text-white" />
                  ) : isLastStep ? (
                    <Check size={14} aria-hidden />
                  ) : null}
                  {isLastStep ? "Complete check-in" : "Continue"}
                  {!isLastStep && <ArrowRight size={14} aria-hidden />}
                </Button>
              </div>
            </div>
            </Panel>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
          <Panel title="This check-in" subtitle="Saved on this device until you submit.">
            <div className="divide-y divide-line">
              {CHECKIN_STEPS.map((definition) => {
                const stepSkipped = skipped.includes(definition.key);
                const count = countStepValues(definition, form.metrics, form.symptoms);
                return (
                  <div
                    key={definition.key}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <span
                      className={cn(
                        "text-xs",
                        stepSkipped ? "text-muted line-through" : "text-ink-2",
                      )}
                    >
                      {definition.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[10px]",
                        stepSkipped ? "text-muted" : count > 0 ? "text-ink" : "text-muted",
                      )}
                    >
                      {stepSkipped
                        ? "Skipped"
                        : definition.key === "symptoms"
                          ? count > 0
                            ? `${count} logged`
                            : "None"
                          : count > 0
                            ? `${count} reading${count === 1 ? "" : "s"}`
                            : "Not entered"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-xs text-ink-2">Mission points on completion</span>
              <CreditChip amount={40} />
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <label htmlFor="checkin-notes" className="text-xs font-medium text-ink-2">
                Notes
              </label>
              <textarea
                id="checkin-notes"
                value={form.notes}
                onChange={(event) => updateNotes(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Anything the numbers do not capture?"
                className="mt-1.5 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-ink placeholder:text-muted/70 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
              />
              <div className="mt-1 flex items-start justify-between gap-2 text-[10px] text-muted">
                <span>Skipped steps are recorded automatically.</span>
                <span className="tabular">{form.notes.length}/2000</span>
              </div>
            </div>
          </Panel>

          <Panel title="What happens next">
            <ol className="space-y-2.5 text-[11px] leading-relaxed text-ink-2">
              <li className="flex gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-medium text-accent">
                  1
                </span>
                <span>Readiness recomputes against your 21-day baseline.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-medium text-accent">
                  2
                </span>
                <span>New alerts appear on the Flight Deck and in the mission tape.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-medium text-accent">
                  3
                </span>
                <span>You get a Systems Report with the top factors and next action.</span>
              </li>
            </ol>
            <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-[10px] leading-relaxed text-muted">
              Every submission is one transaction. If the readiness engine fails, nothing is saved.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
