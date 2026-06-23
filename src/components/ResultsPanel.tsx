import Image from 'next/image';

interface ResultsPanelProps {
  dbStatus: { ok: boolean; tables: string[] };
  apiStatus: { ok: boolean; platformName: string | null };
  wsName: string;
  chatData?: any;
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="text-green-500 text-2xl">✓</span>
  ) : (
    <span className="text-red-500 text-2xl">✗</span>
  );
}

export function ResultsPanel({ dbStatus, apiStatus, wsName, chatData }: ResultsPanelProps) {
  return (
    <div className="w-full md:w-1/2 flex flex-col bg-gray-50 overflow-y-auto">
      {chatData && chatData.length > 0 ? (
        <div className="flex-1 p-8">
          <h2 className="text-2xl font-bold mb-6">Query Results</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    First Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Last Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Mobile
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chatData.map((contact: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {contact.firstname || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {contact.lastname}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.type === 'person' ? '👤 Person' : '🏢 Structure'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.mobilePhone || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Total results: <span className="font-semibold">{chatData.length}</span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-8 p-8 flex-1">
          <div className="flex flex-col items-center gap-4">
            <Image src="/mascot.png" alt="Mascot" width={160} height={160} priority />
            <h1 className="text-4xl font-bold text-center">Padawan guillaume is ready</h1>
          </div>

          <div className="flex flex-col gap-6 w-full max-w-md">
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
              {!dbStatus.ok && <p className="text-sm text-red-600">Connection failed</p>}
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
              {!apiStatus.ok && <p className="text-sm text-red-600">Connection failed</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
