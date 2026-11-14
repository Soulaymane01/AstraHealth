import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Droplets,
  Dumbbell,
  Moon,
  Orbit,
  PhoneCall,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AnatomyMap } from "@/components/ui/AnatomyMap";
import { AnomalyCard } from "@/components/ui/AnomalyCard";
import { ArticleCard } from "@/components/ui/ArticleCard";
import { Button } from "@/components/ui/Button";
import { CopilotDrawer } from "@/components/ui/CopilotDrawer";
import { DomainRail } from "@/components/ui/DomainRail";
import { MetClock } from "@/components/ui/MetClock";
import { MetricCard } from "@/components/ui/MetricCard";
import { MissionTape } from "@/components/ui/MissionTape";
import { Panel } from "@/components/ui/Panel";
import { QuizCard } from "@/components/ui/QuizCard";
import { RankBadge } from "@/components/ui/RankBadge";
import { ReadinessRing } from "@/components/ui/ReadinessRing";
import { RewardCard } from "@/components/ui/RewardCard";
import { ScaleInput } from "@/components/ui/ScaleInput";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { StatusBadge, StatusLegend, StatusPill } from "@/components/ui/Status";
import { STATUS_META, STATUS_ORDER, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

const MISSION_START = Date.now() - (42 * 86400 + 13 * 3600 + 7 * 60) * 1000;

const PALETTE = [
  { name: "Canvas", value: "#F4F6F8" },
  { name: "Surface", value: "#FFFFFF" },
  { name: "Surface muted", value: "#F0F3F6" },
  { name: "Line", value: "#E2E8EF" },
  { name: "Line strong", value: "#CBD5E1" },
  { name: "Ink", value: "#0F1B2D" },
  { name: "Ink 2", value: "#526175" },
  { name: "Muted", value: "#5F6F82" },
  { name: "Accent", value: "#0F766E" },
  { name: "Accent soft", value: "#E6F4F2" },
  { name: "Nominal", value: "#15803D" },
  { name: "Watch", value: "#B45309" },
  { name: "Caution", value: "#C2410C" },
  { name: "Critical", value: "#B91C1C" },
  { name: "Unknown", value: "#55657A" },
];

const DOMAINS = [
  {
    id: "cardiovascular",
    name: "Cardiovascular",
    score: 74,
    status: "watch" as Status,
    delta: -4,
  },
  {
    id: "musculoskeletal",
    name: "Musculoskeletal",
    score: 88,
    status: "nominal" as Status,
    delta: 2,
  },
  {
    id: "sleep",
    name: "Sleep & circadian",
    score: 61,
    status: "caution" as Status,
    delta: -9,
  },
  {
    id: "neurobehavioral",
    name: "Neurobehavioral",
    score: 79,
    status: "watch" as Status,
    delta: -3,
  },
  {
    id: "metabolic",
    name: "Metabolic & nutrition",
    score: 91,
    status: "nominal" as Status,
    delta: 1,
  },
  {
    id: "immune",
    name: "Immune & sensory",
    score: 84,
    status: "watch" as Status,
    delta: -2,
  },
];

const BODY_REGIONS = {
  cardiovascular: { label: "Chest & heart", status: "watch" as Status },
  musculoskeletal: { label: "Muscles & bone", status: "nominal" as Status },
  sleep: { label: "Sleep & circadian", status: "caution" as Status },
  neurobehavioral: { label: "Head & cognition", status: "watch" as Status },
  metabolic: { label: "Core & metabolism", status: "nominal" as Status },
  immune: { label: "Whole body", status: "watch" as Status },
};

const TAPE_EVENTS = [
  { id: "t1", day: 2, type: "checkin" as const, label: "Morning systems check" },
  { id: "t2", day: 5, type: "training" as const, label: "Resistance protocol" },
  { id: "t3", day: 9, type: "checkin" as const, label: "Evening check-in" },
  { id: "t4", day: 14, type: "weather" as const, label: "Solar particle event" },
  { id: "t5", day: 18, type: "checkin" as const, label: "Morning systems check" },
  { id: "t6", day: 22, type: "achievement" as const, label: "7-day streak" },
  { id: "t7", day: 27, type: "training" as const, label: "Bone-load session" },
  { id: "t8", day: 31, type: "alert" as const, label: "HRV below baseline" },
  { id: "t9", day: 36, type: "checkin" as const, label: "Sleep review" },
  { id: "t10", day: 44, type: "training" as const, label: "Aerobic session" },
  { id: "t11", day: 52, type: "checkin" as const, label: "Morning systems check" },
  { id: "t12", day: 58, type: "achievement" as const, label: "Quiz ace" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-line pt-10">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-2">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function AttentionItem({
  status,
  title,
  copy,
  meta,
}: {
  status: Status;
  title: string;
  copy: string;
  meta: string;
}) {
  const metaInfo = STATUS_META[status];
  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", metaInfo.dot)} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{copy}</p>
        <p className="mt-1 text-[11px] text-muted">{meta}</p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  status,
  note,
}: {
  label: string;
  value: string;
  unit: string;
  status: Status;
  note: string;
}) {
  return (
    <div className="rounded-lg bg-surface-muted px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular text-ink">{value}</span>
        <span className="text-[11px] text-muted">{unit}</span>
      </p>
      <StatusBadge status={status} label={note} className="mt-1.5 text-[11px]" />
    </div>
  );
}

export function StyleguidePage() {
  const [activeDomain, setActiveDomain] = useState("cardiovascular");
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [mood, setMood] = useState(3);
  const [rewardRedeemed, setRewardRedeemed] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <header className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Orbit size={15} aria-hidden />
            </span>
            <span className="text-sm font-medium text-ink-2">AstraHealth design system</span>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              v0.2
            </span>
          </div>

          <h1 className="text-balance mt-6 text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            A quieter flight deck.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-2">
            A light, low-density interface for astronauts who need to read their health at a glance,
            not decode a cockpit.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <MetClock startAt={MISSION_START} />
            <span className="text-xs text-muted">
              Artemis Transit · Mars transit · 4 crew · 14 min comms delay
            </span>
          </div>
        </header>

        <div className="mt-12 space-y-12">
          <Section
            id="preview"
            title="Flight Deck"
            description="One clear answer at the top, the body underneath, and only the exceptions on the right. Everything else waits."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-muted">Good morning, Commander</p>
                <p className="mt-1 text-xl font-semibold tracking-[-0.01em] text-ink">
                  Your systems are mostly steady.
                </p>
              </div>
              <Button variant="primary">
                Start systems check
                <ArrowRight size={14} aria-hidden />
              </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <Panel
                  title="Readiness"
                  subtitle="Composite score across six domains."
                  actions={<StatusPill status="watch" />}
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <ReadinessRing
                      score={78}
                      status="watch"
                      size={176}
                      factors={4}
                      className="shrink-0 self-center"
                    />
                    <div className="grid flex-1 grid-cols-3 gap-2">
                      <StatTile label="HRV" value="38" unit="ms" status="caution" note="Below" />
                      <StatTile label="Sleep" value="5.4" unit="h" status="caution" note="Short" />
                      <StatTile label="Hydration" value="1.4" unit="L" status="watch" note="Low" />
                    </div>
                  </div>
                </Panel>

                <Panel title="Body systems" subtitle="Click a muscle group to inspect its domain.">
                  <AnatomyMap
                    regions={BODY_REGIONS}
                    selectedDomain={activeDomain}
                    onSelectDomain={setActiveDomain}
                  />

                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    Sleep and circadian rhythm are tracked as a schedule, not a body region.
                  </p>
                </Panel>
              </div>

              <div className="space-y-4 lg:col-span-4">
                <Panel
                  title="Needs attention"
                  actions={<span className="text-xs text-muted">2 active</span>}
                >
                  <div className="divide-y divide-line">
                    <AttentionItem
                      status="caution"
                      title="HRV is below your baseline"
                      copy="Three nights of short sleep. Cardiovascular strain is rising."
                      meta="Today, 06:42"
                    />
                    <AttentionItem
                      status="watch"
                      title="Hydration is low"
                      copy="1.4 L against a 2.4 L target."
                      meta="Yesterday, 20:10"
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong"
                  >
                    View all alerts
                    <ArrowRight size={12} aria-hidden />
                  </button>
                </Panel>

                <Panel title="Today">
                  <ul className="space-y-3">
                    {[
                      {
                        icon: CheckCircle2,
                        label: "Morning check-in",
                        meta: "Done",
                        tone: "text-nominal",
                      },
                      {
                        icon: Dumbbell,
                        label: "Resistance training",
                        meta: "10:00",
                        tone: "text-ink-2",
                      },
                      {
                        icon: Droplets,
                        label: "Hydration target",
                        meta: "1.4 / 2.4 L",
                        tone: "text-watch",
                      },
                      { icon: Moon, label: "Sleep window", meta: "21:30", tone: "text-ink-2" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label} className="flex items-center gap-2.5">
                          <Icon size={15} className={item.tone} aria-hidden />
                          <span className="text-[13px] text-ink">{item.label}</span>
                          <span className="ml-auto text-[11px] text-muted">{item.meta}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              <Panel title="Systems" className="lg:col-span-7">
                <div className="grid gap-0.5 sm:grid-cols-2">
                  {DOMAINS.map((domain) => (
                    <DomainRail
                      key={domain.id}
                      name={domain.name}
                      score={domain.score}
                      status={domain.status}
                      delta={domain.delta}
                      active={activeDomain === domain.id}
                      onClick={() => setActiveDomain(domain.id)}
                    />
                  ))}
                </div>
              </Panel>

              <Panel title="Next 7 days" className="lg:col-span-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <ShowcaseRow icon={Dumbbell} label="Resistance sessions" value="3 of 4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <ShowcaseRow icon={Droplets} label="Hydration adherence" value="64%" />
                  </div>
                  <div className="flex items-center justify-between">
                    <ShowcaseRow icon={Moon} label="Sleep target" value="7.5 h" />
                  </div>
                  <div className="rounded-lg bg-accent-soft px-3 py-2.5">
                    <p className="text-xs font-medium text-accent">Next action</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink">
                      Extend tonight&apos;s sleep window by 45 minutes.
                    </p>
                  </div>
                </div>
              </Panel>
            </div>

            <Panel title="Mission tape" className="mt-4">
              <MissionTape events={TAPE_EVENTS} maxDay={60} />
            </Panel>
          </Section>

          <Section
            id="foundations"
            title="Foundations"
            description="Off-white surfaces, deep navy text, and one teal accent. Status colors are semantic, never decorative."
          >
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Panel title="Color">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                  {PALETTE.map((color) => (
                    <div
                      key={color.name}
                      className="overflow-hidden rounded-lg border border-line bg-surface"
                    >
                      <div
                        className="h-12 w-full border-b border-line"
                        style={{ backgroundColor: color.value }}
                      />
                      <div className="px-2.5 py-2">
                        <p className="truncate text-[11px] font-medium text-ink">{color.name}</p>
                        <p className="font-mono text-[10px] text-muted">{color.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="space-y-4">
                <Panel title="Type">
                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] text-muted">Display · Geist semibold</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                        Health, without the noise.
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Interface · Geist regular</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-2">
                        A crew member should understand the state of their body in three seconds,
                        then decide what to do next.
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Telemetry · Geist Mono</p>
                      <p className="mt-1 font-mono text-lg tabular text-ink">
                        78 · 38 ms · 37.8 °C · 1,240 FC
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Type scale</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-xs text-muted">Heading</span>
                          <span className="text-lg font-semibold text-ink">Section heading</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-xs text-muted">Body</span>
                          <span className="text-sm text-ink-2">Supporting explanation</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-xs text-muted">Caption</span>
                          <span className="text-xs text-muted">Secondary metadata</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Shape and spacing">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-line p-3 text-center">
                      <div className="mx-auto h-8 w-14 rounded-lg bg-accent-soft" />
                      <p className="mt-2 text-[11px] text-muted">Controls · 8</p>
                    </div>
                    <div className="rounded-xl border border-line p-3 text-center">
                      <div className="mx-auto h-8 w-14 rounded-xl bg-accent-soft" />
                      <p className="mt-2 text-[11px] text-muted">Cards · 12</p>
                    </div>
                    <div className="rounded-lg border border-line p-3 text-center">
                      <div className="mx-auto h-8 w-14 rounded-full bg-accent-soft" />
                      <p className="mt-2 text-[11px] text-muted">Pills · full</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 border-t border-line pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Spacing</span>
                      <span className="text-ink-2">4 · 8 · 12 · 16 · 24</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Borders</span>
                      <span className="text-ink-2">1 px, #E2E8EF</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Shadow</span>
                      <span className="text-ink-2">0 1px 2px, 4%</span>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>

            <Panel title="Status" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {STATUS_ORDER.map((status) => {
                  const meta = STATUS_META[status];
                  return (
                    <div key={status} className="rounded-lg bg-surface-muted/60 p-3">
                      <StatusPill status={status} />
                      <p className="mt-2 text-xs leading-relaxed text-ink-2">{meta.description}</p>
                      <p className="mt-2 font-mono text-[10px] text-muted">{meta.hex}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2.5">
                <StatusLegend />
                <span className="text-[11px] text-muted">
                  Color, icon, and word together. Never color alone.
                </span>
              </div>
            </Panel>
          </Section>

          <Section
            id="components"
            title="Components"
            description="The same primitives at different densities. Nothing pulses, nothing glows, nothing competes for attention."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Buttons">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary">Start check-in</Button>
                  <Button variant="secondary">View guidance</Button>
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="danger">Escalate</Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </Panel>

              <Panel title="Progress and scales">
                <StepIndicator
                  steps={["Vitals", "Sleep", "Mood", "Symptoms", "Training"]}
                  current={2}
                />
                <div className="mt-6">
                  <ScaleInput
                    label="How is your mood right now?"
                    value={mood}
                    onChange={setMood}
                    lowLabel="Very low"
                    highLabel="Very high"
                  />
                </div>
              </Panel>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Heart rate"
                value={72}
                unit="bpm"
                status="nominal"
                delta={2}
                series={[68, 70, 69, 71, 73, 72, 70, 72]}
              />
              <MetricCard
                label="HRV (RMSSD)"
                value={38}
                unit="ms"
                status="caution"
                delta={-12}
                series={[54, 52, 49, 50, 47, 44, 41, 38]}
              />
              <MetricCard
                label="Sleep"
                value={5.4}
                unit="h"
                decimals={1}
                status="caution"
                delta={-1.2}
                series={[7.1, 6.8, 6.2, 6.4, 5.9, 5.6, 5.2, 5.4]}
              />
              <MetricCard
                label="Core temperature"
                value={37.8}
                unit="°C"
                decimals={1}
                status="watch"
                delta={0.6}
                series={[36.8, 36.9, 37.0, 37.1, 37.3, 37.5, 37.7, 37.8]}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Panel title="System rows">
                <div className="space-y-0.5">
                  {DOMAINS.slice(0, 4).map((domain) => (
                    <DomainRail
                      key={domain.id}
                      name={domain.name}
                      score={domain.score}
                      status={domain.status}
                      delta={domain.delta}
                      active={activeDomain === domain.id}
                      onClick={() => setActiveDomain(domain.id)}
                    />
                  ))}
                </div>
              </Panel>

              <div className="space-y-3">
                <AnomalyCard
                  status="caution"
                  title="HRV is 32% below your baseline"
                  rationale="Three consecutive nights under six hours of sleep. Cardiovascular strain is rising while workload is stable."
                  action="Extend tonight's sleep window by 45 minutes and repeat the reading tomorrow."
                  timestamp="Today, 06:42"
                  acknowledged={acknowledged.a1}
                  onAcknowledge={() => setAcknowledged((current) => ({ ...current, a1: true }))}
                />
                <AnomalyCard
                  status="critical"
                  title="Febrile episode with tachycardia"
                  rationale="Core temperature 38.4 °C with a resting heart rate of 108 bpm. Rule R1 fired and overrode the composite score."
                  action="Stop activity. Contact the flight surgeon on the next comms window."
                  timestamp="Just now"
                />
              </div>
            </div>

            <Panel title="Mission tape" className="mt-4">
              <MissionTape events={TAPE_EVENTS} maxDay={60} />
            </Panel>
          </Section>

          <Section
            id="motivation"
            title="Crew and motivation"
            description="Ranks reward consistency, never a health reading. The crew sees what each person chooses to share."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4">
                <RankBadge
                  rank="Flight Engineer"
                  credits={1240}
                  nextRank="Commander"
                  progress={0.62}
                />
                <QuizCard
                  title="Sleep, circadian rhythm, and the 24-hour day"
                  mode="self"
                  questions={5}
                  bestScore={90}
                  status="completed"
                />
                <QuizCard
                  title="How has your crewmate seemed this week?"
                  mode="crew"
                  questions={5}
                  status="new"
                />
              </div>

              <Panel
                title="Mission allowances"
                subtitle="Chosen before departure. Redeemable with Flight Credits."
                className="lg:col-span-2"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <RewardCard
                    name="Family call"
                    description="An extra 20-minute call outside the standard comms window."
                    cost={120}
                    icon={PhoneCall}
                    state={rewardRedeemed ? "redeemed" : "available"}
                    onRedeem={() => setRewardRedeemed(true)}
                  />
                  <RewardCard
                    name="Choose the menu"
                    description="Pick the next week's dinner rotation for the crew."
                    cost={80}
                    icon={UtensilsCrossed}
                    state="locked"
                    shortfall={40}
                  />
                  <RewardCard
                    name="Rest day"
                    description="One day off from the prescribed exercise protocol."
                    cost={200}
                    icon={Moon}
                    state="redeemed"
                  />
                  <RewardCard
                    name="Extra coffee"
                    description="A second personal coffee ration for the week."
                    cost={40}
                    icon={Coffee}
                    state="available"
                  />
                </div>
              </Panel>
            </div>
          </Section>

          <Section
            id="knowledge"
            title="Knowledge and guidance"
            description="The explanation lives next to the number. The assistant cites its source and never diagnoses."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <ArticleCard
                  title="Why HRV falls before you feel tired"
                  domain="Cardiovascular"
                  summary="Heart-rate variability is an early indicator of autonomic strain. In spaceflight it is also confounded by fluid shifts, sleep disruption, and workload."
                  readMinutes={4}
                  source="NASA HRP evidence base"
                />
                <ArticleCard
                  title="Sleep loss in a 24-hour light cycle"
                  domain="Sleep & circadian"
                  summary="Without Earth's light cues, circadian rhythm drifts. The countermeasure is scheduled light exposure, not willpower."
                  readMinutes={5}
                  source="NASA HRP evidence base"
                />
                <ArticleCard
                  title="Bone loss and the loading budget"
                  domain="Musculoskeletal"
                  summary="Mechanical loading is the signal bone needs. Resistance exercise is prescribed as a minimum effective dose."
                  readMinutes={6}
                  source="NASA HRP evidence base"
                />
              </div>

              <CopilotDrawer className="lg:sticky lg:top-6" />
            </div>
          </Section>

          <Section
            id="review"
            title="Gate A review"
            description="Confirm the direction before feature work continues. The interface should feel quiet enough to use twice a day for six months."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Palette", "Off-white surfaces, deep navy text, one teal accent."],
                ["Typography", "Geist for interface, Geist Mono for telemetry."],
                ["Status", "Color, icon, and word. No pulsing or glow."],
                ["Density", "One clear answer, then the detail underneath."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-nominal-soft">
                      <span className="h-1.5 w-1.5 rounded-full bg-nominal" />
                    </span>
                    <p className="text-sm font-medium text-ink">{title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-2">{copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-sm text-ink-2">
                Next: Phase 1 — persistence, authentication, and the seeded crew.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                Awaiting sign-off
                <ArrowRight size={12} aria-hidden />
              </span>
            </div>
          </Section>
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted">
          <span>AstraHealth · Phase 0 · Design system v0.2</span>
          <span>Guidance only. Not a medical diagnosis.</span>
        </footer>
      </div>
    </div>
  );
}

function ShowcaseRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <>
      <span className="inline-flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-ink-2">
          <Icon size={14} aria-hidden />
        </span>
        <span className="text-[13px] text-ink">{label}</span>
      </span>
      <span className="text-xs font-medium tabular text-ink-2">{value}</span>
    </>
  );
}
