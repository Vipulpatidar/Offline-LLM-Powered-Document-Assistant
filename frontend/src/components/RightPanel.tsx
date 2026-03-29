import { useEffect, useRef, useState } from "react";
import { FileText, Maximize2, X, Hash, Terminal } from "lucide-react";
import type { RetrievedChunk, LogEntry } from "@/types/app";

type RightTab = "sources" | "logs";

interface RightPanelProps {
  chunks: RetrievedChunk[];
  logs: LogEntry[];
  highlightedCitation: string | null;
}

function scoreColor(score: number) {
  if (score >= 0.9) return "text-score-high";
  if (score >= 0.8) return "text-score-mid";
  return "text-score-low";
}

function scoreBg(score: number) {
  if (score >= 0.9) return "bg-score-high/10";
  if (score >= 0.8) return "bg-score-mid/10";
  return "bg-score-low/10";
}

function formatLogTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ChunkModal({ chunk, onClose }: { chunk: RetrievedChunk; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-overlay border border-border rounded-xl shadow-elevated max-w-lg w-full mx-4 max-h-[70vh] overflow-auto animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-surface-sunken flex items-center justify-center">
              <Hash className="w-3 h-3 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Chunk #{chunk.rank}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{chunk.source}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-foreground leading-relaxed">{chunk.text}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className={`text-xs font-mono font-medium px-2 py-1 rounded-md ${scoreBg(chunk.score)} ${scoreColor(chunk.score)}`}>
              {chunk.score.toFixed(4)}
            </span>
            <span className="text-[10px] text-muted-foreground">similarity score</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({ chunks, logs, highlightedCitation }: RightPanelProps) {
  const [expandedChunk, setExpandedChunk] = useState<RetrievedChunk | null>(null);
  const [activeTab, setActiveTab] = useState<RightTab>("sources");
  const citationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const tabs: { key: RightTab; label: string; count?: number }[] = [
    { key: "sources", label: "Sources", count: chunks.length },
    { key: "logs", label: "Logs", count: logs.length },
  ];

  useEffect(() => {
    if (!highlightedCitation) return;
    setActiveTab("sources");
    const target = citationRefs.current[highlightedCitation];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const chunk = chunks.find(
        (item) => String(item.rank) === highlightedCitation
      );
      if (chunk) setExpandedChunk(chunk);
    }
  }, [highlightedCitation, chunks]);

  return (
    <aside className="w-[300px] flex-shrink-0 bg-surface border-l border-border flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">System Insight</h2>
        <p className="text-[10px] text-muted-foreground">Retrieval & runtime diagnostics</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 pb-0">
        <div className="flex gap-0.5 border-b border-border">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`text-[11px] font-medium px-3 py-2 transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? "bg-primary/10 text-foreground" : "bg-surface-sunken text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "sources" && (
          <div className="p-4 space-y-2.5">
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                ref={(node) => {
                  citationRefs.current[String(chunk.rank)] = node;
                }}
                className="chunk-card group"
                onClick={() => setExpandedChunk(chunk)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-mono">#{chunk.rank}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${scoreBg(chunk.score)} ${scoreColor(chunk.score)}`}>
                    {chunk.score.toFixed(2)}
                  </span>
                </div>
                <p className="text-[12px] text-foreground leading-relaxed line-clamp-3 mb-2">{chunk.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate font-mono">{chunk.source}</span>
                  </div>
                  <Maximize2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="p-4">
            <div className="rounded-lg bg-log-bg p-3 space-y-1 font-mono overflow-auto max-h-[calc(100vh-180px)]">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2.5 py-0.5">
                  <span className="log-timestamp flex-shrink-0">{formatLogTime(log.timestamp)}</span>
                  <span className={log.type === "success" ? "log-text" : "log-muted"}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-muted-foreground/10">
                <span className="w-1.5 h-1.5 rounded-full bg-status-completed" />
                <span className="log-text text-[10px]">ready</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {expandedChunk && (
        <ChunkModal chunk={expandedChunk} onClose={() => setExpandedChunk(null)} />
      )}
    </aside>
  );
}
