"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useState } from "react";
import { useFlowStore } from "../store/useFlowStore";
import FlowCanvas from "./FlowCanvas";
import FlowTestChat from "./FlowTestChat";
import NodeInspector from "./NodeInspector";
import NodePalette from "./NodePalette";
import Toolbar from "./Toolbar";

export default function FlowBuilder() {
  const hydrate = useFlowStore((s) => s.hydrate);
  const hydrated = useFlowStore((s) => s.hydrated);
  const [rightTab, setRightTab] = useState<"properties" | "test">("properties");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f5f5f7] text-[13px] text-[#86868b]">
        Loading flow…
      </div>
    );
  }

  return (
    <div className="flow-studio flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <Toolbar />
      <div className="flow-studio__body">
        <aside className="flow-studio__palette">
          <NodePalette />
        </aside>

        <section className="flow-studio__canvas">
          <ReactFlowProvider>
            <FlowCanvas />
          </ReactFlowProvider>
        </section>

        <aside className="flow-studio__inspector">
          <div className="flow-studio__tabs">
            <button
              type="button"
              className={rightTab === "properties" ? "is-active" : ""}
              onClick={() => setRightTab("properties")}
            >
              Properties
            </button>
            <button
              type="button"
              className={rightTab === "test" ? "is-active" : ""}
              onClick={() => setRightTab("test")}
            >
              Test chat
            </button>
          </div>
          {/* Keep both mounted so test transcript / runtime state survive tab switches */}
          <div
            className="flow-studio__tab-body"
            hidden={rightTab !== "properties"}
          >
            <NodeInspector />
          </div>
          <div className="flow-studio__tab-body" hidden={rightTab !== "test"}>
            <FlowTestChat />
          </div>
        </aside>
      </div>
    </div>
  );
}
