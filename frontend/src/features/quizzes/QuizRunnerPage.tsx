import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { AchievementTile } from "@/features/gamification/components/AchievementTile";
import { useQuiz, useSubmitQuiz } from "@/features/quizzes/queries";
import type { Quiz, QuizResult } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function ResultView({
  quiz,
  result,
  onRetake,
}: {
  quiz: Quiz;
  result: QuizResult;
  onRetake: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link to="/quizzes" className="hover:text-ink">
          Quizzes
        </Link>
        <ChevronRight size={12} aria-hidden />
        <span className="text-ink-2">{quiz.title}</span>
      </div>

      <Panel className="mt-4" title="Quiz result" subtitle={`${quiz.title} · ${result.mode} mode`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted">Score</p>
            <p className="text-4xl font-semibold tabular tracking-tight text-ink">
              {result.score}%
            </p>
            <p className="mt-1 text-xs text-muted">
              {result.correct_count} of {result.total_questions} correct
              {result.subject ? ` · about ${result.subject.full_name}` : ""}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-accent">
              {result.credits_awarded > 0 ? `+${result.credits_awarded} MP` : "No points"}
            </p>
            <p className="text-[10px] text-muted">
              {result.credits_awarded > 0 ? "first completion" : "retake — no points"}
            </p>
          </div>
        </div>

        {result.new_achievements.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-medium text-muted">New achievements</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {result.new_achievements.map((achievement) => (
                <AchievementTile key={achievement.code} achievement={achievement} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={onRetake}>
            <RotateCcw size={12} aria-hidden />
            Retake
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/quizzes")}>
            Back to quizzes
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/log")}>
            View mission log
          </Button>
        </div>
      </Panel>

      <Panel className="mt-4" title="Review" subtitle="Every answer with the source explanation.">
        <ol className="space-y-3">
          {result.questions.map((question, index) => (
            <li key={question.id} className="rounded-lg border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                {question.correct ? (
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-nominal" aria-hidden />
                ) : (
                  <XCircle size={15} className="mt-0.5 shrink-0 text-caution" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">
                    {index + 1}. {question.prompt}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      question.correct ? "text-nominal" : "text-caution",
                    )}
                  >
                    Your answer: {question.options[question.selected_index ?? 0] ?? "No answer"}
                  </p>
                  {!question.correct && (
                    <p className="mt-0.5 text-[11px] text-nominal">
                      Correct: {question.options[question.answer_index]}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

export function QuizRunnerPage() {
  const navigate = useNavigate();
  const params = useParams<{ slug: string }>();
  const quizQuery = useQuiz(params.slug ?? null);
  const submitQuiz = useSubmitQuiz(params.slug ?? "");
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (quizQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (quizQuery.isError || !quizQuery.data) {
    return (
      <QueryError
        title="Quiz unavailable"
        message={
          quizQuery.error instanceof Error
            ? quizQuery.error.message
            : "That quiz could not be loaded."
        }
        onRetry={() => void quizQuery.refetch()}
        retrying={quizQuery.isFetching}
        secondaryAction={
          <Button variant="ghost" size="sm" onClick={() => navigate("/quizzes")}>
            Back to quizzes
          </Button>
        }
      />
    );
  }

  const quiz = quizQuery.data;

  if (result) {
    return (
      <ResultView
        quiz={quiz}
        result={result}
        onRetake={() => {
          setResult(null);
          setStarted(false);
          setCurrent(0);
          setAnswers([]);
          setSubjectId("");
          setError(null);
        }}
      />
    );
  }

  const start = () => {
    if (quiz.mode === "crew" && !subjectId) {
      setError("Select a crewmate before starting this quiz.");
      return;
    }
    setAnswers(Array.from({ length: quiz.questions.length }, () => -1));
    setCurrent(0);
    setStarted(true);
    setError(null);
  };

  if (!started) {
    const canStart = quiz.mode !== "crew" || quiz.eligible_subjects.length > 0;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link to="/quizzes" className="hover:text-ink">
            Quizzes
          </Link>
          <ChevronRight size={12} aria-hidden />
          <span className="text-ink-2">{quiz.title}</span>
        </div>
        <Panel
          className="mt-4"
          title={quiz.title}
          subtitle={`${quiz.questions.length} questions · ${quiz.mode} mode`}
        >
          <p className="text-[13px] leading-relaxed text-ink-2">
            {quiz.mode === "crew"
              ? "This is a perception check, not a diagnosis. Choose a crewmate who has shared their status, then answer about what you have noticed."
              : "A short check on sleep, recovery, and red flags. Every answer includes a source explanation."}
          </p>

          {quiz.mode === "crew" && (
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-ink-2">
                Crewmate
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                >
                  <option value="">Select a crewmate</option>
                  {quiz.eligible_subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.full_name} · {subject.role} ·{" "}
                      {subject.share_status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              {quiz.eligible_subjects.length === 0 ? (
                <p className="mt-2 text-[11px] text-caution">
                  No crewmates have consented to be a subject yet. They can change their sharing
                  preference on the Crew page.
                </p>
              ) : (
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  Only crewmates who share their status appear here. The quiz never exposes their
                  health readings.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-critical/20 bg-critical-soft px-3 py-2 text-[11px] text-critical">
              {error}
            </p>
          )}

          <Button
            variant="primary"
            className="mt-4 w-full sm:w-auto"
            onClick={start}
            disabled={!canStart}
          >
            Start quiz
            <ChevronRight size={14} aria-hidden />
          </Button>
        </Panel>
      </div>
    );
  }

  const question = quiz.questions[current];
  const selected = answers[current] ?? -1;

  const selectAnswer = (index: number) => {
    setAnswers((currentAnswers) => {
      const next = [...currentAnswers];
      next[current] = index;
      return next;
    });
    setError(null);
  };

  const next = () => {
    if (selected < 0) {
      setError("Choose an answer before continuing.");
      return;
    }
    if (current < quiz.questions.length - 1) {
      setCurrent((value) => value + 1);
      setError(null);
      return;
    }
    submitQuiz.mutate(
      {
        answers,
        subject_user_id: quiz.mode === "crew" ? Number(subjectId) : undefined,
      },
      {
        onSuccess: (value) => setResult(value),
        onError: (submitError) =>
          setError(
            submitError instanceof Error ? submitError.message : "Unable to submit the quiz.",
          ),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <Link to="/quizzes" className="hover:text-ink">
          Quizzes
        </Link>
        <span>
          Question {current + 1} of {quiz.questions.length}
        </span>
      </div>

      <Panel className="mt-3" title={quiz.title} subtitle={`${quiz.mode} mode`}>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <h2 className="mt-4 text-base font-semibold leading-snug text-ink">{question.prompt}</h2>

        <div className="mt-3 space-y-2" role="group" aria-label="Answer options">
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              aria-pressed={selected === index}
              onClick={() => selectAnswer(index)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors",
                selected === index
                  ? "border-accent/40 bg-accent-soft text-ink"
                  : "border-line bg-surface text-ink-2 hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px]",
                  selected === index
                    ? "border-accent bg-accent text-white"
                    : "border-line-strong text-muted",
                )}
              >
                {selected === index ? <CheckCircle2 size={9} aria-hidden /> : index + 1}
              </span>
              {option}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-critical/20 bg-critical-soft px-3 py-2 text-[11px] text-critical">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrent((value) => Math.max(0, value - 1));
              setError(null);
            }}
            disabled={current === 0 || submitQuiz.isPending}
          >
            <ChevronLeft size={13} aria-hidden />
            Back
          </Button>
          <Button variant="primary" size="sm" onClick={next} disabled={submitQuiz.isPending}>
            {current === quiz.questions.length - 1 ? "Submit quiz" : "Next question"}
            <ChevronRight size={13} aria-hidden />
          </Button>
        </div>
      </Panel>

      <p className="mt-3 text-center text-[10px] text-muted">
        Guidance only, not a diagnosis. If a crewmate has a red flag, escalate to the flight
        surgeon.
      </p>
    </div>
  );
}
