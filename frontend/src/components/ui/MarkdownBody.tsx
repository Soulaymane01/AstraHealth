import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks = markdown.trim().split(/\n{2,}/);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={index} className="pt-1 text-sm font-semibold text-ink">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("### ")) {
          return (
            <h3 key={index} className="text-[13px] font-semibold text-ink">
              {block.slice(4)}
            </h3>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-2">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inline(line.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="text-[13px] leading-relaxed text-ink-2">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}
