import { ChevronDown, Info } from "lucide-react";
import { Link } from "react-router-dom";

import type { StepDefinition } from "@/features/checkin/checkin-config";

export interface WhyWeAskProps {
  article: StepDefinition["article"];
}

export function WhyWeAsk({ article }: WhyWeAskProps) {
  return (
    <details className="group mt-5 rounded-lg border border-line bg-surface-muted/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-xs font-medium text-ink-2 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Info size={13} className="text-accent" aria-hidden />
          Why we ask
        </span>
        <ChevronDown
          size={14}
          className="text-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-line px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-ink-2">{article.body}</p>
        <p className="mt-2 text-[11px] text-muted">
          Source: {article.source} ·{" "}
          <Link
            to={`/library/${article.slug}`}
            className="font-medium text-accent hover:text-accent-strong"
          >
            Read “{article.title}”
          </Link>
        </p>
      </div>
    </details>
  );
}
