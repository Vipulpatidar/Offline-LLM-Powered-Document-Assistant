import { LeftSidebar } from "@/components/LeftSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { RightPanel } from "@/components/RightPanel";
import { useAppState } from "@/hooks/useAppState";
import { useState } from "react";

const Index = () => {
  const state = useAppState();
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <LeftSidebar
        mode={state.mode}
        onModeChange={state.setMode}
        processingSteps={state.processingSteps}
        files={state.files}
        onDeleteFile={state.deleteFile}
        onUploadFiles={state.handleUploadFiles}
        isProcessing={state.isProcessing}
        documents={state.documents}
        selectedDocIds={state.selectedDocIds}
        onToggleDoc={(id, checked) =>
          state.setSelectedDocIds((prev) =>
            checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((docId) => docId !== id)
          )
        }
        onDeleteDocument={state.deleteBackendDocument}
      />
      <ChatPanel
        mode={state.mode}
        messages={state.messages}
        inputValue={state.inputValue}
        onInputChange={state.setInputValue}
        onSend={state.sendMessage}
        onClear={state.clearChat}
        isGenerating={state.isGenerating}
        isProcessing={state.isProcessing}
        selectedDocIds={state.selectedDocIds}
        chunks={state.chunks}
        onCitationOpen={setHighlightedCitation}
      />
      <RightPanel chunks={state.chunks} logs={state.logs} highlightedCitation={highlightedCitation} />
    </div>
  );
};

export default Index;
