import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

import { cn, formatNumber } from "@/lib/utils";

export interface TelemetryNumberProps {
  value: number;
  decimals?: number;
  animate?: boolean;
  className?: string;
  suffix?: string;
  suffixClassName?: string;
}

/** Tabular number with a short count-up transition on change. */
export function TelemetryNumber({
  value,
  decimals = 0,
  animate: shouldAnimateProp = true,
  className,
  suffix,
  suffixClassName,
}: TelemetryNumberProps) {
  const reduce = useReducedMotion();
  const shouldAnimate = shouldAnimateProp && !reduce;

  const motionValue = useMotionValue(shouldAnimate ? 0 : value);
  const text = useTransform(motionValue, (latest) => formatNumber(latest, decimals));

  useEffect(() => {
    if (!shouldAnimate) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [motionValue, shouldAnimate, value]);

  return (
    <span className={cn("tabular font-mono", className)}>
      <motion.span>{text}</motion.span>
      {suffix && (
        <span className={cn("ml-1 text-[0.6em] font-normal text-muted", suffixClassName)}>
          {suffix}
        </span>
      )}
    </span>
  );
}
