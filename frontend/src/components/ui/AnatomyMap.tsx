import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { BACK_MUSCLES, FRONT_MUSCLES, MUSCLE_GROUPS } from "body-muscles";

import { STATUS_META, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface AnatomyRegionState {
  label: string;
  status: Status;
}

export interface AnatomyMapProps {
  regions: Record<string, AnatomyRegionState>;
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  className?: string;
}

const GROUP_DOMAIN: Record<string, string> = {
  "Head & Neck": "neurobehavioral",
  Chest: "cardiovascular",
  Abdominals: "metabolic",
  Shoulders: "musculoskeletal",
  Arms: "musculoskeletal",
  Back: "musculoskeletal",
  Legs: "musculoskeletal",
  "Hands & Feet": "musculoskeletal",
};

const MUSCLE_DOMAIN: Record<string, string> = {};
for (const [group, ids] of Object.entries(MUSCLE_GROUPS)) {
  const domain = GROUP_DOMAIN[group];
  if (!domain) continue;
  for (const id of ids) MUSCLE_DOMAIN[id] = domain;
}

function domainFor(muscleId: string): string {
  return MUSCLE_DOMAIN[muscleId] ?? "musculoskeletal";
}

type View = "front" | "back";

export function AnatomyMap({
  regions,
  selectedDomain,
  onSelectDomain,
  className,
}: AnatomyMapProps) {
  const [view, setView] = useState<View>("front");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const muscles = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
  const viewBox = view === "front" ? "0 0 35 93" : "37 0 35 93";
  const viewLabel = view === "front" ? "Front" : "Back";

  const selected = regions[selectedDomain];
  const selectedMeta = selected ? STATUS_META[selected.status] : null;
  const selectedColor = selectedMeta?.hex ?? "#0B3D91";
  const selectedMuscles = muscles.filter(
    (muscle) => domainFor(muscle.id) === selectedDomain,
  );
  const hasSelectedMuscles = selectedMuscles.length > 0;

  const hovered = hoveredId
    ? (muscles.find((muscle) => muscle.id === hoveredId) ?? null)
    : null;
  const hoveredDomain = hovered ? domainFor(hovered.id) : null;
  const hoveredStatus = hoveredDomain
    ? (regions[hoveredDomain]?.status ?? "unknown")
    : "unknown";
  const hoveredMeta = STATUS_META[hoveredStatus];

  const wholeBody = regions.immune;
  const wholeMeta = wholeBody ? STATUS_META[wholeBody.status] : null;

  return (
    <div className={cn("mt-3", className)}>
      <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-lg bg-surface-muted/50 px-4 py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 55% at 50% 42%, #FFFFFF 0%, rgba(255,255,255,0) 72%)",
          }}
        />

        {selected && selectedMeta && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium text-ink shadow-sm">
            <span className={cn("h-1.5 w-1.5 rounded-full", selectedMeta.dot)} />
            {selected.label}
            <span className={selectedMeta.text}>{selectedMeta.label}</span>
          </span>
        )}

        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-line bg-surface/90 p-0.5 shadow-sm">
          {(["front", "back"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => {
                setView(value);
                setHoveredId(null);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                view === value
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-ink",
              )}
            >
              {value === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>

        <svg
          viewBox={viewBox}
          role="img"
          aria-label={`${viewLabel} anatomical body map. ${selected?.label ?? ""} selected. Use the Systems list for keyboard selection.`}
          className="relative z-[1] h-[420px] w-auto drop-shadow-[0_18px_36px_rgba(15,27,45,0.16)] sm:h-[480px]"
          onPointerLeave={() => setHoveredId(null)}
        >
          <g>
            {muscles.map((muscle) => (
              <path
                key={`base-${muscle.id}`}
                d={muscle.path}
                data-muscle={muscle.id}
                fill="#D8E3ED"
                stroke="#FFFFFF"
                strokeWidth={0.55}
                strokeLinejoin="round"
                className="cursor-pointer"
                onPointerEnter={() => setHoveredId(muscle.id)}
                onClick={() => onSelectDomain(domainFor(muscle.id))}
              />
            ))}
          </g>

          <g pointerEvents="none">
            {muscles.map((muscle) => {
              const domain = domainFor(muscle.id);
              const status = regions[domain]?.status ?? "unknown";
              const meta = STATUS_META[status];
              const isSelected = domain === selectedDomain;

              return (
                <path
                  key={`tint-${muscle.id}`}
                  d={muscle.path}
                  fill={meta.hex}
                  fillOpacity={isSelected ? 0.55 : 0.32}
                  stroke="#FFFFFF"
                  strokeWidth={0.55}
                  strokeLinejoin="round"
                />
              );
            })}
          </g>

          {hovered && (
            <path
              d={hovered.path}
              fill={hoveredMeta.hex}
              fillOpacity={0.7}
              stroke={hoveredMeta.hex}
              strokeWidth={0.6}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}

          {selectedDomain === "immune" && (
            <ellipse
              cx={view === "front" ? 17.5 : 54.5}
              cy={46.5}
              rx={16.5}
              ry={45}
              fill="none"
              stroke={selectedColor}
              strokeWidth={0.6}
              strokeDasharray="1.4 2.2"
              opacity={0.75}
              pointerEvents="none"
            />
          )}
        </svg>

        <p className="absolute bottom-3 left-3 z-10 max-w-[70%] truncate text-[10px] text-muted">
          {hovered && hoveredDomain
            ? `${hovered.name} · ${regions[hoveredDomain]?.label ?? ""}`
            : "Hover or tap a muscle to inspect it."}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => onSelectDomain("immune")}
          aria-pressed={selectedDomain === "immune"}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
            selectedDomain === "immune"
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-2 hover:border-line-strong",
          )}
        >
          <ShieldCheck size={12} className={wholeMeta?.text ?? "text-muted"} aria-hidden />
          Whole body
          {wholeMeta && (
            <span className={cn("text-[10px]", wholeMeta.text)}>{wholeMeta.label}</span>
          )}
        </button>

        <span className="text-right text-[10px] text-muted">
          {selectedDomain === "sleep"
            ? "Schedule domain — no body region"
            : hasSelectedMuscles
              ? "70+ muscles · front & back"
              : "Switch to the front view"}
        </span>
      </div>
    </div>
  );
}
