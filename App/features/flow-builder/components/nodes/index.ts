import type { NodeTypes } from "@xyflow/react";
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
} from "../../types";
import ApiNode from "./ApiNode";
import ConditionNode from "./ConditionNode";
import EndNode from "./EndNode";
import FallbackNode from "./FallbackNode";
import IntentNode from "./IntentNode";
import KnowledgeNode from "./KnowledgeNode";
import MessageNode from "./MessageNode";
import MysqlNode from "./MysqlNode";
import PageNameNode from "./PageNameNode";
import QuestionNode from "./QuestionNode";

export const nodeTypes: NodeTypes = {
  [PAGE_NAME_NODE]: PageNameNode,
  [MESSAGE_NODE]: MessageNode,
  [QUESTION_NODE]: QuestionNode,
  [CONDITION_NODE]: ConditionNode,
  [KNOWLEDGE_NODE]: KnowledgeNode,
  [INTENT_NODE]: IntentNode,
  [FALLBACK_NODE]: FallbackNode,
  [API_NODE]: ApiNode,
  [MYSQL_NODE]: MysqlNode,
  [END_NODE]: EndNode,
};
