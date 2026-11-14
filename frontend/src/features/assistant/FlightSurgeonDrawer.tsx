import { useEffect, useRef, useState } from "react";

import { CopilotDrawer, type CopilotMessage } from "@/components/ui/CopilotDrawer";
import { useAskAssistant, useAssistantSuggestions } from "@/features/assistant/queries";
import { useAssistantStore } from "@/features/assistant/store";

const WELCOME: CopilotMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Flight Surgeon online. I can explain your readiness factors, interpret a metric against your baseline, and point you to the relevant HRP guidance. I do not diagnose.",
  citations: [{ slug: "hrv-basics", title: "Why HRV falls before you feel tired" }],
};

export function FlightSurgeonDrawer() {
  const open = useAssistantStore((state) => state.open);
  const close = useAssistantStore((state) => state.closeAssistant);
  const suggestionsQuery = useAssistantSuggestions(open);
  const ask = useAskAssistant();
  const panelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([WELCOME]);
  const [followUps, setFollowUps] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const input = panelRef.current?.querySelector<HTMLInputElement>("input");
    input?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, close]);

  if (!open) return null;

  const suggestions =
    followUps.length > 0
      ? followUps
      : (suggestionsQuery.data ?? []).map((suggestion) => suggestion.question);

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || ask.isPending) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ]);
    ask.mutate(trimmed, {
      onSuccess: (answer) => {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: answer.answer,
            citations: answer.citations,
          },
        ]);
        setFollowUps(answer.suggestions);
      },
      onError: (error) => {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              error instanceof Error
                ? error.message
                : "The Flight Surgeon could not answer right now.",
          },
        ]);
      },
    });
  };

  const displayedMessages = ask.isPending
    ? [
        ...messages,
        {
          id: "pending",
          role: "assistant" as const,
          content: "Reading your readiness, alerts, and recent readings…",
        },
      ]
    : messages;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Flight Surgeon">
      <div className="absolute inset-0 bg-ink/20" onClick={close} aria-hidden />
      <div ref={panelRef} className="absolute inset-y-0 right-0 w-full max-w-md p-3">
        <CopilotDrawer
          messages={displayedMessages}
          suggestions={suggestions}
          onSend={send}
          onClose={close}
          linkCitations
          className="h-full"
        />
      </div>
    </div>
  );
}
