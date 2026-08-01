"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { downloadFlowJson } from "../lib/persistence";
import { parseFlowDocument } from "../lib/parseFlowDocument";
import { validateFlow } from "../lib/validate";
import { useFlowStore } from "../store/useFlowStore";
import { PAGE_NAME_NODE } from "../types";

type LibraryItem = { id: string; name: string; updatedAt: string };

export default function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    tone: "ok" | "warn" | "err";
    text: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const flowName = useFlowStore((s) => s.flowName);
  const dirty = useFlowStore((s) => s.dirty);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setFlowName = useFlowStore((s) => s.setFlowName);
  const persist = useFlowStore((s) => s.persist);
  const clearFlow = useFlowStore((s) => s.clearFlow);
  const exportDocument = useFlowStore((s) => s.exportDocument);
  const importDocument = useFlowStore((s) => s.importDocument);
  const newFlow = useFlowStore((s) => s.newFlow);
  const openSavedFlow = useFlowStore((s) => s.openSavedFlow);
  const listLibrary = useFlowStore((s) => s.listLibrary);
  const addNode = useFlowStore((s) => s.addNode);
  const deleteSelected = useFlowStore((s) => s.deleteSelected);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useFlowStore((s) => s.selectedEdgeIds);
  const selectionCount = selectedNodeIds.length + selectedEdgeIds.length;

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!menuOpen) return;
    setLibrary(listLibrary());
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, listLibrary]);

  const onSave = () => {
    const issues = validateFlow(nodes, edges);
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length) {
      setStatus({ tone: "err", text: errors[0].message });
      return;
    }
    persist();
    const warnings = issues.filter((i) => i.level === "warning");
    setStatus({
      tone: warnings.length ? "warn" : "ok",
      text: warnings.length
        ? `Saved · ${warnings.length} warning${warnings.length > 1 ? "s" : ""}`
        : "Saved to library",
    });
  };

  const onValidate = () => {
    const issues = validateFlow(nodes, edges);
    if (!issues.length) {
      setStatus({ tone: "ok", text: "Flow looks good" });
      return;
    }
    const errors = issues.filter((i) => i.level === "error");
    const first = errors[0] || issues[0];
    setStatus({
      tone: first.level === "error" ? "err" : "warn",
      text:
        issues.length > 1
          ? `${first.message} (+${issues.length - 1} more)`
          : first.message,
    });
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setMenuOpen(false);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseFlowDocument(JSON.parse(text));
      if (!parsed.ok) {
        setStatus({ tone: "err", text: parsed.error });
        return;
      }
      importDocument(parsed.doc);
      const warn =
        parsed.warnings.length > 0
          ? ` · ${parsed.warnings.length} fix${parsed.warnings.length > 1 ? "es" : ""} applied`
          : "";
      setStatus({
        tone: parsed.warnings.length ? "warn" : "ok",
        text: `Imported “${parsed.doc.name || file.name}”${warn}`,
      });
    } catch {
      setStatus({ tone: "err", text: "Could not read flow file" });
    }
  };

  return (
    <header className="flow-toolbar">
      <div className="flow-toolbar__left">
        <span className="flow-toolbar__mark" aria-hidden>
          Flow
        </span>
        <input
          className="flow-toolbar__title"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          aria-label="Flow name"
          placeholder="Untitled flow"
        />
        <span
          className={`flow-toolbar__badge ${dirty ? "is-dirty" : "is-saved"}`}
        >
          {dirty ? "Unsaved" : "Saved"}
        </span>
        <span className="flow-toolbar__meta">
          {nodes.length} node{nodes.length === 1 ? "" : "s"}
          <span className="flow-toolbar__dot">·</span>
          {edges.length} link{edges.length === 1 ? "" : "s"}
        </span>
      </div>

      {status ? (
        <p className={`flow-toolbar__status is-${status.tone}`}>{status.text}</p>
      ) : null}

      <div className="flow-toolbar__actions">
        {selectionCount > 0 ? (
          <button
            type="button"
            className="flow-toolbar__btn flow-toolbar__btn--danger"
            onClick={deleteSelected}
            title="Delete selected (Delete / Backspace)"
          >
            Delete{selectionCount > 1 ? ` (${selectionCount})` : ""}
          </button>
        ) : null}
        <button
          type="button"
          className="flow-toolbar__btn flow-toolbar__btn--ghost flow-toolbar__btn--mobile"
          onClick={() =>
            addNode(PAGE_NAME_NODE, {
              x: 160 + Math.random() * 180,
              y: 100 + Math.random() * 140,
            })
          }
        >
          Add start
        </button>
        <button
          type="button"
          className="flow-toolbar__btn flow-toolbar__btn--ghost"
          onClick={onValidate}
        >
          Validate
        </button>

        <div className="flow-toolbar__menu" ref={menuRef}>
          <button
            type="button"
            className="flow-toolbar__btn flow-toolbar__btn--ghost"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            File
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M3 4.5 6 7.5 9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {menuOpen ? (
            <div role="menu" className="flow-toolbar__dropdown">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  newFlow();
                  setMenuOpen(false);
                  setStatus({ tone: "ok", text: "New flow (previous archived)" });
                }
                }
              >
                New flow
              </button>
              {library.length > 0 ? (
                <>
                  <div className="flow-toolbar__dropdown-sep" />
                  <p className="flow-toolbar__dropdown-label">Recent</p>
                  {library.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (dirty && !confirm("Discard unsaved changes?")) return;
                        const ok = openSavedFlow(item.id);
                        setMenuOpen(false);
                        setStatus({
                          tone: ok ? "ok" : "err",
                          text: ok
                            ? `Opened “${item.name}”`
                            : "Could not open flow",
                        });
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </>
              ) : null}
              <div className="flow-toolbar__dropdown-sep" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadFlowJson(exportDocument());
                  setMenuOpen(false);
                  setStatus({ tone: "ok", text: "Exported JSON" });
                }}
              >
                Export JSON
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => fileRef.current?.click()}
              >
                Import JSON
              </button>
              <div className="flow-toolbar__dropdown-sep" />
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  if (confirm("Clear all nodes and edges?")) {
                    clearFlow();
                    setStatus({ tone: "warn", text: "Flow cleared" });
                  }
                }}
              >
                Clear canvas
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="flow-toolbar__btn flow-toolbar__btn--primary"
          onClick={onSave}
        >
          Save
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden-input"
        tabIndex={-1}
        aria-hidden
        onChange={onImportFile}
      />
    </header>
  );
}
