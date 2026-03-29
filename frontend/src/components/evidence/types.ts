import type { RetrievedChunk, SourceMapEntry } from "@/types/app";

export interface EvidenceData {
  sourceMap: Record<string, SourceMapEntry>;
  chunks: RetrievedChunk[];
  query: string;
}

export interface GraphNode {
  id: string;
  type: "query" | "claim" | "chunk" | "document";
  label: string;
  x: number;
  y: number;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  label?: string;
}

export interface ClaimEntry {
  id: string;
  text: string;
  supportingDocs: number[];
  chunkIds: string[];
  scores: number[];
}
