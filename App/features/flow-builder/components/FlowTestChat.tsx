"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  clearFlowTestSession,
  selectIntentChip,
  startFlow,
  submitUserMessage,
} from "../lib/runtime";
import { useFlowRuntimeStore } from "../store/useFlowRuntimeStore";
import { useFlowStore } from "../store/useFlowStore";

export default function FlowTestChat() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const runtime = useFlowRuntimeStore((s) => s.runtime);
  const loading = useFlowRuntimeStore((s) => s.loading);
  const streaming = useFlowRuntimeStore((s) => s.streaming);
  const setRuntime = useFlowRuntimeStore((s) => s.setRuntime);
  const setLoading = useFlowRuntimeStore((s) => s.setLoading);
  const setStreaming = useFlowRuntimeStore((s) => s.setStreaming);
  const reset = useFlowRuntimeStore((s) => s.reset);
  const patchRuntime = useFlowRuntimeStore((s) => s.patchRuntime);

  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [runtime.messages, runtime.chips, streaming, loading]);

  async function handleStart() {
    setLoading(true);
    setStreaming("");
    try {
      const next = await startFlow(nodes, edges);
      setRuntime(next);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    await clearFlowTestSession();
    reset();
    setInput("");
  }

  async function handleChipClick(optionId: string) {
    const current = useFlowRuntimeStore.getState().runtime;
    if (loading || current.finished || !current.waitingForChip) return;
    setLoading(true);
    setStreaming("");
    try {
      const next = await selectIntentChip(
        nodes,
        edges,
        current,
        optionId,
        setStreaming,
      );
      setRuntime(next);
      setStreaming("");
    } catch (err) {
      patchRuntime({
        messages: [
          ...current.messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: err instanceof Error ? err.message : "Chip action failed",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    let base = useFlowRuntimeStore.getState().runtime;
    if (!text || loading || base.finished) return;

    setInput("");
    setLoading(true);
    setStreaming("");
    try {
      if (!base.currentNodeId || base.messages.length === 0) {
        base = await startFlow(nodes, edges);
        setRuntime(base);
      }
      const next = await submitUserMessage(
        nodes,
        edges,
        base,
        text,
        setStreaming,
      );
      setRuntime(next);
      setStreaming("");
    } catch (err) {
      const prev = useFlowRuntimeStore.getState().runtime;
      patchRuntime({
        messages: [
          ...prev.messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: err instanceof Error ? err.message : "Test failed",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  const showChips = runtime.waitingForChip && runtime.chips.length > 0;
  const varKeys = Object.keys(runtime.vars).filter((k) => runtime.vars[k]);
  const visibleMessages = showDebug
    ? runtime.messages
    : runtime.messages.filter((m) => m.role !== "system");

  return (
    <div className="flow-test">
      <div className="flow-test__header">
        <div className="flow-test__heading">
          <h2>Test chat</h2>
          <p>
            {runtime.activePage
              ? `At: ${runtime.activePage}`
              : runtime.finished
                ? "Finished"
                : showChips
                  ? "Pick an intent chip"
                  : runtime.currentNodeId
                    ? "Flow running"
                    : "Run your flow here"}
          </p>
        </div>
        <button type="button" className="flow-test__ghost" onClick={handleReset}>
          Reset
        </button>
        <button
          type="button"
          className={`flow-test__ghost ${showDebug ? "is-on" : ""}`}
          onClick={() => setShowDebug((v) => !v)}
          title="Show system lines and variables"
        >
          Debug
        </button>
        <button
          type="button"
          className="flow-test__primary"
          onClick={handleStart}
          disabled={loading || nodes.length === 0}
        >
          Start
        </button>
      </div>

      <div className="flow-test__messages">
        {runtime.messages.length === 0 && !loading ? (
          <p className="flow-test__hint">
            Press Start to walk the flow. Chips match labels/keywords; real
            questions use Fallback RAG. Greetings stay on the menu.
          </p>
        ) : null}

        {visibleMessages.map((m) => (
          <div key={m.id} className={`flow-test__bubble is-${m.role}`}>
            {m.content}
          </div>
        ))}

        {showChips ? (
          <div className="flow-test__chips">
            {runtime.chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={loading}
                onClick={() => handleChipClick(chip.id)}
                className={`flow-test__chip ${chip.targetNodeId ? "is-linked" : "is-unlinked"}`}
                title={
                  chip.targetNodeId
                    ? "Open linked node"
                    : "Not connected — link this intent on the canvas"
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}

        {streaming ? (
          <div className="flow-test__bubble is-ai">{streaming}</div>
        ) : null}

        {loading && !streaming ? (
          <p className="flow-test__loading">Running…</p>
        ) : null}

        {showDebug && varKeys.length > 0 ? (
          <p className="flow-test__vars">
            Vars:{" "}
            {varKeys
              .slice(0, 6)
              .map((k) => {
                const v = runtime.vars[k];
                return `${k}=“${v.slice(0, 40)}${v.length > 40 ? "…" : ""}”`;
              })
              .join(" · ")}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flow-test__composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            runtime.finished
              ? "Flow ended — press Start"
              : showChips
                ? "Type a label, keyword, or free question…"
                : "Type a reply…"
          }
          disabled={loading || runtime.finished}
        />
        <button
          type="submit"
          disabled={loading || runtime.finished || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
