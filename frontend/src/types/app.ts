export type AppMode = "general" | "documents";

export type ProcessingStep = {
  label: string;
  status: "pending" | "running" | "completed";
};

export type UploadedFile = {
  id: string;
  name: string;
  size: string;
  status: "processing" | "ready" | "error";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  sourceMap?: Record<string, SourceMapEntry> | null;
};

export type RetrievedChunk = {
  id: string;
  text: string;
  score: number;
  source: string;
  rank: number;
  document_id?: number;
  chunk_index?: number;
};

export type Document = {
  id: number;
  filename: string;
  filepath: string;
  filetype: string;
  filesize: number;
  created_at: string;
  chunk_count: number;
};

export type SourceMapEntry = {
  document_id: number;
  chunk_index: number;
  score: number;
  text?: string;
};

export type LogEntry = {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "warn";
};
