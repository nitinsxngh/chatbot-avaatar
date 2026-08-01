import type { EdgeTypes } from "@xyflow/react";
import { FLOW_EDGE } from "../../constants";
import FlowEdge from "./FlowEdge";

export { FLOW_EDGE };

export const edgeTypes: EdgeTypes = {
  [FLOW_EDGE]: FlowEdge,
};
