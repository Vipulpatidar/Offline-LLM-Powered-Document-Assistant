import { useRef, useEffect, useState } from "react";
import { Send, RotateCcw, Loader2, MessageSquare, Brain } from "lucide-react";
import type { AppMode, ChatMessage, SourceMapEntry, RetrievedChunk } from "@/types/app";
import { InlineCitationBadge } from "./evidence/InlineCitationBadge";
import { SourceSummary } from "./evidence/SourceSummary";
import { ConfidenceMeter } from "./evidence/ConfidenceMeter";
import { EvidenceExplorerModal } from "./evidence/EvidenceExplorerModal";

interface ChatPanelProps {
  mode: AppMode;
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  isGenerating: boolean;
  isProcessing: boolean;
  selectedDocIds: number[];
  chunks: RetrievedChunk[];
  onCitationOpen?: (refNum: string) => void;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-up">
      <div className="bg-chat-assistant rounded-xl px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function renderContentWithCitations(
  content: string,
  sourceMap: Record<string, SourceMapEntry> | null | undefined,
  onCitationClick: (refNum: string) => void
) {
  if (!sourceMap) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  const parts = content.split(/(\[\d+\])/g);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match && sourceMap[match[1]]) {
          const refNum = match[1];
          return (
            <InlineCitationBadge
              key={i}
              refNum={refNum}
              entry={sourceMap[refNum]}
              onClick={onCitationClick}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function MessageBubble({
  message,
  chunks,
  onCitationClick,
  onOpenExplorer,
  lastUserQuery,
}: {
  message: ChatMessage;
  chunks: RetrievedChunk[];
  onCitationClick: (refNum: string) => void;
  onOpenExplorer: (msg: ChatMessage) => void;
  lastUserQuery: string;
}) {
  const isUser = message.role === "user";
  const hasSourceMap = !isUser && message.sourceMap && Object.keys(message.sourceMap).length > 0;

  return (
    <div className={`flex mb-4 animate-fade-up ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%]`}>
        <div
          className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
            isUser
              ? "bg-chat-user text-chat-user-foreground rounded-br-md"
              : "bg-chat-assistant text-chat-assistant-foreground rounded-bl-md shadow-soft"
          }`}
        >
          <div>
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              renderContentWithCitations(message.content, message.sourceMap, onCitationClick)
            )}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-text-bottom opacity-70" />
            )}
          </div>
        </div>

        {/* Evidence attachments for assistant messages */}
        {hasSourceMap && !message.isStreaming && (
          <div className="mt-1.5 px-1 space-y-1">
            <ConfidenceMeter sourceMap={message.sourceMap!} />
            <SourceSummary sourceMap={message.sourceMap!} chunks={chunks} />
            <div className="flex justify-end mt-1">
              <button
                onClick={() => onOpenExplorer(message)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground 
                  hover:text-foreground bg-surface-sunken hover:bg-accent border border-border 
                  rounded-lg px-2.5 py-1.5 transition-all duration-150"
              >
                <Brain className="w-3 h-3" />
                Evidence Explorer
              </button>
            </div>
          </div>
        )}

        <p className={`text-[10px] text-muted-foreground mt-1.5 px-1 ${isUser ? "text-right" : "text-left"}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  mode,
  messages,
  inputValue,
  onInputChange,
  onSend,
  onClear,
  isGenerating,
  isProcessing,
  selectedDocIds,
  chunks,
  onCitationOpen,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDisabled = isProcessing;
  const shouldStickToBottomRef = useRef(true);
  const [explorerMsg, setExplorerMsg] = useState<ChatMessage | null>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    if (scrollRef.current && shouldStickToBottomRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleCitationClick = (refNum: string) => {
    onCitationOpen?.(refNum);
  };

  // Find the last user query for context
  const lastUserQuery = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return (
    <div className="flex-1 flex flex-col h-screen bg-background min-w-0">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {selectedDocIds.length > 0 ? "Document Q&A" : "General Chat"}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {selectedDocIds.length > 0 ? `Querying ${selectedDocIds.length} selected document(s)` : "Open-ended conversation"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isGenerating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-sunken rounded-full mr-2">
              <Loader2 className="w-3 h-3 animate-spin text-status-running" />
              <span className="text-[10px] text-muted-foreground font-medium">Generating...</span>
            </div>
          )}
          <button
            onClick={onClear}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-sunken flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">No messages yet</p>
            <p className="text-xs text-muted-foreground/70 max-w-[240px]">
              {selectedDocIds.length > 0
                ? "Ask a question about the selected documents."
                : "Select document(s) for Q&A or start a general conversation."}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            chunks={chunks}
            onCitationClick={handleCitationClick}
            onOpenExplorer={setExplorerMsg}
            lastUserQuery={lastUserQuery}
          />
        ))}
        {isGenerating && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4 bg-surface flex-shrink-0">
        {isDisabled && (
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <Loader2 className="w-3 h-3 animate-spin text-status-running" />
            <p className="text-[11px] text-muted-foreground">Chat disabled while documents are processing...</p>
          </div>
        )}
        <div className="flex gap-2.5 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDisabled ? "Waiting for processing..." : selectedDocIds.length > 0 ? "Ask about selected documents..." : "Ask anything..."}
            disabled={isDisabled}
            rows={1}
            className="input-polished flex-1"
          />
          <button
            onClick={onSend}
            disabled={isDisabled || isGenerating || !inputValue.trim()}
            className="p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 shadow-soft"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Evidence Explorer Modal */}
      {explorerMsg?.sourceMap && (
        <EvidenceExplorerModal
          sourceMap={explorerMsg.sourceMap}
          chunks={chunks}
          query={lastUserQuery}
          onClose={() => setExplorerMsg(null)}
        />
      )}
    </div>
  );
}
