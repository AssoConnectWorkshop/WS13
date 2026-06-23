import Image from 'next/image';

interface ResultsPanelProps {
  dbStatus: { ok: boolean; tables: string[] };
  apiStatus: { ok: boolean; platformName: string | null };
  wsName: string;
  contactData?: { ok: boolean; contact: { firstname?: string; lastname: string } | null };
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="text-green-500 text-2xl">✓</span>
  ) : (
    <span className="text-red-500 text-2xl">✗</span>
  );
}

export function ResultsPanel({ dbStatus, apiStatus, wsName, contactData }: ResultsPanelProps) {
  return (
    <div className="w-full md:w-1/2 flex flex-col items-center justify-center gap-8 p-8 bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Image src="/mascot.png" alt="Mascot" width={160} height={160} priority />
        <h1 className="text-4xl font-bold text-center">Padawan guillaume is ready</h1>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-md">
        <div className="border border-gray-300 rounded-xl p-6 flex flex-col gap-3 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <StatusIcon ok={contactData?.ok ?? false} />
            <h2 className="text-lg font-semibold">Sample contact from API</h2>
          </div>
          {contactData?.ok && contactData?.contact && (
            <p className="text-sm text-gray-600">
              Name: <span className="font-medium">
                {contactData.contact.firstname && `${contactData.contact.firstname} `}
                {contactData.contact.lastname}
              </span>
            </p>
          )}
          {!contactData?.ok && (
            <p className="text-sm text-red-600">No contacts found</p>
          )}
        </div>

        <div className="border border-gray-300 rounded-xl p-6 flex flex-col gap-3 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <StatusIcon ok={dbStatus.ok} />
            <h2 className="text-lg font-semibold">Test database connection</h2>
          </div>
          {dbStatus.ok && (
            <p className="text-sm text-gray-600">
              Number of tables: {dbStatus.tables.length}
              {dbStatus.tables.length > 0 && (
                <span className="ml-1 opacity-60">
                  ({dbStatus.tables.slice(0, 3).join(', ')}
                  {dbStatus.tables.length > 3 ? '…' : ''})
                </span>
              )}
            </p>
          )}
          {!dbStatus.ok && (
            <p className="text-sm text-red-600">Connection failed</p>
          )}
        </div>

        <div className="border border-gray-300 rounded-xl p-6 flex flex-col gap-3 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <StatusIcon ok={apiStatus.ok} />
            <h2 className="text-lg font-semibold">Test API connection</h2>
          </div>
          {apiStatus.ok && apiStatus.platformName && (
            <p className="text-sm text-gray-600">
              Name of the platform: <span className="font-medium">{apiStatus.platformName}</span>
            </p>
          )}
          {!apiStatus.ok && (
            <p className="text-sm text-red-600">Connection failed</p>
          )}
        </div>
      </div>
    </div>
  );
}
