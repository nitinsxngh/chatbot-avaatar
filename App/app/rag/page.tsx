"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import ConfigPanel from "@/components/ConfigPanel";
import ResponsePanel from "@/components/ResponsePanel";
import { Card } from "@/components/ui";
import { ChatResponse } from "@/lib/api";

export default function RagPage() {
  const [sessionName, setSessionName] = useState("default");
  const [responseMeta, setResponseMeta] = useState<ChatResponse | null>(null);

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 gap-2 overflow-hidden px-3 py-2 sm:px-4 lg:grid-cols-[260px_1fr_280px]">
      <Card className="flex min-h-0 flex-col overflow-hidden !rounded-[2px] p-0">
        <ConfigPanel sessionName={sessionName} />
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden !rounded-[2px] p-0">
        <ChatPanel
          sessionName={sessionName}
          onSessionNameChange={setSessionName}
          onResponse={setResponseMeta}
        />
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden !rounded-[2px] p-0">
        <ResponsePanel meta={responseMeta} />
      </Card>
    </div>
  );
}
