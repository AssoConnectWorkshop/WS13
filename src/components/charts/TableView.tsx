import type { Contact } from '@/types';

interface TableViewProps {
  data: Contact[];
}

export function TableView({ data }: TableViewProps) {
  return (
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
            {data.map((contact: Contact, index: number) => (
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
        Total results: <span className="font-semibold">{data.length}</span>
      </p>
    </div>
  );
}
