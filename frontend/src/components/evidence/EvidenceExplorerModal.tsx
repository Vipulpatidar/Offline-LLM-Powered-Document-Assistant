import { useState, useMemo, useEffect } from "react";
import { X, PanelRightOpen, PanelRightClose } from "lucide-react";
import type { RetrievedChunk, SourceMapEntry } from "@/types/app";
import { CitationGraph } from "./CitationGraph";
import { SidePanel } from "./SidePanel";
import { AnswerAnalysis } from "./AnswerAnalysis";

interface EvidenceExplorerModalProps {
  sourceMap: Record<string, SourceMapEntry>;
  chunks: RetrievedChunk[];
  query: string;
  onClose: () => void;
}

function useIsSmallScreen(breakpoint = 768) {
  const [small, setSmall] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setSmall(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return small;
}

export function EvidenceExplorerModal({ sourceMap, chunks, query, onClose }: EvidenceExplorerModalProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightedClaim, setHighlightedClaim] = useState<string | null>(null);
  const isSmall = useIsSmallScreen();
  const [panelOpen, setPanelOpen] = useState(!isSmall);

  // Auto-collapse when resizing to small
  useEffect(() => {
    if (isSmall) setPanelOpen(false);
  }, [isSmall]);

  const claimCount = useMemo(() => {
    const claimSet = new Set(chunks.map((c) => c.chunk_index ?? c.rank));
    return claimSet.size;
  }, [chunks]);

  return (
    <div className="fixed inset-0 z-[100] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-ee-bg/95 backdrop-blur-2xl" />

      <div
        className="relative w-full h-full flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-ee-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-ee-surface-raised flex items-center justify-center flex-shrink-0">
              <span className="text-sm">🧠</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ee-foreground">Evidence Explorer</h2>
              <p className="text-[10px] text-ee-muted font-mono truncate max-w-[200px] sm:max-w-md">
                "{query.length > 60 ? query.slice(0, 57) + "…" : query}"
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-ee-muted">
              <span>{chunks.length} chunks</span>
              <span className="w-px h-3 bg-ee-border" />
              <span>{new Set(chunks.map((c) => c.document_id)).size} docs</span>
            </div>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="p-2 hover:bg-ee-surface-raised rounded-lg transition-colors duration-200"
              title={panelOpen ? "Hide panel" : "Show panel"}
            >
              {panelOpen ? (
                <PanelRightClose className="w-4 h-4 text-ee-muted" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-ee-muted" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-ee-surface-raised rounded-lg transition-colors duration-200"
            >
              <X className="w-4 h-4 text-ee-muted" />
            </button>
          </div>
        </div>

        {/* Answer Analysis Bar */}
        <AnswerAnalysis chunks={chunks} claimCount={claimCount} />

        {/* Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Graph */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 p-2 sm:p-4">
              <div className="w-full h-full rounded-xl border border-ee-border bg-ee-surface/30 backdrop-blur-sm overflow-hidden">
                <CitationGraph
                  sourceMap={sourceMap}
                  chunks={chunks}
                  query={query}
                  onSelectNode={(id) => {
                    setSelectedNode(id);
                    if (id?.startsWith("claim-")) setHighlightedClaim(id);
                    else setHighlightedClaim(null);
                    // Auto-open panel when selecting a node on small screens
                    if (isSmall && id) setPanelOpen(true);
                  }}
                  highlightedClaim={highlightedClaim}
                />
              </div>
            </div>
          </div>

          {/* Side Panel - slides in/out */}
          <div
            className={`
              flex-shrink-0 border-l border-ee-border bg-ee-surface/20 backdrop-blur-sm overflow-hidden
              transition-all duration-300 ease-in-out
              ${isSmall
                ? `absolute right-0 top-0 bottom-0 z-10 shadow-elevated ${panelOpen ? "w-[300px]" : "w-0 border-l-0"}`
                : `${panelOpen ? "w-[340px]" : "w-0 border-l-0"}`
              }
            `}
          >
            {panelOpen && (
              <div className={`${isSmall ? "w-[300px]" : "w-[340px]"} h-full`}>
                <SidePanel
                  sourceMap={sourceMap}
                  chunks={chunks}
                  selectedNode={selectedNode}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
