import { ArrowLeft, ArrowUpRight, BookOpen, Stethoscope } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { MarkdownBody } from "@/components/ui/MarkdownBody";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAssistantStore } from "@/features/assistant/store";
import { useKnowledgeArticle } from "@/features/knowledge/queries";

export function ArticlePage() {
  const navigate = useNavigate();
  const params = useParams<{ slug: string }>();
  const articleQuery = useKnowledgeArticle(params.slug ?? null);
  const openAssistant = useAssistantStore((state) => state.openAssistant);

  if (articleQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (articleQuery.isError || !articleQuery.data) {
    return (
      <QueryError
        title="Article unavailable"
        message={
          articleQuery.error instanceof Error
            ? articleQuery.error.message
            : "That article could not be loaded."
        }
        onRetry={() => void articleQuery.refetch()}
        retrying={articleQuery.isFetching}
        secondaryAction={
          <Button variant="ghost" size="sm" onClick={() => navigate("/library")}>
            Back to Library
          </Button>
        }
      />
    );
  }

  const article = articleQuery.data;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link to="/library" className="hover:text-ink">
          Library
        </Link>
        <span aria-hidden>/</span>
        <Link
          to={`/library?domain=${encodeURIComponent(article.domain)}`}
          className="hover:text-ink"
        >
          {article.domain}
        </Link>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">{article.domain}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            {article.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{article.summary}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={openAssistant}>
          <Stethoscope size={13} aria-hidden />
          Ask about this
        </Button>
      </div>

      <Panel className="mt-5">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <BookOpen size={12} aria-hidden />
            {article.read_minutes} min read
          </span>
          <span className="text-[10px] text-muted">{article.source_name}</span>
        </div>
        <div className="pt-4">
          <MarkdownBody markdown={article.body_md} />
        </div>
      </Panel>

      <Panel className="mt-4" title="Source" subtitle="The citation used in the app.">
        <a
          href={article.source_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-3 transition-colors hover:border-accent/30 hover:bg-accent-soft/30"
        >
          <div>
            <p className="text-xs font-medium text-ink">{article.source_name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-2">{article.citation}</p>
          </div>
          <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        </a>
        <Link
          to="/library"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong"
        >
          <ArrowLeft size={12} aria-hidden />
          Back to Library
        </Link>
      </Panel>
    </div>
  );
}
