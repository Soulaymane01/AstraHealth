import { Check, Lock, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CreditChip } from "@/components/ui/RankBadge";
import { cn } from "@/lib/utils";

export type RewardState = "locked" | "available" | "redeemed";

export interface RewardCardProps {
  name: string;
  description: string;
  cost: number;
  icon: LucideIcon;
  state?: RewardState;
  shortfall?: number;
  onRedeem?: () => void;
  className?: string;
}

export function RewardCard({
  name,
  description,
  cost,
  icon: Icon,
  state = "available",
  shortfall = 0,
  onRedeem,
  className,
}: RewardCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4",
        state === "redeemed" && "bg-surface-muted/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            state === "available" ? "bg-accent-soft text-accent" : "bg-surface-muted text-muted",
          )}
        >
          <Icon size={16} aria-hidden />
        </span>
        <CreditChip amount={cost} />
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">{description}</p>
      </div>

      <div className="mt-auto pt-1">
        {state === "available" && (
          <Button variant="primary" size="sm" className="w-full" onClick={onRedeem}>
            Redeem
          </Button>
        )}
        {state === "locked" && (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            <Lock size={11} aria-hidden />
            {shortfall > 0 ? `${shortfall} FC to unlock` : "Locked"}
          </Button>
        )}
        {state === "redeemed" && (
          <Button variant="ghost" size="sm" className="w-full text-nominal" disabled>
            <Check size={12} aria-hidden />
            Redeemed
          </Button>
        )}
      </div>
    </div>
  );
}
