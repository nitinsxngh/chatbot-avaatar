"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";

type FlowNodeShellProps = {
  selected?: boolean;
  accent: string;
  badge: string;
  kind: string;
  title: string;
  subtitle?: string;
  tag?: string;
  children?: ReactNode;
  target?: boolean;
  source?: boolean;
};

export function FlowNodeShell({
  selected,
  accent,
  badge,
  kind,
  title,
  subtitle,
  tag,
  children,
  target = true,
  source = true,
}: FlowNodeShellProps) {
  return (
    <div
      className={`flow-node ${selected ? "flow-node--selected" : ""}`}
      style={{ ["--node-accent" as string]: accent }}
    >
      {target ? (
        <Handle
          type="target"
          position={Position.Left}
          className="flow-node__handle flow-node__handle--target"
        />
      ) : null}

      <div className="flow-node__header">
        <div className="flow-node__badge-row">
          <span className="flow-node__badge">{badge}</span>
          <span className="flow-node__kind">{kind}</span>
        </div>
        {tag ? <span className="flow-node__tag">{tag}</span> : null}
      </div>

      <p className="flow-node__title">{title}</p>
      {subtitle ? <p className="flow-node__desc">{subtitle}</p> : null}
      {children}

      {source ? (
        <Handle
          type="source"
          position={Position.Right}
          className="flow-node__handle flow-node__handle--source"
        />
      ) : null}
    </div>
  );
}

export type { NodeProps };
