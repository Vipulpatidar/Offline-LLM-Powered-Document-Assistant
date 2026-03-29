import { useState } from "react";
import { toast } from "sonner";
import { Brain, Upload, FileText, Trash2, Cpu, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppMode, ProcessingStep, UploadedFile, Document } from "@/types/app";

type SidebarTab = "documents" | "status" | "model";

interface LeftSidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  processingSteps: ProcessingStep[];
  files: UploadedFile[];
  onDeleteFile: (id: string) => void;
  onUploadFiles: (files: FileList) => void;
  isProcessing: boolean;
  documents: Document[];
  selectedDocIds: number[];
  onToggleDoc: (id: number, checked: boolean) => void;
  onDeleteDocument: (id: number) => Promise<void>;
}

function StatusIcon({ status }: { status: ProcessingStep["status"] }) {
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-status-completed" />;
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-status-running animate-spin" />;
  return <div className="w-3.5 h-3.5 rounded-full border-2 border-border" />;
}

function FileBadge({ status }: { status: UploadedFile["status"] }) {
  const cls = status === "ready" ? "status-badge-ready" : status === "processing" ? "status-badge-processing" : "status-badge-error";
  const icon = status === "ready" ? <CheckCircle2 className="w-2.5 h-2.5" /> : status === "processing" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <AlertCircle className="w-2.5 h-2.5" />;
  return (
    <span className={`status-badge ${cls}`}>
      {icon}
      {status}
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function LeftSidebar({ mode, onModeChange, processingSteps, files, onDeleteFile, onUploadFiles, isProcessing, documents, selectedDocIds, onToggleDoc, onDeleteDocument }: LeftSidebarProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("documents");
  const [deletingDocIds, setDeletingDocIds] = useState<number[]>([]);

  const handleDeleteDocument = async (docId: number, filename: string) => {
    setDeletingDocIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]));

    try {
      await onDeleteDocument(docId);
      toast.success(`Deleted ${filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete ${filename}: ${message}`);
    } finally {
      setDeletingDocIds((prev) => prev.filter((id) => id !== docId));
    }
  };

  return (
    <aside className="w-[280px] flex-shrink-0 bg-surface border-r border-border flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">Local AI Knowledge</h1>
            <p className="text-[10px] text-muted-foreground font-mono">v0.1.0</p>
          </div>
        </div>
      </div>

      {/* Sidebar Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-0.5 border-b border-border">
          {(["documents", "status", "model"] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`text-[11px] font-medium px-3 py-2 transition-colors border-b-2 -mb-px capitalize ${
                sidebarTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "documents" ? "Files" : tab === "status" ? "Status" : "Model"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {sidebarTab === "documents" && (
          <div className="px-4 py-2 space-y-3">
            {/* Upload */}
            <label
              className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-muted-foreground/40 transition-all duration-200 cursor-pointer block group"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files.length) onUploadFiles(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.md,.docx"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) onUploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-2.5 group-hover:bg-accent transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-xs font-medium text-foreground mb-0.5">Drop files here</p>
              <p className="text-[10px] text-muted-foreground">or <span className="text-foreground font-medium cursor-pointer hover:underline">browse</span></p>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">PDF · TXT · MD · DOCX</p>
            </label>

            {/* Local upload progress */}
            {files.length > 0 && (
              <div>
                <p className="panel-title">Uploading ({files.filter(f => f.status === "processing").length})</p>
                <div className="space-y-1">
                  {files.filter(f => f.status === "processing").map((file) => (
                    <div key={file.id} className="file-item">
                      <div className="w-8 h-8 rounded-md bg-surface-sunken flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        <FileBadge status={file.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Backend Documents with checkboxes */}
            <div>
              <p className="panel-title">Documents ({documents.length})</p>
              {selectedDocIds.length > 0 && (
                <p className="text-[10px] text-status-running mb-2">
                  Querying {selectedDocIds.length} selected document(s) — uncheck all for general chat
                </p>
              )}
              {selectedDocIds.length === 0 && (
                <p className="text-[10px] text-muted-foreground mb-2">
                  No document selected — general chat mode
                </p>
              )}
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`file-item group cursor-pointer rounded-lg transition-all ${
                      selectedDocIds.includes(doc.id) ? "bg-accent ring-1 ring-ring/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center flex-shrink-0 pt-0.5">
                      <Checkbox
                        checked={selectedDocIds.includes(doc.id)}
                        onCheckedChange={(checked) => onToggleDoc(doc.id, checked === true)}
                        className="w-3.5 h-3.5"
                      />
                    </div>
                    <div className="w-8 h-8 rounded-md bg-surface-sunken flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{formatSize(doc.filesize)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{doc.chunk_count} chunks</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.filename}`}
                      title="Delete document"
                      disabled={deletingDocIds.includes(doc.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteDocument(doc.id, doc.filename);
                      }}
                      className="h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingDocIds.includes(doc.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4">No documents yet. Upload one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {sidebarTab === "status" && (
          <div className="px-4 py-2">
            <p className="panel-title">Pipeline Progress</p>
            <div className="space-y-0.5">
              {processingSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-accent/50 transition-colors">
                  <StatusIcon status={step.status} />
                  <span className={`text-xs ${
                    step.status === "completed"
                      ? "text-muted-foreground line-through"
                      : step.status === "running"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/50"
                  }`}>
                    {step.label}
                  </span>
                  {step.status === "running" && (
                    <span className="ml-auto text-[10px] text-status-running font-mono">running</span>
                  )}
                </div>
              ))}
            </div>

            {(() => {
              const completed = processingSteps.filter(s => s.status === "completed").length;
              const total = processingSteps.length;
              const pct = Math.round((completed / total) * 100);
              return (
                <div className="mt-4 px-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span className="font-mono">{completed}/{total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                    <div className="h-full bg-status-running rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {sidebarTab === "model" && (
          <div className="px-4 py-2">
            <div className="bg-surface-sunken rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground font-mono">llama-3.1-8b</p>
                  <p className="text-[10px] text-muted-foreground">Large Language Model</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  ["Context Window", "8,192 tokens"],
                  ["Runtime", "GGUF / CPU"],
                  ["Quantization", "Q4_K_M"],
                  ["Parameters", "8B"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className="text-[11px] font-mono text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-completed" />
          <span className="text-[10px] text-muted-foreground">System ready</span>
        </div>
      </div>
    </aside>
  );
}