"use client";
import { useEffect, useRef, useState } from "react";
import type { Message, User } from "@/lib/types";

interface Props {
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
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || isClosed) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping?.(false);
    onSend(body);
    setInput("");
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
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
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
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

      {/* Fixed bottom input / closed banner */}
      {isClosed ? (
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-center text-sm text-gray-400">This ticket is closed.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="shrink-0 border-t border-gray-100 flex gap-2 p-3 bg-white">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Type a message…"
            value={input}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
