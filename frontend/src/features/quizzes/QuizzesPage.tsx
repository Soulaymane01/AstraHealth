import { BookOpenCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { QueryError } from "@/components/ui/QueryError";
import { QuizCard } from "@/components/ui/QuizCard";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useQuizzes } from "@/features/quizzes/queries";

export function QuizzesPage() {
  const navigate = useNavigate();
  const quizzesQuery = useQuizzes();

  if (quizzesQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (quizzesQuery.isError) {
    return (
      <QueryError
        title="Quizzes unavailable"
        message="The quiz list could not be loaded."
        onRetry={() => void quizzesQuery.refetch()}
        retrying={quizzesQuery.isFetching}
      />
    );
  }

  const order = ["know-yourself", "know-your-crew", "phq9-depression", "gad7-anxiety"];
  const quizzes = [...(quizzesQuery.data ?? [])].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Quizzes</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Know yourself. Know your crew.
          </h1>
          <p className="mt-1 text-sm text-muted">Two knowledge checks. Two mental-health screens.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
          <BookOpenCheck size={12} className="text-accent" aria-hidden />
          {quizzes.length} checks
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {quizzes.map((quiz) => (
          <QuizCard
            key={quiz.slug}
            title={quiz.title}
            mode={quiz.mode as "self" | "crew"}
            kind={quiz.kind as "knowledge" | "screening"}
            questions={quiz.question_count}
            bestScore={quiz.best_score ?? undefined}
            latestTotalScore={quiz.latest_total_score ?? undefined}
            maxScore={quiz.max_score ?? undefined}
            latestSeverityLabel={quiz.latest_severity_label ?? undefined}
            status={quiz.attempt_count > 0 ? "completed" : "new"}
            onStart={() => navigate(`/quizzes/${quiz.slug}`)}
          />
        ))}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-muted">
        Screening tools are not diagnoses. PHQ-9 and GAD-7 responses are visible to the flight
        surgeon and do not award mission points.
      </p>
    </div>
  );
}
