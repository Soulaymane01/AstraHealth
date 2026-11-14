import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DisclosureProps {
  summary: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  bodyClassName?: string;
}

export function Disclosure({
  summary,
  meta,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
  bodyClassName,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("min-w-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-2 text-left text-xs transition-colors",
          summaryClassName,
        )}
      >
        <ChevronDown
          size={13}
          className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <span className="min-w-0 flex-1">{summary}</span>
        {meta && <span className="shrink-0 text-[10px] text-muted">{meta}</span>}
      </button>
      {open && <div className={cn("mt-2", bodyClassName)}>{children}</div>}
    </div>
  );
}
