import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { RetrievedChunk, SourceMapEntry } from "@/types/app";

interface SourceSummaryProps {
  sourceMap: Record<string, SourceMapEntry>;
  chunks: RetrievedChunk[];
}

interface DocGroup {
  documentId: number;
  docName: string;
  avgScore: number;
  chunks: RetrievedChunk[];
}

export function SourceSummary({ sourceMap, chunks }: SourceSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

  if (!sourceMap || Object.keys(sourceMap).length === 0) return null;

  // Group chunks by document
  const docGroups: DocGroup[] = [];
  const docMap = new Map<number, DocGroup>();

  for (const chunk of chunks) {
    const docId = chunk.document_id ?? 0;
    if (!docMap.has(docId)) {
      const group: DocGroup = {
        documentId: docId,
        docName: chunk.source,
        avgScore: 0,
        chunks: [],
      };
      docMap.set(docId, group);
      docGroups.push(group);
    }
    docMap.get(docId)!.chunks.push(chunk);
  }

  for (const group of docGroups) {
    group.avgScore = group.chunks.reduce((sum, c) => sum + c.score, 0) / group.chunks.length;
  }

  docGroups.sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{Object.keys(sourceMap).length} sources referenced</span>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-lg border border-border overflow-hidden text-[11px]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_60px] gap-2 px-3 py-2 bg-surface-sunken text-muted-foreground font-medium border-b border-border">
            <span>Document</span>
            <span className="text-right">Score</span>
            <span className="text-right">Chunks</span>
          </div>

          {/* Rows */}
          {docGroups.map((group) => (
            <div key={group.documentId}>
              <button
                onClick={() => setExpandedDoc(expandedDoc === group.documentId ? null : group.documentId)}
                className="w-full grid grid-cols-[1fr_80px_60px] gap-2 px-3 py-2 hover:bg-accent/50 transition-colors items-center"
              >
                <div className="flex items-center gap-1.5 text-left">
                  <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground truncate font-mono text-[10px]">{group.docName}</span>
                </div>
                <span className="text-right font-mono font-semibold text-foreground">{group.avgScore.toFixed(3)}</span>
                <span className="text-right font-mono text-muted-foreground">{group.chunks.length}</span>
              </button>

              {expandedDoc === group.documentId && (
                <div className="border-t border-border bg-surface-sunken/50">
                  {group.chunks.map((chunk) => (
                    <div key={chunk.id} className="px-4 py-2.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono text-muted-foreground">chunk #{chunk.chunk_index ?? chunk.rank}</span>
                        <span className="text-[9px] font-mono font-semibold text-foreground">{chunk.score.toFixed(4)}</span>
                      </div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-3">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
