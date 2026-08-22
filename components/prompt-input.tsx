"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { useEditorStore } from "@/store/useEditorState";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";

const MAX_REFERENCE_FILE_BYTES = 20 * 1024 * 1024;

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

export const AIPromptInput = () => {
  const {
    setPrompt,
    generateEdit,
    setUserFiles,
    setErrorMessage,
    errorMessage,
    isUploading,
    isLoading,
  } = useEditorStore();
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [status, setStatus] = useState<"submitted" | "ready" | "error">(
    "ready",
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    if (isUploading || isLoading) {
      return;
    }

    const prompt = message.text.trim();
    if (!prompt) {
      setErrorMessage("Enter an edit instruction before generating.");
      setStatus("error");
      return;
    }

    setStatus("submitted");
    setErrorMessage(null);
    setPrompt(prompt);
    setUserFiles(message.files);

    try {
      await generateEdit({ webSearch: webSearchEnabled });
      setStatus("ready");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Image edit failed.";
      if (/cancelled/i.test(messageText)) {
        setStatus("ready");
        return;
      }

      console.error("Image edit failed:", error);
      setStatus("error");
    }
  };

  return (
    <div className="size-full">
      <PromptInput
        accept="image/*,application/pdf"
        globalDrop
        maxFiles={5}
        maxFileSize={MAX_REFERENCE_FILE_BYTES}
        multiple
        onError={({ message }) => setErrorMessage(message)}
        onSubmit={handleSubmit}
      >
        <PromptInputAttachmentsDisplay />
        <PromptInputBody>
          <PromptInputTextarea />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Add image or PDF" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <PromptInputButton
              aria-pressed={webSearchEnabled}
              disabled={isUploading || isLoading}
              className={
                webSearchEnabled ? "bg-yellow-500/20 text-yellow-400" : undefined
              }
              onClick={() => setWebSearchEnabled((enabled) => !enabled)}
              title={webSearchEnabled ? "Web search enabled" : "Enable web search"}
            >
              <GlobeIcon size={16} aria-hidden="true" />
              <span>Search</span>
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit
            status={isUploading || isLoading ? "submitted" : status}
          />
        </PromptInputFooter>
      </PromptInput>
      {errorMessage && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
