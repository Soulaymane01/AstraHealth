import { ArrowUpRight, BookOpen, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ArticleCardProps {
  title: string;
  domain: string;
  readMinutes: number;
  source: string;
  onClick?: () => void;
  className?: string;
}

export function ArticleCard({
  title,
  domain,
  readMinutes,
  source,
  onClick,
  className,
}: ArticleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-muted/30",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-xs font-medium text-accent">{domain}</span>
        <ArrowUpRight
          size={14}
          aria-hidden
          className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
      <h2 className="text-sm font-semibold leading-snug text-ink">{title}</h2>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={11} aria-hidden />
          {readMinutes} min read
        </span>
        <span className="inline-flex items-center gap-1">
          <BookOpen size={11} aria-hidden />
          {source}
        </span>
      </div>
    </button>
  );
}
