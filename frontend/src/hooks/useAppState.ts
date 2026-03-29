import { useState, useCallback, useRef, useEffect } from "react";
import type { AppMode, ProcessingStep, UploadedFile, ChatMessage, RetrievedChunk, LogEntry, Document, SourceMapEntry } from "@/types/app";
import { uploadFile, chatStreamWithSources, fetchDocuments, deleteDocument } from "@/lib/api";

const INITIAL_STEPS: ProcessingStep[] = [
  { label: "Parsing document", status: "pending" },
  { label: "Running OCR", status: "pending" },
  { label: "Generating embeddings", status: "pending" },
  { label: "Indexing vectors", status: "pending" },
  { label: "Ready", status: "pending" },
];

export function useAppState() {
  const [mode, setMode] = useState<AppMode>("documents");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Documents from backend
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [sourceMap, setSourceMap] = useState<Record<string, SourceMapEntry> | null>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { id: Date.now().toString(), timestamp: new Date(), message, type },
    ]);
  }, []);

  // Fetch documents on mount & after upload
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
      addLog(`loaded ${docs.length} documents from backend`, "success");
    } catch (err: any) {
      addLog(`failed to load documents: ${err.message}`, "warn");
    }
  }, [addLog]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadFiles = useCallback(async (fileList: FileList) => {
    for (const file of Array.from(fileList)) {
      const fileId = Date.now().toString() + file.name;
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`,
        status: "processing",
      };

      setFiles((prev) => [...prev, newFile]);
      setIsProcessing(true);
      addLog(`uploading: ${file.name}`, "info");

      setProcessingSteps([
        { label: "Uploading file", status: "running" },
        { label: "Parsing document", status: "pending" },
        { label: "Generating embeddings", status: "pending" },
        { label: "Indexing vectors", status: "pending" },
        { label: "Ready", status: "pending" },
      ]);

      try {
        const result = await uploadFile(file);
        addLog(`uploaded: ${file.name} → doc_id=${result.document_id}`, "success");

        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "ready" as const } : f))
        );

        setProcessingSteps([
          { label: "Uploading file", status: "completed" },
          { label: "Parsing document", status: "completed" },
          { label: "Generating embeddings", status: "completed" },
          { label: "Indexing vectors", status: "completed" },
          { label: "Ready", status: "completed" },
        ]);

        // Reload documents list after successful upload
        await loadDocuments();
      } catch (err: any) {
        addLog(`upload failed: ${file.name} — ${err.message}`, "warn");
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "error" as const } : f))
        );
        setProcessingSteps([
          { label: "Uploading file", status: "completed" },
          { label: "Error occurred", status: "pending" },
          { label: "Generating embeddings", status: "pending" },
          { label: "Indexing vectors", status: "pending" },
          { label: "Ready", status: "pending" },
        ]);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [addLog, loadDocuments]);

  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const deleteBackendDocument = useCallback(async (documentId: number) => {
    await deleteDocument(documentId);

    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    setSelectedDocIds((prev) => prev.filter((id) => id !== documentId));
    addLog(`deleted document id=${documentId}`, "success");
  }, [addLog]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isGenerating) return;

    const query = inputValue.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsGenerating(true);
    setSourceMap(null);
    setChunks([]);
    addLog(`query received: ${query.slice(0, 60)}${selectedDocIds.length ? ` [doc_ids=${selectedDocIds.join(",")}]` : " [general]"}`, "info");

    const responseId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: responseId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const { sourceMapRef, stream } = await chatStreamWithSources(query, 5, selectedDocIds);

      const syncSources = (sm: Record<string, SourceMapEntry>) => {
        setSourceMap(sm);
        setChunks(
          Object.entries(sm)
            .map(([key, entry]) => {
              const doc = documents.find((d) => d.id === entry.document_id);
              return {
                id: key,
                text: entry.text || "No chunk text returned by API.",
                score: entry.score,
                source: doc?.filename || `Document #${entry.document_id}`,
                rank: Number.parseInt(key, 10),
                document_id: entry.document_id,
                chunk_index: entry.chunk_index,
              };
            })
            .sort((a, b) => a.rank - b.rank)
        );
      };

      let fullContent = "";
      let mapApplied = false;
      for await (const chunk of stream) {
        if (sourceMapRef.current && !mapApplied) {
          syncSources(sourceMapRef.current);
          mapApplied = true;
        }
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === responseId ? { ...m, content: fullContent, sourceMap: sourceMapRef.current } : m
          )
        );
      }

      if (sourceMapRef.current) {
        syncSources(sourceMapRef.current);
        addLog(`received source map with ${Object.keys(sourceMapRef.current).length} references`, "info");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === responseId ? { ...m, content: fullContent, isStreaming: false, sourceMap: sourceMapRef.current } : m
        )
      );
      addLog(`response complete — ${fullContent.length} chars`, "success");
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === responseId
            ? { ...m, content: `⚠ Error: ${err.message}`, isStreaming: false }
            : m
        )
      );
      addLog(`stream error: ${err.message}`, "warn");
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, isGenerating, addLog, selectedDocIds, documents]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setChunks([]);
    setSourceMap(null);
  }, []);

  return {
    mode, setMode,
    processingSteps,
    files, deleteFile, handleUploadFiles,
    messages, sendMessage, clearChat,
    chunks, logs, sourceMap,
    isProcessing, isGenerating,
    inputValue, setInputValue,
    documents, selectedDocIds, setSelectedDocIds,
    deleteBackendDocument,
  };
}
