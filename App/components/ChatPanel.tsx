"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ChatMessage, ChatResponse } from "@/lib/api";

type ChatPanelProps = {
  onResponse: (meta: ChatResponse | null) => void;
};

export default function ChatPanel({ onResponse }: ChatPanelProps) {
  const [sessionId, setSessionId] = useState("default");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, status, loading]);

  async function loadHistory() {
    try {
      setError("");
      const data = await api.getHistory(sessionId);
      setMessages(data.messages);
      onResponse(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setError("");
    setStatus("Connecting…");
    setStreamingText("");
    setMessages((prev) => [...prev, { role: "human", content: text }]);

    try {
      let assembled = "";
      for await (const event of api.streamMessage(text, sessionId)) {
        if (event.type === "status") {
          setStatus(event.message);
        } else if (event.type === "token") {
          assembled += event.content;
          setStreamingText(assembled);
          setStatus("");
        } else if (event.type === "done") {
          onResponse(event.response);
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: event.response.answer || assembled },
          ]);
          setStreamingText("");
          setStatus("");
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat request failed");
      setStreamingText("");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    try {
      await api.clearHistory(sessionId);
      setMessages([]);
      setStreamingText("");
      setStatus("");
      onResponse(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }

  function handleNewSession() {
    const id = `session-${Date.now()}`;
    setSessionId(id);
    setMessages([]);
    setStreamingText("");
    setStatus("");
    onResponse(null);
  }

  const showStreamingBubble = loading && (streamingText || status);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-4 py-2">
        <h2 className="mr-auto text-[14px] font-semibold text-[#1d1d1f]">RAG</h2>
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="apple-input max-w-[160px] py-1.5 text-[13px]"
          placeholder="Session ID"
        />
        <button type="button" onClick={handleNewSession} className="apple-btn-secondary text-[13px]">
          New
        </button>
        <button type="button" onClick={handleClear} className="apple-btn-secondary text-[13px]">
          Clear
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.length === 0 && !showStreamingBubble && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[15px] font-medium text-[#1d1d1f]">Start a conversation</p>
            <p className="mt-1 text-[14px] text-[#86868b]">
              Ask questions about the uploaded document.
            </p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={`${index}-${msg.role}`}
            className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${
                msg.role === "human"
                  ? "bg-[#0071e3] text-white"
                  : "bg-[#e9e9eb] text-[#1d1d1f]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {showStreamingBubble && (
          <div className="flex justify-start">
            <div className="max-w-[78%] rounded-[20px] bg-[#e9e9eb] px-4 py-2.5 text-[15px] leading-relaxed text-[#1d1d1f]">
              {streamingText ? (
                <>
                  {streamingText}
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#0071e3] align-middle" />
                </>
              ) : (
                <span className="inline-flex items-center gap-2 text-[#86868b]">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86868b] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86868b] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86868b] [animation-delay:300ms]" />
                  </span>
                  <span className="text-[13px]">{status || "Working…"}</span>
                </span>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-black/[0.06] px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message"
          disabled={loading}
          className="apple-input flex-1 border-0 bg-transparent focus:bg-transparent focus:ring-0 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="apple-btn-primary px-4 py-2 text-[14px]"
        >
          {loading ? "…" : "Send"}
        </button>
      </form>

      {error && (
        <p className="border-t border-black/[0.06] px-5 py-2 text-[13px] text-[#ff3b30]">
          {error}
        </p>
      )}
    </div>
  );
}
