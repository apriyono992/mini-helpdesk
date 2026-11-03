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
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  isMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                <p>{m.body}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {isClosed ? (
        <p className="text-center text-sm text-gray-500 py-3 border-t">Ticket is closed.</p>
      ) : (
        <form onSubmit={submit} className="border-t flex gap-2 p-3">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
