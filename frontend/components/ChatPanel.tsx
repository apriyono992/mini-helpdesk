"use client";
import { useRef, useState } from "react";
import type { Message, User } from "@/lib/types";

interface Props {
  messages: Message[];
  currentUser: User;
  isClosed: boolean;
  onSend: (body: string) => void;
}

export function ChatPanel({ messages, currentUser, isClosed, onSend }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || isClosed) return;
    onSend(body);
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
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
                <p className="leading-relaxed">{m.body}</p>
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

      {isClosed ? (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-center text-sm text-gray-400">This ticket is closed.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="border-t border-gray-100 flex gap-2 p-3 bg-white">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
