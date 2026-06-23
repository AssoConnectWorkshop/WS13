'use client';

import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { ResultsPanel } from './ResultsPanel';

interface ChatPageProps {
  dbStatus: { ok: boolean; tables: string[] };
  apiStatus: { ok: boolean; platformName: string | null };
  wsName: string;
}

export function ChatPage({ dbStatus, apiStatus, wsName }: ChatPageProps) {
  const [chatData, setChatData] = useState<any>(null);

  const handleDataReceived = (data: any) => {
    setChatData(data);
  };

  return (
    <>
      <ChatInterface onDataReceived={handleDataReceived} />
      <ResultsPanel
        dbStatus={dbStatus}
        apiStatus={apiStatus}
        wsName={wsName}
        chatData={chatData}
      />
    </>
  );
}
