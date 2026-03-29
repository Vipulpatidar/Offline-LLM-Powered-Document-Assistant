import { useState, useRef, useEffect, useCallback } from "react";
import type { RetrievedChunk, SourceMapEntry } from "@/types/app";

interface CitationGraphProps {
  sourceMap: Record<string, SourceMapEntry>;
  chunks: RetrievedChunk[];
  query: string;
  onSelectNode: (nodeId: string | null) => void;
  highlightedClaim: string | null;
}

interface GNode {
  id: string;
  type: "query" | "claim" | "document";
  label: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  score?: number;
  percentage?: number;
  chunkCount?: number;
}

interface GEdge {
  from: string;
  to: string;
  weight: number;
  label?: string;
  isCoCitation?: boolean;
}

// Deterministic layered layout: Query → Claims → Documents
function buildGraph(
  chunks: RetrievedChunk[],
  w: number,
  h: number
): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  const totalScore = chunks.reduce((s, c) => s + c.score, 0);

  // Query node - top center
  const qx = w / 2;
  const qy = 70;
  nodes.push({ id: "query", type: "query", label: "Query", x: qx, y: qy, targetX: qx, targetY: qy });

  // Build claims from chunk_index groups
  const claimMap = new Map<number, { chunks: RetrievedChunk[]; docs: Set<number> }>();
  for (const chunk of chunks) {
    const ci = chunk.chunk_index ?? chunk.rank;
    if (!claimMap.has(ci)) claimMap.set(ci, { chunks: [], docs: new Set() });
    const entry = claimMap.get(ci)!;
    entry.chunks.push(chunk);
    entry.docs.add(chunk.document_id ?? 0);
  }

  const claimKeys = [...claimMap.keys()].sort((a, b) => a - b);
  const claimY = h * 0.38;
  const claimSpacing = Math.min(160, (w - 160) / Math.max(claimKeys.length, 1));
  const claimStartX = qx - ((claimKeys.length - 1) * claimSpacing) / 2;

  claimKeys.forEach((ci, i) => {
    const entry = claimMap.get(ci)!;
    const avgScore = entry.chunks.reduce((s, c) => s + c.score, 0) / entry.chunks.length;
    const cx = claimStartX + i * claimSpacing;
    nodes.push({
      id: `claim-${ci}`,
      type: "claim",
      label: `Claim ${ci}`,
      x: cx,
      y: claimY,
      targetX: cx,
      targetY: claimY,
      score: avgScore,
      chunkCount: entry.chunks.length,
    });
    edges.push({ from: "query", to: `claim-${ci}`, weight: avgScore });
  });

  // Documents - bottom layer
  const docMap = new Map<number, { name: string; totalScore: number; chunkCount: number }>();
  for (const chunk of chunks) {
    const did = chunk.document_id ?? 0;
    if (!docMap.has(did)) docMap.set(did, { name: chunk.source, totalScore: 0, chunkCount: 0 });
    const d = docMap.get(did)!;
    d.totalScore += chunk.score;
    d.chunkCount++;
  }

  const docKeys = [...docMap.keys()];
  const docY = h - 100;
  const docSpacing = Math.min(220, (w - 200) / Math.max(docKeys.length, 1));
  const docStartX = qx - ((docKeys.length - 1) * docSpacing) / 2;

  docKeys.forEach((did, i) => {
    const d = docMap.get(did)!;
    const shortName = d.name.length > 20 ? d.name.slice(0, 17) + "…" : d.name;
    const pct = Math.round((d.totalScore / totalScore) * 100);
    const dx = docStartX + i * docSpacing;
    nodes.push({
      id: `doc-${did}`,
      type: "document",
      label: shortName,
      x: dx,
      y: docY,
      targetX: dx,
      targetY: docY,
      score: d.totalScore / d.chunkCount,
      percentage: pct,
      chunkCount: d.chunkCount,
    });
  });

  // Claim → Document edges
  for (const [ci, entry] of claimMap) {
    for (const did of entry.docs) {
      const relChunks = entry.chunks.filter((c) => (c.document_id ?? 0) === did);
      const w2 = relChunks.reduce((s, c) => s + c.score, 0) / relChunks.length;
      edges.push({ from: `claim-${ci}`, to: `doc-${did}`, weight: w2 });
    }
  }

  // Co-citation edges between documents sharing claims
  const docClaimSets = new Map<number, Set<number>>();
  for (const [ci, entry] of claimMap) {
    for (const did of entry.docs) {
      if (!docClaimSets.has(did)) docClaimSets.set(did, new Set());
      docClaimSets.get(did)!.add(ci);
    }
  }

  for (let i = 0; i < docKeys.length; i++) {
    for (let j = i + 1; j < docKeys.length; j++) {
      const s1 = docClaimSets.get(docKeys[i]);
      const s2 = docClaimSets.get(docKeys[j]);
      if (!s1 || !s2) continue;
      const shared = [...s1].filter((c) => s2.has(c));
      if (shared.length > 0) {
        edges.push({
          from: `doc-${docKeys[i]}`,
          to: `doc-${docKeys[j]}`,
          weight: shared.length * 0.3,
          label: `${shared.length} shared`,
          isCoCitation: true,
        });
      }
    }
  }

  return { nodes, edges };
}

const NODE_COLORS: Record<string, string> = {
  query: "hsl(28, 85%, 55%)",
  claim: "hsl(215, 75%, 55%)",
  document: "hsl(270, 55%, 55%)",
};

const NODE_RADII: Record<string, number> = {
  query: 26,
  claim: 14,
  document: 28,
};

export function CitationGraph({ sourceMap, chunks, query, onSelectNode, highlightedClaim }: CitationGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 600, h: 500 });
  const nodesRef = useRef<GNode[]>([]);
  const edgesRef = useRef<GEdge[]>([]);
  const animProgress = useRef(0);
  const animFrameRef = useRef<number>(0);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Rebuild graph on data/size change
  useEffect(() => {
    const { nodes, edges } = buildGraph(chunks, dims.w, dims.h);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    animProgress.current = 0;
  }, [chunks, dims]);

  // Find connected nodes for path highlighting
  const getConnected = useCallback(
    (nodeId: string | null): Set<string> => {
      if (!nodeId) return new Set();
      const connected = new Set<string>([nodeId]);
      for (const e of edgesRef.current) {
        if (e.from === nodeId) connected.add(e.to);
        if (e.to === nodeId) connected.add(e.from);
      }
      // Transitive: if hovering query, show claims; if claim, show docs
      const secondLevel = new Set<string>();
      for (const id of connected) {
        for (const e of edgesRef.current) {
          if (e.from === id) secondLevel.add(e.to);
          if (e.to === id) secondLevel.add(e.from);
        }
      }
      for (const id of secondLevel) connected.add(id);
      return connected;
    },
    []
  );

  // Animation loop
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      animProgress.current = Math.min(1, animProgress.current + 0.025);
      const t = easeOutCubic(animProgress.current);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = dims.w * dpr;
      canvas.height = dims.h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, dims.w, dims.h);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const activeNode = hoveredNode ?? highlightedClaim;
      const connected = getConnected(activeNode);
      const hasHighlight = connected.size > 0;

      // Draw edges
      for (const edge of edges) {
        const from = nodes.find((n) => n.id === edge.from);
        const to = nodes.find((n) => n.id === edge.to);
        if (!from || !to) continue;

        const isActive =
          !hasHighlight || (connected.has(edge.from) && connected.has(edge.to));
        const alpha = isActive ? 0.35 : 0.06;

        ctx.save();
        ctx.beginPath();

        if (edge.isCoCitation) {
          // Curved co-citation edge
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 + 40;
          ctx.moveTo(from.x, from.y * t + from.targetY * (1 - t));
          ctx.quadraticCurveTo(midX, midY * t, to.x, to.y * t + to.targetY * (1 - t));
          ctx.strokeStyle = `hsla(270, 55%, 55%, ${alpha})`;
          ctx.lineWidth = Math.max(1.5, edge.weight * 4);
          ctx.setLineDash([4, 4]);

          // Animated pulse offset
          const dashOffset = (Date.now() / 40) % 16;
          ctx.lineDashOffset = -dashOffset;
        } else {
          const fromY = from.y * t;
          const toY = to.y * t;
          ctx.moveTo(from.x, fromY);
          ctx.lineTo(to.x, toY);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = Math.max(0.5, edge.weight * 2.5);
        }

        ctx.stroke();

        // Co-citation label
        if (edge.isCoCitation && edge.label && isActive && t > 0.8) {
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 + 28;
          ctx.font = "9px 'IBM Plex Mono'";
          ctx.fillStyle = `hsla(270, 55%, 70%, ${(t - 0.8) * 5 * 0.7})`;
          ctx.textAlign = "center";
          ctx.fillText(edge.label, midX, midY);
        }

        ctx.restore();
      }

      // Draw nodes
      for (const node of nodes) {
        const r = NODE_RADII[node.type] ?? 14;
        const color = NODE_COLORS[node.type] ?? "#888";
        const isHovered = hoveredNode === node.id;
        const isConnected = connected.has(node.id);
        const dimmed = hasHighlight && !isConnected;
        const nodeAlpha = dimmed ? 0.25 : 1;
        const ny = node.y * t;

        ctx.save();
        ctx.globalAlpha = nodeAlpha * t;

        // Glow for hovered/highlighted
        if (isHovered || (highlightedClaim === node.id)) {
          const grad = ctx.createRadialGradient(node.x, ny, r, node.x, ny, r + 20);
          grad.addColorStop(0, color.replace(")", ", 0.25)").replace("hsl(", "hsla("));
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(node.x - r - 20, ny - r - 20, (r + 20) * 2, (r + 20) * 2);
        }

        // Document percentage ring
        if (node.type === "document" && node.percentage !== undefined) {
          const ringR = r + 4;
          const pct = node.percentage / 100;
          // Track
          ctx.beginPath();
          ctx.arc(node.x, ny, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, 0.06)`;
          ctx.lineWidth = 3;
          ctx.stroke();
          // Progress
          ctx.beginPath();
          ctx.arc(node.x, ny, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct * t);
          ctx.strokeStyle = color.replace(")", ", 0.7)").replace("hsl(", "hsla(");
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, ny, isHovered ? r + 2 : r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          node.x - r * 0.3,
          ny - r * 0.3,
          0,
          node.x,
          ny,
          r
        );
        grad.addColorStop(0, color.replace("55%)", "70%)"));
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.fill();

        // Label
        const labelY = ny + r + 12;
        ctx.textAlign = "center";

        if (node.type === "document") {
          ctx.font = "500 10px 'IBM Plex Mono'";
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * nodeAlpha})`;
          ctx.fillText(node.label, node.x, labelY);
          if (node.percentage !== undefined) {
            ctx.font = "bold 10px 'IBM Plex Mono'";
            ctx.fillStyle = color.replace(")", ", 0.9)").replace("hsl(", "hsla(");
            ctx.fillText(`${node.percentage}%`, node.x, labelY + 14);
          }
        } else if (node.type === "claim") {
          ctx.font = "500 10px 'IBM Plex Mono'";
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * nodeAlpha})`;
          ctx.fillText(node.label, node.x, labelY);
          if (isHovered && node.score !== undefined) {
            ctx.font = "9px 'IBM Plex Mono'";
            ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
            ctx.fillText(`score: ${node.score.toFixed(3)}`, node.x, labelY + 13);
          }
        } else if (node.type === "query") {
          ctx.font = "600 11px Inter";
          ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
          ctx.fillText("Query", node.x, labelY);
          // Pulse effect
          if (animProgress.current < 1) {
            const pulseR = r + 15 * (1 - t);
            ctx.beginPath();
            ctx.arc(node.x, ny, pulseR, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(28, 85%, 55%, ${0.3 * (1 - t)})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        // Hover tooltip for documents
        if (isHovered && node.type === "document") {
          const tooltipY = ny - r - 30;
          ctx.font = "9px 'IBM Plex Mono'";
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.fillText(
            `${node.chunkCount} chunks • avg ${(node.score ?? 0).toFixed(3)}`,
            node.x,
            tooltipY
          );
        }

        ctx.restore();
      }

      if (animProgress.current < 1) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    // Kick off animation loop continuously for co-citation pulse
    const loop = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dims, hoveredNode, highlightedClaim, getConnected]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const t = easeOutCubic(Math.min(1, animProgress.current));
    let found: string | null = null;
    for (const node of nodesRef.current) {
      const r = NODE_RADII[node.type] ?? 14;
      const ny = node.y * t;
      const dist = Math.sqrt((mx - node.x) ** 2 + (my - ny) ** 2);
      if (dist <= r + 6) {
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
    if (canvas) canvas.style.cursor = found ? "pointer" : "crosshair";
  };

  const handleClick = () => {
    if (hoveredNode) {
      onSelectNode(hoveredNode);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h }}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-5 text-[9px] font-mono text-ee-muted">
        {[
          { color: NODE_COLORS.query, label: "Query" },
          { color: NODE_COLORS.claim, label: "Claims" },
          { color: NODE_COLORS.document, label: "Documents" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
