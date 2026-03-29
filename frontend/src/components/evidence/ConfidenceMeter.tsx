import { useState } from "react";
import type { SourceMapEntry } from "@/types/app";

interface ConfidenceMeterProps {
  sourceMap: Record<string, SourceMapEntry>;
}

export function ConfidenceMeter({ sourceMap }: ConfidenceMeterProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!sourceMap || Object.keys(sourceMap).length === 0) return null;

  const scores = Object.values(sourceMap).map((e) => e.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const confidence = Math.round(avgScore * 100);

  const barColor =
    confidence >= 80
      ? "bg-status-completed"
      : confidence >= 60
        ? "bg-score-mid"
        : "bg-score-low";

  return (
    <div className="mt-2 relative">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Grounding</span>
        <div className="flex-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-[10px] font-mono font-semibold text-foreground min-w-[36px] text-right cursor-help"
        >
          {confidence}%
        </button>
      </div>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface-overlay border border-border rounded-lg shadow-elevated p-3 w-56 animate-fade-up">
          <p className="text-[10px] font-medium text-foreground mb-1.5">Grounding Confidence</p>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Calculated as the mean similarity score across all {scores.length} retrieved chunks. 
            Higher scores indicate stronger semantic alignment between the query and source material.
          </p>
          <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-1 text-[9px]">
            <span className="text-muted-foreground">Min score:</span>
            <span className="font-mono text-foreground">{Math.min(...scores).toFixed(3)}</span>
            <span className="text-muted-foreground">Max score:</span>
            <span className="font-mono text-foreground">{Math.max(...scores).toFixed(3)}</span>
            <span className="text-muted-foreground">Avg score:</span>
            <span className="font-mono text-foreground">{avgScore.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
