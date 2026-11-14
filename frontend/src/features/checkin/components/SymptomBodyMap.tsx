import { useState } from "react";

import {
  SYMPTOM_MUSCLES,
  SYMPTOM_REGIONS,
  symptomRegionForMuscle,
  type SymptomRegion,
} from "@/features/checkin/checkin-config";
import { cn } from "@/lib/utils";

export interface SymptomBodyMapProps {
  selectedRegion: SymptomRegion;
  reportedRegions: Set<SymptomRegion>;
  onSelectRegion: (region: SymptomRegion) => void;
}

type View = "front" | "back";

export function SymptomBodyMap({
  selectedRegion,
  reportedRegions,
  onSelectRegion,
}: SymptomBodyMapProps) {
  const [view, setView] = useState<View>("front");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const muscles = SYMPTOM_MUSCLES[view];
  const viewBox = view === "front" ? "0 0 35 93" : "37 0 35 93";
  const hoveredRegion = hoveredId ? symptomRegionForMuscle(hoveredId) : null;
  const hoveredLabel = hoveredRegion
    ? SYMPTOM_REGIONS.find((region) => region.id === hoveredRegion)?.label
    : null;

  return (
    <div className="rounded-xl border border-line bg-surface-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted">Tap a region</p>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
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
                "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                view === value ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
              )}
            >
              {value === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-1 flex items-center justify-center">
        <svg
          viewBox={viewBox}
          aria-hidden
          focusable="false"
          className="h-[300px] w-auto drop-shadow-[0_12px_24px_rgba(15,27,45,0.10)]"
          onPointerLeave={() => setHoveredId(null)}
        >
          {muscles.map((muscle) => {
            const region = symptomRegionForMuscle(muscle.id);
            const selected = region === selectedRegion;
            const reported = reportedRegions.has(region);
            const hovered = hoveredRegion === region;
            const fillOpacity = selected ? 0.5 : hovered ? 0.34 : reported ? 0.22 : 1;

            return (
              <path
                key={muscle.id}
                d={muscle.path}
                data-region={region}
                fill={selected || hovered || reported ? "#0F766E" : "#C9D8E5"}
                fillOpacity={fillOpacity}
                stroke="#FFFFFF"
                strokeWidth={0.45}
                strokeLinejoin="round"
                className="cursor-pointer transition-[fill-opacity] duration-150"
                onPointerEnter={() => setHoveredId(muscle.id)}
                onClick={() => onSelectRegion(region)}
              />
            );
          })}

          {selectedRegion === "whole" && (
            <ellipse
              cx={view === "front" ? 17.5 : 54.5}
              cy={46.5}
              rx={16.5}
              ry={45}
              fill="none"
              stroke="#0F766E"
              strokeWidth={0.6}
              strokeDasharray="1.4 2.2"
              opacity={0.75}
              pointerEvents="none"
            />
          )}
        </svg>
      </div>

      <p className="mt-1 min-h-4 text-center text-[10px] text-muted">
        {hoveredLabel
          ? `${hoveredLabel} · tap to select`
          : "The region list below works by keyboard."}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {SYMPTOM_REGIONS.map((region) => (
          <button
            key={region.id}
            type="button"
            aria-pressed={selectedRegion === region.id}
            onClick={() => onSelectRegion(region.id)}
            className={cn(
              "flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors",
              selectedRegion === region.id
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line bg-surface text-ink-2 hover:border-line-strong",
            )}
          >
            <span className="truncate">{region.label}</span>
            {reportedRegions.has(region.id) && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-label="Symptom logged"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
