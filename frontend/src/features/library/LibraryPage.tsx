import { BookOpen, Stethoscope } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ArticleCard } from "@/components/ui/ArticleCard";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAssistantStore } from "@/features/assistant/store";
import { useKnowledgeArticles } from "@/features/knowledge/queries";

const DOMAIN_ORDER = [
  "Cardiovascular",
  "Sleep & circadian",
  "Musculoskeletal",
  "Neurobehavioral",
  "Metabolic & nutrition",
  "Immune & sensory",
  "General",
];

export function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openAssistant = useAssistantStore((state) => state.openAssistant);
  const articlesQuery = useKnowledgeArticles();
  const selectedDomain = searchParams.get("domain") ?? "All";

  if (articlesQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (articlesQuery.isError) {
    return (
      <QueryError
        title="Library unavailable"
        message="The knowledge library could not be loaded."
        onRetry={() => void articlesQuery.refetch()}
        retrying={articlesQuery.isFetching}
      />
    );
  }

  const articles = articlesQuery.data ?? [];
  const domains = DOMAIN_ORDER.filter((domain) =>
    articles.some((article) => article.domain === domain),
  );
  if (articles.some((article) => !domains.includes(article.domain))) {
    for (const article of articles) {
      if (!domains.includes(article.domain)) domains.push(article.domain);
    }
  }
  const filtered =
    selectedDomain === "All"
      ? articles
      : articles.filter((article) => article.domain === selectedDomain);

  const selectDomain = (domain: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (domain === "All") next.delete("domain");
        else next.set("domain", domain);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Evidence.
          </h1>
          <p className="mt-1 text-sm text-muted">Nine short, sourced articles.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={openAssistant}>
          <Stethoscope size={13} aria-hidden />
          Ask the Flight Surgeon
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {["All", ...domains].map((domain) => (
          <button
            key={domain}
            type="button"
            aria-pressed={selectedDomain === domain}
            onClick={() => selectDomain(domain)}
            className={
              selectedDomain === domain
                ? "rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-medium text-accent"
                : "rounded-full border border-line bg-surface px-3 py-1 text-[11px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            }
          >
            {domain}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted">
          {filtered.length} article{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Panel className="mt-4">
          <div className="flex flex-col items-center py-8 text-center">
            <BookOpen size={18} className="text-muted" aria-hidden />
            <p className="mt-2 text-sm font-medium text-ink">No articles in this domain.</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => selectDomain("All")}
            >
              Show all articles
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard
              key={article.slug}
              title={article.title}
              domain={article.domain}
              readMinutes={article.read_minutes}
              source={article.source_name}
              onClick={() => navigate(`/library/${article.slug}`)}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] text-muted">Guidance only · NASA HRP sources</p>
    </div>
  );
}
