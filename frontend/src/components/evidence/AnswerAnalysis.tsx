import type { RetrievedChunk } from "@/types/app";

interface AnswerAnalysisProps {
  chunks: RetrievedChunk[];
  claimCount: number;
}

export function AnswerAnalysis({ chunks, claimCount }: AnswerAnalysisProps) {
  const docIds = [...new Set(chunks.map((c) => c.document_id ?? 0))];
  const scores = chunks.map((c) => c.score);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const confidence = Math.round(avgScore * 100);

  // Cross-document reinforcement: how many claims are supported by 2+ docs
  const claimDocMap = new Map<number, Set<number>>();
  for (const chunk of chunks) {
    const ci = chunk.chunk_index ?? chunk.rank;
    if (!claimDocMap.has(ci)) claimDocMap.set(ci, new Set());
    claimDocMap.get(ci)!.add(chunk.document_id ?? 0);
  }
  const multiDocClaims = [...claimDocMap.values()].filter((s) => s.size > 1).length;
  const reinforcement =
    multiDocClaims === 0
      ? "Weak"
      : multiDocClaims <= Math.ceil(claimCount * 0.4)
        ? "Moderate"
        : "Strong";

  const reinforcementColor =
    reinforcement === "Strong"
      ? "text-ee-confidence"
      : reinforcement === "Moderate"
        ? "text-score-mid"
        : "text-ee-muted";

  const confidenceColor =
    confidence >= 80
      ? "bg-ee-confidence"
      : confidence >= 60
        ? "bg-score-mid"
        : "bg-score-low";

  const metrics = [
    { label: "Documents Used", value: docIds.length.toString() },
    { label: "Total Claims", value: claimCount.toString() },
    {
      label: "Cross-Doc Reinforcement",
      value: reinforcement,
      className: reinforcementColor,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-ee-border bg-ee-surface/40 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ee-muted">
          Answer Analysis
        </span>
      </div>

      <div className="hidden sm:block h-4 w-px bg-ee-border" />

      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[9px] sm:text-[10px] text-ee-muted font-mono">{m.label}:</span>
          <span className={`text-[10px] sm:text-[11px] font-mono font-semibold ${m.className ?? "text-ee-foreground"}`}>
            {m.value}
          </span>
        </div>
      ))}

      <div className="hidden sm:block h-4 w-px bg-ee-border" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] sm:text-[10px] text-ee-muted font-mono">Grounding:</span>
        <div className="w-16 sm:w-20 h-1.5 bg-ee-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${confidenceColor}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-ee-foreground">{confidence}%</span>
      </div>
    </div>
  );
}
