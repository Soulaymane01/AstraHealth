import { FileText, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

export interface CopilotCitation {
  slug: string;
  title: string;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CopilotCitation[];
}

export interface CopilotDrawerProps {
  messages?: CopilotMessage[];
  suggestions?: string[];
  onSend?: (question: string) => void;
  onClose?: () => void;
  linkCitations?: boolean;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Why is my HRV low?",
  "What should I do about sleep debt?",
  "Is this reading a red flag?",
];

const WELCOME: CopilotMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Flight Surgeon SI online. I can explain your readiness factors, interpret a metric against your baseline, and point you to the relevant HRP guidance. I do not diagnose.",
  citations: [{ slug: "hrp-overview", title: "NASA Human Research Program" }],
};

export function CopilotDrawer({
  messages = [WELCOME],
  suggestions = DEFAULT_SUGGESTIONS,
  onSend,
  onClose,
  linkCitations = false,
  className,
}: CopilotDrawerProps) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<CopilotMessage[]>(messages);
  const displayedMessages = onSend ? messages : localMessages;

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setDraft("");

    if (onSend) {
      onSend(trimmed);
      return;
    }

    setLocalMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "This preview is not connected to the assistant service. In the app, Flight Surgeon SI answers from your live metrics and the HRP library, and always cites its source.",
        citations: [{ slug: "hrp-overview", title: "NASA Human Research Program" }],
      },
    ]);
  };

  return (
    <Panel
      title="Flight Surgeon SI"
      subtitle="Cited guidance, not a diagnosis."
      className={cn("flex h-[520px] w-full flex-col", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
      actions={
        onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assistant">
            <X size={14} />
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
            <Sparkles size={10} aria-hidden />
            Beta
          </span>
        )
      }
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {displayedMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[92%] rounded-lg px-3 py-2.5",
              message.role === "user" ? "ml-auto bg-accent-soft" : "bg-surface-muted",
            )}
          >
            <p className="text-[13px] leading-relaxed text-ink">{message.content}</p>
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.citations.map((citation) =>
                  linkCitations ? (
                    <Link
                      key={citation.slug}
                      to={`/library/${citation.slug}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-2 hover:border-accent/30 hover:text-accent"
                    >
                      <FileText size={9} aria-hidden />
                      {citation.title}
                    </Link>
                  ) : (
                    <span
                      key={citation.slug}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-2"
                    >
                      <FileText size={9} aria-hidden />
                      {citation.title}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3">
        <div
          className="mb-2 flex gap-1.5 overflow-x-auto pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          role="group"
          aria-label="Suggested questions"
          tabIndex={0}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-2 transition-colors hover:border-accent/30 hover:text-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask Flight Surgeon SI…"
            aria-label="Ask Flight Surgeon SI"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
          />
          <Button type="submit" variant="primary" size="icon" aria-label="Send question">
            <Send size={13} />
          </Button>
        </form>

        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Guidance only. For red-flag symptoms, contact the flight surgeon on the ground.
        </p>
      </div>
    </Panel>
  );
}
