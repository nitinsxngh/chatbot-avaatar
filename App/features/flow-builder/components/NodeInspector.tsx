"use client";

import {
  API_NODE,
  CONDITION_NODE,
  END_NODE,
  FALLBACK_NODE,
  INTENT_NODE,
  KNOWLEDGE_NODE,
  MESSAGE_NODE,
  MYSQL_NODE,
  PAGE_NAME_NODE,
  QUESTION_NODE,
  getNodeTitle,
  isIntentNode,
  isPageNameNode,
} from "../types";
import { useFlowStore } from "../store/useFlowStore";

export default function NodeInspector() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useFlowStore((s) => s.selectedEdgeIds);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const addIntentOption = useFlowStore((s) => s.addIntentOption);
  const updateIntentOption = useFlowStore((s) => s.updateIntentOption);
  const removeIntentOption = useFlowStore((s) => s.removeIntentOption);
  const deleteSelected = useFlowStore((s) => s.deleteSelected);

  const multiCount = selectedNodeIds.length + selectedEdgeIds.length;
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (multiCount > 1) {
    return (
      <div className="flow-inspector">
        <div className="flow-inspector__header">
          <h2>Selection</h2>
          <p>
            {selectedNodeIds.length} node
            {selectedNodeIds.length === 1 ? "" : "s"}
            {selectedEdgeIds.length
              ? ` · ${selectedEdgeIds.length} link${selectedEdgeIds.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <div className="flow-inspector__empty">
          <p className="flow-inspector__empty-title">Multiple selected</p>
          <p className="flow-inspector__empty-text">
            Press Delete / Backspace, or use the button below to remove them.
          </p>
        </div>
        <div className="flow-inspector__footer">
          <button
            type="button"
            onClick={deleteSelected}
            className="flow-inspector__delete"
          >
            Delete selected
          </button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flow-inspector">
        <div className="flow-inspector__empty">
          <p className="flow-inspector__empty-title">No selection</p>
          <p className="flow-inspector__empty-text">
            Click a node, Shift-click to add more, or drag on the canvas to
            select many. Then press Delete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-inspector">
      <div className="flow-inspector__header">
        <h2>Properties</h2>
        <p>{getNodeTitle(node)}</p>
      </div>

      <div className="flow-inspector__body">
        {node.type === PAGE_NAME_NODE && isPageNameNode(node) ? (
          <>
            <Field
              label="Name"
              value={node.data.pageName}
              onChange={(v) => updateNodeData(node.id, { pageName: v })}
              placeholder="e.g. start"
            />
            <Area
              label="Description"
              value={node.data.description}
              onChange={(v) => updateNodeData(node.id, { description: v })}
              placeholder="What this start step covers"
            />
            <label className="flow-inspector__check">
              <input
                type="checkbox"
                checked={node.data.isEntry}
                onChange={(e) =>
                  updateNodeData(node.id, { isEntry: e.target.checked })
                }
              />
              <span>
                <span className="flow-inspector__check-title">Flow entry</span>
                <span className="flow-inspector__check-hint">
                  Test chat starts here.
                </span>
              </span>
            </label>
          </>
        ) : null}

        {node.type === MESSAGE_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Area
              label="Message text"
              value={node.data.text}
              onChange={(v) => updateNodeData(node.id, { text: v })}
              placeholder="Supports {{last_user}} and {{last_answer}}"
            />
            <p className="text-[11px] leading-relaxed text-[#86868b]">
              Tip: use {"{{last_user}}"} / {"{{last_answer}}"} to reuse prior
              answers.
            </p>
          </>
        ) : null}

        {node.type === INTENT_NODE && isIntentNode(node) ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Area
              label="Prompt shown in chat"
              value={node.data.prompt}
              onChange={(v) => updateNodeData(node.id, { prompt: v })}
              placeholder="What would you like to do?"
            />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#86868b]">
                  Intent chips
                </span>
                <button
                  type="button"
                  className="text-[11px] font-medium text-[#0071e3] hover:underline"
                  onClick={() => addIntentOption(node.id)}
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {node.data.options.map((opt) => (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-lg bg-[#f5f5f7] px-3 py-2 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20"
                        value={opt.label}
                        onChange={(e) =>
                          updateIntentOption(node.id, opt.id, {
                            label: e.target.value,
                          })
                        }
                        placeholder="Chip label"
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded-lg px-2 py-2 text-[11px] text-[#ff3b30] hover:bg-[#ff3b30]/08"
                        onClick={() => removeIntentOption(node.id, opt.id)}
                        disabled={node.data.options.length <= 1}
                        title="Remove chip"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      className="w-full rounded-lg bg-[#f5f5f7] px-3 py-1.5 text-[11px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20"
                      value={opt.keywords || ""}
                      onChange={(e) =>
                        updateIntentOption(node.id, opt.id, {
                          keywords: e.target.value,
                        })
                      }
                      placeholder="Keywords (optional): price, cost, plan"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#86868b]">
                Drag from each chip handle (and Fallback) to the next node. Free
                text matches label, keywords, or soft contains — else Fallback.
              </p>
            </div>
          </>
        ) : null}

        {node.type === QUESTION_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Area
              label="Prompt"
              value={node.data.prompt}
              onChange={(v) => updateNodeData(node.id, { prompt: v })}
              placeholder="Question shown to the user"
            />
            <Field
              label="Save answer as"
              value={node.data.variableName || "answer"}
              onChange={(v) => updateNodeData(node.id, { variableName: v })}
              placeholder="answer"
            />
            <p className="text-[11px] leading-relaxed text-[#86868b]">
              Use {"{{"}
              {node.data.variableName || "answer"}
              {"}}"} or {"{{last_answer}}"} in later Message / Knowledge hint
              text.
            </p>
          </>
        ) : null}

        {node.type === CONDITION_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Field
              label="Keywords (comma-separated)"
              value={node.data.keywords}
              onChange={(v) => updateNodeData(node.id, { keywords: v })}
              placeholder="yes, ok, sure"
            />
            <p className="text-[11px] leading-relaxed text-[#86868b]">
              Connect the top handle for match, bottom for else.
            </p>
          </>
        ) : null}

        {node.type === KNOWLEDGE_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Field
              label="Query hint (optional)"
              value={node.data.queryHint}
              onChange={(v) => updateNodeData(node.id, { queryHint: v })}
              placeholder="Used only if no user text — supports {{vars}}"
            />
            <p className="text-[11px] leading-relaxed text-[#86868b]">
              Prefers the latest user message; hint is a fallback. Supports{" "}
              {"{{last_user}}"} / {"{{answer}}"}.
            </p>
          </>
        ) : null}

        {node.type === API_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />

            <p className="flow-inspector__section">Connection</p>
            <Field
              label="Connection string (base URL)"
              value={
                node.data.connectionString ||
                node.data.url ||
                ""
              }
              onChange={(v) =>
                updateNodeData(node.id, { connectionString: v, url: v })
              }
              placeholder="https://api.example.com"
            />
            <Field
              label="Path (optional)"
              value={node.data.path || ""}
              onChange={(v) => updateNodeData(node.id, { path: v })}
              placeholder="/v1/users/{{answer}}"
            />
            <p className="text-[11px] leading-relaxed text-[#86868b]">
              Final URL = connection string + path. You can also put the full
              endpoint in the connection string and leave path empty. Supports{" "}
              {"{{vars}}"}.
            </p>

            <p className="flow-inspector__section">Request</p>
            <label className="flow-inspector__field">
              <span>Method</span>
              <select
                value={node.data.method}
                onChange={(e) =>
                  updateNodeData(node.id, { method: e.target.value })
                }
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <Area
              label="Headers (JSON)"
              value={node.data.headersJson}
              onChange={(v) => updateNodeData(node.id, { headersJson: v })}
              placeholder='{"Authorization":"Bearer …"}'
            />
            <Area
              label="Body"
              value={node.data.body}
              onChange={(v) => updateNodeData(node.id, { body: v })}
              placeholder='{"q":"{{last_user}}"}'
            />

            <p className="flow-inspector__section">Response → vars</p>
            <Field
              label="Response path (optional)"
              value={node.data.responsePath}
              onChange={(v) => updateNodeData(node.id, { responsePath: v })}
              placeholder="data.items.0.name"
            />
            <Field
              label="Save as variable prefix"
              value={node.data.variableName}
              onChange={(v) => updateNodeData(node.id, { variableName: v })}
              placeholder="api"
            />
            <label className="flow-inspector__check">
              <input
                type="checkbox"
                checked={node.data.showInChat}
                onChange={(e) =>
                  updateNodeData(node.id, { showInChat: e.target.checked })
                }
              />
              <span>
                <span className="flow-inspector__check-title">
                  Show result in chat
                </span>
                <span className="flow-inspector__check-hint">
                  Stores {"{{"}
                  {node.data.variableName || "api"}
                  {"}}"}, {"{{"}
                  {node.data.variableName || "api"}
                  _status{"}}"}, {"{{"}
                  {node.data.variableName || "api"}
                  _body{"}}"}
                </span>
              </span>
            </label>
          </>
        ) : null}

        {node.type === MYSQL_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <p className="text-[11px] leading-relaxed text-[#ff9500]">
              Credentials are stored in this flow’s local JSON. Prefer a
              non-production DB for testing.
            </p>
            <Field
              label="Host"
              value={node.data.host}
              onChange={(v) => updateNodeData(node.id, { host: v })}
              placeholder="127.0.0.1"
            />
            <Field
              label="Port"
              value={node.data.port}
              onChange={(v) => updateNodeData(node.id, { port: v })}
              placeholder="3306"
            />
            <Field
              label="Database"
              value={node.data.database}
              onChange={(v) => updateNodeData(node.id, { database: v })}
            />
            <Field
              label="User"
              value={node.data.user}
              onChange={(v) => updateNodeData(node.id, { user: v })}
            />
            <Field
              label="Password"
              value={node.data.password}
              onChange={(v) => updateNodeData(node.id, { password: v })}
              placeholder="••••••••"
            />
            <Area
              label="SQL"
              value={node.data.sql}
              onChange={(v) => updateNodeData(node.id, { sql: v })}
              placeholder="SELECT * FROM users WHERE email = '{{answer}}' LIMIT 5"
            />
            <label className="flow-inspector__field">
              <span>Result mode</span>
              <select
                value={node.data.resultMode}
                onChange={(e) =>
                  updateNodeData(node.id, { resultMode: e.target.value })
                }
              >
                <option value="first_row">First row (object)</option>
                <option value="rows_json">All rows (JSON)</option>
                <option value="scalar">First cell (scalar)</option>
              </select>
            </label>
            <Field
              label="Save as variable prefix"
              value={node.data.variableName}
              onChange={(v) => updateNodeData(node.id, { variableName: v })}
              placeholder="db"
            />
            <label className="flow-inspector__check">
              <input
                type="checkbox"
                checked={node.data.mapColumnsToVars}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    mapColumnsToVars: e.target.checked,
                  })
                }
              />
              <span>
                <span className="flow-inspector__check-title">
                  Map first-row columns to vars
                </span>
                <span className="flow-inspector__check-hint">
                  e.g. {"{{"}
                  {node.data.variableName || "db"}
                  _email{"}}"}
                </span>
              </span>
            </label>
            <label className="flow-inspector__check">
              <input
                type="checkbox"
                checked={node.data.showInChat}
                onChange={(e) =>
                  updateNodeData(node.id, { showInChat: e.target.checked })
                }
              />
              <span>
                <span className="flow-inspector__check-title">
                  Show result in chat
                </span>
              </span>
            </label>
          </>
        ) : null}

        {node.type === FALLBACK_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Area
              label="Message"
              value={node.data.message}
              onChange={(v) => updateNodeData(node.id, { message: v })}
              placeholder="Shown before looking up unmatched text"
            />
            <label className="flow-inspector__check">
              <input
                type="checkbox"
                checked={node.data.runRag}
                onChange={(e) =>
                  updateNodeData(node.id, { runRag: e.target.checked })
                }
              />
              <span>
                <span className="flow-inspector__check-title">
                  Run RAG on typed query
                </span>
                <span className="flow-inspector__check-hint">
                  Looks up the user’s free-text when no chip matched
                </span>
              </span>
            </label>
          </>
        ) : null}

        {node.type === END_NODE ? (
          <>
            <Field
              label="Label"
              value={node.data.label}
              onChange={(v) => updateNodeData(node.id, { label: v })}
            />
            <Area
              label="Farewell"
              value={node.data.farewell}
              onChange={(v) => updateNodeData(node.id, { farewell: v })}
            />
          </>
        ) : null}
      </div>

      <div className="flow-inspector__footer">
        <button
          type="button"
          onClick={deleteSelected}
          className="flow-inspector__delete"
        >
          Delete node
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flow-inspector__field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flow-inspector__field">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
