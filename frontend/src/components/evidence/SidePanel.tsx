import { FileText, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import type { RetrievedChunk, SourceMapEntry } from "@/types/app";

interface SidePanelProps {
  sourceMap: Record<string, SourceMapEntry>;
  chunks: RetrievedChunk[];
  selectedNode: string | null;
}

interface ClaimInfo {
  index: number;
  avgScore: number;
  docs: number[];
  chunkIds: string[];
  snippet: string;
  strength: "strong" | "moderate" | "weak";
}

function getStrength(score: number): "strong" | "moderate" | "weak" {
  if (score >= 0.8) return "strong";
  if (score >= 0.6) return "moderate";
  return "weak";
}

const strengthConfig = {
  strong: {
    icon: CheckCircle2,
    label: "Strongly supported",
    className: "text-ee-confidence",
    bgClass: "bg-ee-confidence/10",
  },
  moderate: {
    icon: AlertTriangle,
    label: "Moderately supported",
    className: "text-score-mid",
    bgClass: "bg-score-mid/10",
  },
  weak: {
    icon: AlertCircle,
    label: "Weakly supported",
    className: "text-score-low",
    bgClass: "bg-score-low/10",
  },
};

export function SidePanel({ sourceMap, chunks, selectedNode }: SidePanelProps) {
  if (!sourceMap || Object.keys(sourceMap).length === 0) return null;

  // Document contributions
  const totalScore = chunks.reduce((s, c) => s + c.score, 0);
  const docMap = new Map<number, { name: string; score: number; count: number }>();
  for (const chunk of chunks) {
    const did = chunk.document_id ?? 0;
    if (!docMap.has(did)) docMap.set(did, { name: chunk.source, score: 0, count: 0 });
    const d = docMap.get(did)!;
    d.score += chunk.score;
    d.count++;
  }
  const docs = [...docMap.entries()]
    .map(([id, d]) => ({
      id,
      name: d.name,
      percentage: Math.round((d.score / totalScore) * 100),
      avgScore: d.score / d.count,
      chunkCount: d.count,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Claims
  const claimMap = new Map<number, { chunks: RetrievedChunk[]; docs: Set<number> }>();
  for (const chunk of chunks) {
    const ci = chunk.chunk_index ?? chunk.rank;
    if (!claimMap.has(ci)) claimMap.set(ci, { chunks: [], docs: new Set() });
    const entry = claimMap.get(ci)!;
    entry.chunks.push(chunk);
    entry.docs.add(chunk.document_id ?? 0);
  }

  const claims: ClaimInfo[] = [...claimMap.entries()]
    .map(([ci, entry]) => {
      const avgScore = entry.chunks.reduce((s, c) => s + c.score, 0) / entry.chunks.length;
      return {
        index: ci,
        avgScore,
        docs: [...entry.docs],
        chunkIds: entry.chunks.map((c) => c.id),
        snippet: entry.chunks[0]?.text?.slice(0, 120) + "…" || "",
        strength: getStrength(avgScore),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const selectedDocId = selectedNode?.startsWith("doc-")
    ? parseInt(selectedNode.replace("doc-", ""), 10)
    : null;
  const selectedClaimId = selectedNode?.startsWith("claim-")
    ? parseInt(selectedNode.replace("claim-", ""), 10)
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Document Contributions */}
      <div className="p-4 border-b border-ee-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ee-muted mb-3">
          Document Contributions
        </h3>
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`rounded-lg p-3 transition-all duration-200 ${
                selectedDocId === doc.id
                  ? "bg-ee-node-document/10 ring-1 ring-ee-node-document/30"
                  : "bg-ee-surface"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3 h-3 text-ee-muted flex-shrink-0" />
                  <span className="text-[10px] font-mono text-ee-foreground truncate">
                    {doc.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-ee-foreground ml-2">
                  {doc.percentage}%
                </span>
              </div>
              <div className="h-1.5 bg-ee-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-ee-node-document rounded-full transition-all duration-500"
                  style={{ width: `${doc.percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono text-ee-muted">
                <span>{doc.chunkCount} chunks</span>
                <span>avg {doc.avgScore.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Claim Breakdown */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ee-muted mb-3">
          Claim Breakdown
        </h3>
        <div className="space-y-2">
          {claims.map((claim) => {
            const cfg = strengthConfig[claim.strength];
            const Icon = cfg.icon;
            const isSelected = selectedClaimId === claim.index;

            return (
              <div
                key={claim.index}
                className={`rounded-lg p-3 border transition-all duration-200 ${
                  isSelected
                    ? "bg-ee-node-claim/10 border-ee-node-claim/30"
                    : claim.strength === "weak"
                      ? "bg-ee-surface border-score-low/20"
                      : "bg-ee-surface border-ee-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-ee-node-claim">
                      Claim {claim.index}
                    </span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bgClass}`}>
                      <Icon className={`w-2.5 h-2.5 ${cfg.className}`} />
                      <span className={`text-[8px] font-mono ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-ee-foreground">
                    {claim.avgScore.toFixed(3)}
                  </span>
                </div>

                <p className="text-[9px] text-ee-foreground/60 leading-relaxed line-clamp-2 mb-2">
                  {claim.snippet}
                </p>

                <div className="flex items-center gap-3 text-[8px] font-mono text-ee-muted">
                  <span>
                    Docs: {claim.docs.map((d) => `D${d}`).join(", ")}
                  </span>
                  <span className="w-px h-2.5 bg-ee-border" />
                  <span>{claim.chunkIds.length} chunks</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
