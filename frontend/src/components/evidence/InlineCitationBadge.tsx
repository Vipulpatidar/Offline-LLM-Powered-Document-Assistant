import type { SourceMapEntry } from "@/types/app";

interface InlineCitationBadgeProps {
  refNum: string;
  entry: SourceMapEntry;
  onClick: (refNum: string) => void;
}

export function InlineCitationBadge({ refNum, entry, onClick }: InlineCitationBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(refNum);
      }}
      className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold 
        bg-ee-surface-raised text-ee-foreground border border-ee-border
        rounded-full px-1.5 py-0.5 mx-0.5 align-middle cursor-pointer
        hover:bg-ee-node-claim/20 hover:border-ee-node-claim/40 
        transition-all duration-150"
      title={`Document ${entry.document_id} • Score ${entry.score.toFixed(2)}`}
    >
      <span className="opacity-70">D{entry.document_id}</span>
      <span className="w-px h-2.5 bg-ee-border" />
      <span>{entry.score.toFixed(2)}</span>
    </button>
  );
}
