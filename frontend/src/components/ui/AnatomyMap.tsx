import { Activity, Bone as BoneIcon, PersonStanding, ShieldCheck } from "lucide-react";
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
type Layer = "skin" | "muscular" | "skeletal";

const LAYERS: { key: Layer; label: string; icon: typeof PersonStanding }[] = [
  { key: "skin", label: "Skin", icon: PersonStanding },
  { key: "muscular", label: "Muscular", icon: Activity },
  { key: "skeletal", label: "Skeletal", icon: BoneIcon },
];

function statusOf(regions: Record<string, AnatomyRegionState>, domain: string): Status {
  return regions[domain]?.status ?? "unknown";
}

function TintPath({
  d,
  domain,
  regions,
  hovered,
  onHover,
  onSelect,
  opacity = 0.4,
}: {
  d: string;
  domain: string;
  regions: Record<string, AnatomyRegionState>;
  hovered: string | null;
  onHover: (domain: string | null) => void;
  onSelect: (domain: string) => void;
  opacity?: number;
}) {
  const meta = STATUS_META[statusOf(regions, domain)];
  return (
    <path
      d={d}
      fill={meta.hex}
      fillOpacity={hovered === domain ? 0.62 : opacity}
      stroke="transparent"
      className="cursor-pointer transition-[fill-opacity] duration-150"
      onPointerEnter={() => onHover(domain)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(domain)}
    />
  );
}

function SkinBody({
  view,
  regions,
  hovered,
  onHover,
  onSelect,
}: {
  view: View;
  regions: Record<string, AnatomyRegionState>;
  hovered: string | null;
  onHover: (domain: string | null) => void;
  onSelect: (domain: string) => void;
}) {
  const back = view === "back";
  const immune = STATUS_META[statusOf(regions, "immune")];
  return (
    <g transform={back ? "translate(37 0)" : undefined}>
      {/* Base silhouette */}
      <g fill="#E8CDBB" stroke="#F7FBFF" strokeWidth={0.35} strokeLinejoin="round">
        <ellipse cx="17.5" cy="5.9" rx="3.7" ry="4.5" />
        <path d="M15.6 9.3h3.8v4.2h-3.8z" />
        <path d="M12.3 14.4c1.8-1.9 8.6-1.9 10.4 0 1.8 1.9 2.4 5.2 1.8 9.2l-.8 13c-.3 3.8-1.1 6.8-2.2 10H13.5c-1.1-3.2-1.9-6.2-2.2-10l-.8-13c-.6-4 0-7.3 1.8-9.2Z" />
        <path d="M10.6 15.2c-1.7 3-2.5 7.8-3.1 13.3l-1 12.1c-.2 2 1.1 3 2 2.2.7-.6.7-2 .9-3.4l1.3-11.5c.5-5.4 1.3-8.7 2.6-11.2Z" />
        <path d="M24.4 15.2c1.7 3 2.5 7.8 3.1 13.3l1 12.1c.2 2-1.1 3-2 2.2-.7-.6-.7-2-.9-3.4l-1.3-11.5c-.5-5.4-1.3-8.7-2.6-11.2Z" />
        <ellipse cx="5.7" cy="44.9" rx="1.6" ry="2.5" />
        <ellipse cx="29.3" cy="44.9" rx="1.6" ry="2.5" />
        <path d="M13.2 45.7h4.2l-.4 20.5-.6 19c0 1.7-1 2.7-2.1 2.7s-2-1-2-2.6l.5-19.2Z" />
        <path d="M17.6 45.7h4.2l.4 20.4.5 19.2c0 1.6-.9 2.6-2 2.6s-2.1-1-2.1-2.7l-.6-19Z" />
        <ellipse cx="13.1" cy="89.6" rx="2.2" ry="1.2" />
        <ellipse cx="21.9" cy="89.6" rx="2.2" ry="1.2" />
      </g>

      {/* Status tint zones */}
      <ellipse
        cx="17.5"
        cy="5.9"
        rx="3.7"
        ry="4.5"
        fill={STATUS_META[statusOf(regions, "neurobehavioral")].hex}
        fillOpacity={hovered === "neurobehavioral" ? 0.62 : 0.35}
        className="cursor-pointer transition-[fill-opacity] duration-150"
        onPointerEnter={() => onHover("neurobehavioral")}
        onPointerLeave={() => onHover(null)}
        onClick={() => onSelect("neurobehavioral")}
      />
      <TintPath
        d="M10.8 18.2c3.6-2.6 9.8-2.6 13.4 0 1.2 2.7 1.4 6.2.8 9.6H10c-.6-3.4-.4-6.9.8-9.6Z"
        domain="cardiovascular"
        regions={regions}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
        opacity={0.42}
      />
      <TintPath
        d="M11.4 28.6h12.2c.2 5-.7 9.4-2.3 12.7H13.7c-1.6-3.3-2.5-7.7-2.3-12.7Z"
        domain="metabolic"
        regions={regions}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
        opacity={0.36}
      />
      <TintPath
        d="M10.6 15.2c-1.7 3-2.5 7.8-3.1 13.3l-1 12.1c-.2 2 1.1 3 2 2.2.7-.6.7-2 .9-3.4l1.3-11.5c.5-5.4 1.3-8.7 2.6-11.2Zm13.8 0c1.7 3 2.5 7.8 3.1 13.3l1 12.1c.2 2-1.1 3-2 2.2-.7-.6-.7-2-.9-3.4l-1.3-11.5c-.5-5.4-1.3-8.7-2.6-11.2Z"
        domain="musculoskeletal"
        regions={regions}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
        opacity={0.22}
      />
      <TintPath
        d="M13.2 45.7h4.2l-.4 20.5-.6 19c0 1.7-1 2.7-2.1 2.7s-2-1-2-2.6l.5-19.2Zm4.4 0h4.2l.4 20.4.5 19.2c0 1.6-.9 2.6-2 2.6s-2.1-1-2.1-2.7l-.6-19Z"
        domain="musculoskeletal"
        regions={regions}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
        opacity={0.22}
      />

      {/* Immune outline */}
      <ellipse
        cx="17.5"
        cy="46.5"
        rx="15.2"
        ry="44.4"
        fill="none"
        stroke={immune.hex}
        strokeWidth={hovered === "immune" ? 0.9 : 0.55}
        strokeDasharray="1.4 2.2"
        opacity={hovered === "immune" ? 0.95 : 0.55}
        className="cursor-pointer transition-opacity duration-150"
        onPointerEnter={() => onHover("immune")}
        onPointerLeave={() => onHover(null)}
        onClick={() => onSelect("immune")}
      />
    </g>
  );
}

function BoneLine({
  d,
  domain,
  regions,
  hovered,
  onHover,
  onSelect,
  width = 1.7,
}: {
  d: string;
  domain: string;
  regions: Record<string, AnatomyRegionState>;
  hovered: string | null;
  onHover: (domain: string | null) => void;
  onSelect: (domain: string) => void;
  width?: number;
}) {
  const meta = STATUS_META[statusOf(regions, domain)];
  return (
    <path
      d={d}
      fill="none"
      stroke={meta.hex}
      strokeOpacity={hovered === domain ? 1 : 0.82}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="cursor-pointer transition-[stroke-opacity] duration-150"
      onPointerEnter={() => onHover(domain)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(domain)}
    />
  );
}

function SkeletalBody({
  view,
  regions,
  hovered,
  onHover,
  onSelect,
}: {
  view: View;
  regions: Record<string, AnatomyRegionState>;
  hovered: string | null;
  onHover: (domain: string | null) => void;
  onSelect: (domain: string) => void;
}) {
  const back = view === "back";
  const boneProps = { regions, hovered, onHover, onSelect };
  const immune = STATUS_META[statusOf(regions, "immune")];

  return (
    <g transform={back ? "translate(37 0)" : undefined}>
      <g opacity="0.28" fill="#F8F5EE">
        <ellipse cx="17.5" cy="5.7" rx="3.5" ry="4.2" />
        <path d="M12.6 14.2c2.8-1.4 7-1.4 9.8 0l2 8.5-2.2 15H12.8l-2.2-15Z" />
        <path d="M12.8 45.2c2.4-1.1 7-1.1 9.4 0l1.2 7.2-2.2 17-1.6 18h-3.2l-1.6-18-2.2-17Z" />
      </g>

      {/* Skull and jaw */}
      <BoneLine
        d="M14.4 5.7c0-2.6 1.4-4.4 3.1-4.4s3.1 1.8 3.1 4.4c0 1.8-.6 3.1-1.4 3.8v1.3h-3.4V9.5c-.8-.7-1.4-2-1.4-3.8Z"
        domain="neurobehavioral"
        {...boneProps}
        width={1.5}
      />
      <BoneLine d="M15.6 11.1h3.8l.7 2.3h-5.2Z" domain="neurobehavioral" {...boneProps} width={1.2} />

      {/* Spine */}
      <BoneLine
        d="M17.5 13.5v33"
        domain="neurobehavioral"
        {...boneProps}
        width={1.4}
      />
      {Array.from({ length: 11 }, (_, index) => (
        <circle
          key={index}
          cx={17.5}
          cy={15 + index * 3}
          r={0.7}
          fill={STATUS_META[statusOf(regions, "neurobehavioral")].hex}
          fillOpacity={hovered === "neurobehavioral" ? 1 : 0.82}
          className="cursor-pointer"
          onPointerEnter={() => onHover("neurobehavioral")}
          onPointerLeave={() => onHover(null)}
          onClick={() => onSelect("neurobehavioral")}
        />
      ))}

      {/* Ribcage */}
      {!back &&
        [0, 1, 2, 3, 4].map((row) => (
          <BoneLine
            key={row}
            d={`M17.5 ${18 + row * 2.4}c-4.2-.4-6.5 1-7.3 3.4M17.5 ${18 + row * 2.4}c4.2-.4 6.5 1 7.3 3.4`}
            domain="cardiovascular"
            {...boneProps}
            width={1.15}
          />
        ))}
      {back && (
        <>
          <BoneLine d="M12.8 17.5c1.7 2.2 2.6 5.7 2.2 9.2M22.2 17.5c-1.7 2.2-2.6 5.7-2.2 9.2" domain="musculoskeletal" {...boneProps} width={1.2} />
        </>
      )}

      {/* Pelvis */}
      <BoneLine
        d="M13 45.6c1.1 3.6 2.6 5.6 4.5 6.4 1.4.6 2.6.6 4 0 1.9-.8 3.4-2.8 4.5-6.4"
        domain="musculoskeletal"
        {...boneProps}
        width={1.8}
      />

      {/* Metabolic core */}
      <path
        d="M15.4 30.8c1.2-1.5 3-1.5 4.2 0 .9 1.2.4 3.3-.5 4.1-.8.8-2.4.8-3.2 0-.9-.8-1.4-2.9-.5-4.1Z"
        fill={STATUS_META[statusOf(regions, "metabolic")].hex}
        fillOpacity={hovered === "metabolic" ? 0.9 : 0.62}
        className="cursor-pointer transition-[fill-opacity] duration-150"
        onPointerEnter={() => onHover("metabolic")}
        onPointerLeave={() => onHover(null)}
        onClick={() => onSelect("metabolic")}
      />

      {/* Arms */}
      <BoneLine d="M10.8 16.2c-2 5.6-3.1 12.7-3.8 20.2M7 36.5l-1.8 8.2" domain="musculoskeletal" {...boneProps} />
      <BoneLine d="M24.2 16.2c2 5.6 3.1 12.7 3.8 20.2M28 36.5l1.8 8.2" domain="musculoskeletal" {...boneProps} />
      <BoneLine d="M10.7 16.2 8.1 26M24.3 16.2l2.6 9.8" domain="musculoskeletal" {...boneProps} width={1.3} />

      {/* Legs */}
      <BoneLine d="M14.3 47.5 13.7 69M20.7 47.5l.6 21.5" domain="musculoskeletal" {...boneProps} width={2} />
      <BoneLine d="M13.7 69 13.1 88M21.3 69l.6 19" domain="musculoskeletal" {...boneProps} width={1.6} />
      <BoneLine d="M11.8 89.2h4.2M19 89.2h4.2" domain="musculoskeletal" {...boneProps} width={1.2} />

      {/* Whole-body outline */}
      <ellipse
        cx="17.5"
        cy="46.5"
        rx="15.2"
        ry="44.4"
        fill="none"
        stroke={immune.hex}
        strokeWidth={hovered === "immune" ? 0.9 : 0.55}
        strokeDasharray="1.4 2.2"
        opacity={hovered === "immune" ? 0.95 : 0.45}
        className="cursor-pointer transition-opacity duration-150"
        onPointerEnter={() => onHover("immune")}
        onPointerLeave={() => onHover(null)}
        onClick={() => onSelect("immune")}
      />
    </g>
  );
}

function MuscularBody({
  view,
  regions,
  selectedDomain,
  hovered,
  onHover,
  onSelect,
}: {
  view: View;
  regions: Record<string, AnatomyRegionState>;
  selectedDomain: string;
  hovered: string | null;
  onHover: (domain: string | null) => void;
  onSelect: (domain: string) => void;
}) {
  const muscles = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
  const immune = STATUS_META[statusOf(regions, "immune")];
  const back = view === "back";

  return (
    <>
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
            onPointerEnter={() => onHover(domainFor(muscle.id))}
            onPointerLeave={() => onHover(null)}
            onClick={() => onSelect(domainFor(muscle.id))}
          />
        ))}
      </g>
      <g pointerEvents="none">
        {muscles.map((muscle) => {
          const domain = domainFor(muscle.id);
          const meta = STATUS_META[regions[domain]?.status ?? "unknown"];
          const isSelected = domain === selectedDomain;
          return (
            <path
              key={`tint-${muscle.id}`}
              d={muscle.path}
              fill={meta.hex}
              fillOpacity={hovered === domain ? 0.72 : isSelected ? 0.58 : 0.34}
              stroke="#FFFFFF"
              strokeWidth={0.55}
              strokeLinejoin="round"
            />
          );
        })}
      </g>
      <ellipse
        cx={back ? 54.5 : 17.5}
        cy={46.5}
        rx={16.5}
        ry={45}
        fill="none"
        stroke={immune.hex}
        strokeWidth={selectedDomain === "immune" ? 0.9 : 0.6}
        strokeDasharray="1.4 2.2"
        opacity={selectedDomain === "immune" ? 0.9 : 0.6}
        pointerEvents="none"
      />
    </>
  );
}

export function AnatomyMap({
  regions,
  selectedDomain,
  onSelectDomain,
  className,
}: AnatomyMapProps) {
  const [view, setView] = useState<View>("front");
  const [layer, setLayer] = useState<Layer>("skin");
  const [hovered, setHovered] = useState<string | null>(null);

  const selected = regions[selectedDomain];
  const selectedMeta = selected ? STATUS_META[selected.status] : null;
  const hoveredDomain = hovered ?? selectedDomain;
  const hoveredLabel = regions[hoveredDomain]?.label ?? "";
  const hoveredMeta = STATUS_META[statusOf(regions, hoveredDomain)];
  const wholeMeta = STATUS_META[statusOf(regions, "immune")];

  return (
    <div className={cn("mt-3", className)}>
      <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-muted/60 px-3 py-3 sm:min-h-[460px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 42%, #FFFFFF 0%, rgba(255,255,255,0) 74%)",
          }}
        />

        {selected && selectedMeta && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium text-ink shadow-sm">
            <span className={cn("h-1.5 w-1.5 rounded-full", selectedMeta.dot)} />
            {selected.label}
            <span className={selectedMeta.text}>{selectedMeta.label}</span>
          </span>
        )}

        <div
          className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-full border border-line bg-surface/90 p-0.5 shadow-sm"
          role="tablist"
          aria-label="Anatomy layer"
        >
          {LAYERS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={layer === item.key}
                onClick={() => setLayer(item.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors",
                  layer === item.key
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-ink",
                )}
              >
                <Icon size={11} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>

        <svg
          viewBox={view === "front" ? "0 0 35 93" : "37 0 35 93"}
          role="img"
          aria-label={`${view} ${layer} anatomy. ${selected?.label ?? ""} selected.`}
          className="relative z-[1] h-[310px] w-auto drop-shadow-[0_18px_34px_rgba(10,42,92,0.12)] sm:h-[410px]"
          onPointerLeave={() => setHovered(null)}
        >
          {layer === "skin" && (
            <SkinBody
              view={view}
              regions={regions}
              hovered={hovered}
              onHover={setHovered}
              onSelect={onSelectDomain}
            />
          )}
          {layer === "muscular" && (
            <MuscularBody
              view={view}
              regions={regions}
              selectedDomain={selectedDomain}
              hovered={hovered}
              onHover={setHovered}
              onSelect={onSelectDomain}
            />
          )}
          {layer === "skeletal" && (
            <SkeletalBody
              view={view}
              regions={regions}
              hovered={hovered}
              onHover={setHovered}
              onSelect={onSelectDomain}
            />
          )}
        </svg>

        <p className="absolute bottom-3 left-3 z-10 max-w-[65%] truncate text-[10px] text-muted">
          {hovered
            ? `${hoveredLabel} · ${hoveredMeta.label}`
            : layer === "skin"
              ? "Tap a body region"
              : layer === "skeletal"
                ? "Tap a bone group"
                : "Tap a muscle group"}
        </p>

        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-full border border-line bg-surface/90 p-0.5 shadow-sm">
          {(["front", "back"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => {
                setView(value);
                setHovered(null);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition-colors",
                view === value
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-ink",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
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
          <ShieldCheck size={12} className={wholeMeta.text} aria-hidden />
          Whole body
          <span className={cn("text-[10px]", wholeMeta.text)}>{wholeMeta.label}</span>
        </button>
        <span className="text-right text-[10px] text-muted">
          Skin · Muscular · Skeletal
        </span>
      </div>
    </div>
  );
}
