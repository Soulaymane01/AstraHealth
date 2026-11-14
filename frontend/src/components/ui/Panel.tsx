import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  padded?: boolean;
  bodyClassName?: string;
}

export function Panel({
  label,
  title,
  subtitle,
  actions,
  padded = true,
  className,
  bodyClassName,
  children,
  ...props
}: PanelProps) {
  const hasHeader = Boolean(label || title || subtitle || actions);

  return (
    <section
      className={cn("card-shadow rounded-xl border border-line bg-surface", className)}
      {...props}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
          <div className="min-w-0">
            {label && <p className="text-xs font-medium text-muted">{label}</p>}
            {title && (
              <h2
                className={cn(
                  "text-[15px] font-semibold tracking-[-0.01em] text-ink",
                  label && "mt-0.5",
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "px-5 pb-5", padded && !hasHeader && "pt-5", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
