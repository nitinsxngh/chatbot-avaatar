"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import ConfigPanel from "@/components/ConfigPanel";
import ResponsePanel from "@/components/ResponsePanel";
import { Card } from "@/components/ui";
import { ChatResponse } from "@/lib/api";

export default function ChatPage() {
  const [responseMeta, setResponseMeta] = useState<ChatResponse | null>(null);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 72px)" }}>
      <div className="grid h-full gap-4 lg:grid-cols-[280px_1fr_300px]">
        {/* Config — left */}
        <Card className="flex h-full flex-col overflow-hidden p-0">
          <ConfigPanel />
        </Card>

        {/* Chat — center */}
        <Card className="flex h-full flex-col overflow-hidden p-0">
          <ChatPanel onResponse={setResponseMeta} />
        </Card>

        {/* Response — right */}
        <Card className="flex h-full flex-col overflow-hidden p-0">
          <ResponsePanel meta={responseMeta} />
        </Card>
      </div>
    </div>
  );
}
