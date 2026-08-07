"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import ConfigPanel from "@/components/ConfigPanel";
import ResponsePanel from "@/components/ResponsePanel";
import { Card } from "@/components/ui";
import { api, ChatResponse } from "@/lib/api";

function RagPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const configId = searchParams.get("config")?.trim() || "";
  const sessionFromUrl = searchParams.get("session")?.trim() || "";

  const [sessionName, setSessionName] = useState(
    sessionFromUrl || "default",
  );
  const [responseMeta, setResponseMeta] = useState<ChatResponse | null>(null);
  const [testingConfig, setTestingConfig] = useState<{
    id: string;
    name: string;
    category: string;
  } | null>(null);
  const [configReady, setConfigReady] = useState(!configId);
  const [configError, setConfigError] = useState("");
  const [configPanelKey, setConfigPanelKey] = useState(0);

  // When opened with ?config=, apply that published config into the session
  // so the left Settings panel shows those values for testing.
  useEffect(() => {
    let cancelled = false;

    async function applyFromUrl() {
      if (!configId) {
        setTestingConfig(null);
        setConfigReady(true);
        setConfigError("");
        return;
      }

      setConfigReady(false);
      setConfigError("");
      const targetSession = sessionFromUrl || "default";

      try {
        const published = await api.getPublishedConfig(configId);
        if (cancelled) return;

        await api.updateConfig(published.settings || {}, targetSession);
        if (cancelled) return;

        setSessionName(targetSession);
        setTestingConfig({
          id: published.id,
          name: published.name,
          category: published.dataset_category,
        });
        setConfigPanelKey((k) => k + 1);
        setConfigReady(true);
      } catch (err) {
        if (cancelled) return;
        setConfigError(
          err instanceof Error ? err.message : "Failed to apply published config",
        );
        setConfigReady(true);
      }
    }

    applyFromUrl();
    return () => {
      cancelled = true;
    };
  }, [configId, sessionFromUrl]);

  function handleSessionNameChange(name: string) {
    setSessionName(name);
    if (testingConfig) {
      const params = new URLSearchParams();
      params.set("session", name);
      params.set("config", testingConfig.id);
      router.replace(`/rag?${params.toString()}`, { scroll: false });
    }
  }

  function clearTesting() {
    setTestingConfig(null);
    setConfigError("");
    router.replace("/rag", { scroll: false });
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-2 overflow-hidden px-3 py-2 sm:px-4">
      {testingConfig && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-[#0071e3]/25 bg-[#0071e3]/08 px-3 py-2">
          <div className="min-w-0 text-[13px] text-[#1d1d1f]">
            <span className="font-semibold">Active config:</span>{" "}
            <span className="font-medium">{testingConfig.name}</span>
            {testingConfig.category ? (
              <span className="text-[#86868b]"> · {testingConfig.category}</span>
            ) : null}
            <span className="text-[#86868b]">
              {" "}
              — applied to Settings · session “{sessionName}”
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href="/rag/published-configs"
              className="apple-btn-secondary !px-3 !py-1.5 !text-[12px]"
            >
              All configs
            </a>
            <button
              type="button"
              onClick={clearTesting}
              className="rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-[#86868b] hover:bg-white/80"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {configError && (
        <p className="rounded-[2px] bg-[#ff3b30]/8 px-3 py-2 text-[13px] text-[#ff3b30]">
          {configError}
        </p>
      )}

      {!configReady ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-[#86868b]">
          Applying published config to Settings…
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[260px_1fr_280px]">
          <Card className="flex min-h-0 flex-col overflow-hidden !rounded-[2px] p-0">
            <ConfigPanel
              key={`${sessionName}-${configPanelKey}`}
              sessionName={sessionName}
            />
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden !rounded-[2px] p-0">
            <ChatPanel
              sessionName={sessionName}
              onSessionNameChange={handleSessionNameChange}
              onResponse={setResponseMeta}
            />
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden !rounded-[2px] p-0">
            <ResponsePanel meta={responseMeta} />
          </Card>
        </div>
      )}
    </div>
  );
}

export default function RagPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-[14px] text-[#86868b]">
          Loading RAG…
        </div>
      }
    >
      <RagPageInner />
    </Suspense>
  );
}
