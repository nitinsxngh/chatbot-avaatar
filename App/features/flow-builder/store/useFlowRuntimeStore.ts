import { create } from "zustand";
import {
  idleRuntimeState,
  type FlowRuntimeState,
} from "../lib/runtime";

type FlowRuntimeStore = {
  runtime: FlowRuntimeState;
  loading: boolean;
  streaming: string;
  setRuntime: (state: FlowRuntimeState) => void;
  patchRuntime: (patch: Partial<FlowRuntimeState>) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: string) => void;
  reset: () => void;
};

export const useFlowRuntimeStore = create<FlowRuntimeStore>((set) => ({
  runtime: idleRuntimeState(),
  loading: false,
  streaming: "",
  setRuntime: (runtime) => set({ runtime }),
  patchRuntime: (patch) =>
    set((s) => ({ runtime: { ...s.runtime, ...patch } })),
  setLoading: (loading) => set({ loading }),
  setStreaming: (streaming) => set({ streaming }),
  reset: () =>
    set({ runtime: idleRuntimeState(), loading: false, streaming: "" }),
}));
