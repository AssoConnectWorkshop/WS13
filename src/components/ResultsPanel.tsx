import Image from 'next/image';
import type { Contact } from '@/types';
import { APP_VERSION } from '@/lib/version';
import { TableView } from './charts/TableView';
import { PieChartView } from './charts/PieChartView';
import { BarChartView } from './charts/BarChartView';
import { SummaryView } from './charts/SummaryView';

interface ResultsPanelProps {
  dbStatus: { ok: boolean; tables: string[] };
  apiStatus: { ok: boolean; platformName: string | null };
  wsName: string;
  chatData?: Contact[] | null;
  visualizationType?: 'table' | 'bar' | 'pie' | 'summary';
}

export function ResultsPanel({
  apiStatus,
  wsName,
  chatData,
  visualizationType = 'table',
}: ResultsPanelProps) {
  return (
    <div className="w-full md:w-1/2 flex flex-col bg-gray-50 overflow-y-auto relative">
      <div className="absolute top-4 right-4 text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded">
        v{APP_VERSION}
      </div>

      {chatData && chatData.length > 0 ? (
        <>
          {visualizationType === 'table' && <TableView data={chatData} />}
          {visualizationType === 'pie' && <PieChartView data={chatData} />}
          {visualizationType === 'bar' && <BarChartView data={chatData} />}
          {visualizationType === 'summary' && <SummaryView data={chatData} />}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 p-8 flex-1">
          <Image src="/mascot.png" alt="Mascot" width={120} height={120} priority />
          <p className="text-gray-500 text-sm text-center">Ask me about contacts in the chat →</p>
        </div>
      )}
    </div>
  );
}
