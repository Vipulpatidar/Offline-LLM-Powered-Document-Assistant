import type { Document, SourceMapEntry } from "@/types/app";

const API_BASE = "http://localhost:8000";

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ document_id: number; status: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", `${API_BASE}/upload`);
    xhr.send(formData);
  });
}

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(`Failed to fetch documents: ${res.status}`);

  const data = await res.json();

  const docs = Array.isArray(data) ? data : data.documents ?? [];

  return docs.map((doc, index) => {
    const parsedId = Number(doc.id ?? doc.document_id);

    return {
      id: Number.isFinite(parsedId) ? parsedId : -(index + 1),
      filename: doc.filename,
      filepath: doc.filepath,
      filetype: doc.filetype,
      filesize: Number(doc.filesize),
      created_at: doc.created_at,
      chunk_count: Number(doc.chunk_count ?? doc.num_chunks ?? 0),
    };
  });
}

export async function deleteDocument(documentId: number): Promise<{
  document_id: number;
  status: string;
  removed_vectors: number;
  file_deleted: boolean;
}> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to delete document ${documentId}: ${res.status}${detail ? ` - ${detail}` : ""}`);
  }

  return res.json();
}

export type ChatStreamResult = {
  sourceMapRef: { current: Record<string, SourceMapEntry> | null };
  stream: AsyncGenerator<string, void, unknown>;
};

export async function chatStreamWithSources(
  query: string,
  topK: number = 5,
  documentIds?: number[]
): Promise<ChatStreamResult> {
  const body: Record<string, unknown> = { query, top_k: topK };
  if (documentIds && documentIds.length > 0) body.document_ids = documentIds;

  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const sourceMapRef: { current: Record<string, SourceMapEntry> | null } = { current: null };

  const parseLine = (line: string): { token?: string; map?: Record<string, SourceMapEntry> } => {
    const trimmed = line.trim();
    if (!trimmed) return {};

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?._type === "source_map" && parsed.data) {
        return { map: parsed.data as Record<string, SourceMapEntry> };
      }
      if (parsed?._type === "token" && typeof parsed.data === "string") {
        return { token: parsed.data };
      }
      return {};
    } catch {
      return { token: line };
    }
  };

  async function* tokenStream(): AsyncGenerator<string, void, unknown> {
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const { token, map } = parseLine(line);
        if (map) sourceMapRef.current = map;
        if (token) yield token;
      }
    }

    if (buffer.trim()) {
      const { token, map } = parseLine(buffer);
      if (map) sourceMapRef.current = map;
      if (token) yield token;
    }
  }

  return { sourceMapRef, stream: tokenStream() };
}
