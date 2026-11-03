"use client";
import { useEffect, useRef, useState } from "react";
import type { Message, User } from "@/lib/types";
import { api, API_BASE_URL } from "@/lib/api";

interface Props {
  ticketId?: number;
  messages: Message[];
  currentUser: User;
  isClosed: boolean;
  onSend: (body: string, attachmentUrl?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  typingText?: string | null;
  onLoadOlder?: () => Promise<void>;
  hasMore?: boolean;
  loadingOlder?: boolean;
}

export function ChatPanel({
  ticketId,
  messages,
  currentUser,
  isClosed,
  onSend,
  onTyping,
  typingText,
  onLoadOlder,
  hasMore = false,
  loadingOlder = false,
}: Props) {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoad = useRef(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto scroll to bottom on initial load or new message
  useEffect(() => {
    if (isFirstLoad.current && messages.length > 0) {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
      isFirstLoad.current = false;
    }
  }, [messages]);

  async function handleLoadOlder() {
    if (!listRef.current || !onLoadOlder || !hasMore || loadingOlder) return;
    const el = listRef.current;
    const oldScrollHeight = el.scrollHeight;
    const oldScrollTop = el.scrollTop;
    await onLoadOlder();
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight - oldScrollHeight + oldScrollTop;
      }
    });
  }

  function handleScroll() {
    if (!listRef.current || !onLoadOlder || !hasMore || loadingOlder) return;
    if (listRef.current.scrollTop <= 10) {
      void handleLoadOlder();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (onTyping) {
      onTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only image files (jpg, png, webp, gif) are allowed");
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if ((!body && !selectedFile) || isClosed || uploading) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping?.(false);

    let attachmentUrl: string | undefined = undefined;
    if (selectedFile && ticketId) {
      setUploading(true);
      try {
        const res = await api.tickets.uploadAttachment(ticketId, selectedFile);
        attachmentUrl = res.attachment_url;
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to upload image");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    onSend(body || "Sent an attachment", attachmentUrl);
    setInput("");
    handleRemoveFile();
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden relative">
      {/* Scrollable messages container */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto space-y-3 p-4"
      >
        {hasMore && (
          <div className="py-2 text-center">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {loadingOlder ? "Loading older messages…" : "Load older messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No messages yet.</p>
        )}

        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const imgUrl = m.attachment_url
            ? m.attachment_url.startsWith("http")
              ? m.attachment_url
              : `${API_BASE_URL}${m.attachment_url}`
            : null;

          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                }`}
              >
                {imgUrl && (
                  <div className="mb-2">
                    <img
                      src={imgUrl}
                      alt="Attachment"
                      className="rounded-lg max-h-56 max-w-full object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/10"
                      onClick={() => setLightboxUrl(imgUrl)}
                      loading="lazy"
                    />
                  </div>
                )}
                {m.body && <p className="leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>}
                <p
                  className={`text-[10px] mt-1 ${
                    isMe ? "text-indigo-300 text-right" : "text-gray-400"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Ephemeral Typing Indicator Banner */}
      {typingText && (
        <div className="shrink-0 px-4 py-1.5 text-xs text-indigo-600 bg-indigo-50/70 border-t border-indigo-100/50 flex items-center gap-1.5 animate-pulse">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
          <span>{typingText}</span>
        </div>
      )}

      {/* File Attachment Preview Thumbnail Bar */}
      {filePreview && (
        <div className="shrink-0 px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src={filePreview}
              alt="Selected"
              className="w-10 h-10 object-cover rounded-md border border-gray-300"
            />
            <span className="text-xs text-gray-600 truncate max-w-[200px]">
              {selectedFile?.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="text-xs text-gray-400 hover:text-gray-600 p-1"
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* Fixed bottom input / closed banner */}
      {isClosed ? (
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-center text-sm text-gray-400">This ticket is closed.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="shrink-0 border-t border-gray-100 flex items-center gap-2 p-3 bg-white">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            title="Attach image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder={selectedFile ? "Add caption (optional)…" : "Type a message…"}
            value={input}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !selectedFile) || uploading}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
          >
            {uploading ? "Uploading…" : "Send"}
          </button>
        </form>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxUrl}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold text-sm hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
