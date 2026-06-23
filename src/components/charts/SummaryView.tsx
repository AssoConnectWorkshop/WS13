import type { Contact } from '@/types';

interface SummaryViewProps {
  data: Contact[];
}

export function SummaryView({ data }: SummaryViewProps) {
  const personCount = data.filter((c) => c.type === 'person').length;
  const structureCount = data.filter((c) => c.type === 'structure').length;
  const withEmail = data.filter((c) => c.email).length;
  const withPhone = data.filter((c) => c.mobilePhone || c.landlinePhone).length;

  const stats = [
    { label: 'Total Contacts', value: data.length, icon: '👥' },
    { label: 'Persons', value: personCount, icon: '👤' },
    { label: 'Structures', value: structureCount, icon: '🏢' },
    { label: 'With Email', value: withEmail, icon: '✉️' },
    { label: 'With Phone', value: withPhone, icon: '☎️' },
  ];

  return (
    <div className="flex-1 p-8">
      <h2 className="text-2xl font-bold mb-6">Summary Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <p className="text-4xl">{stat.icon}</p>
            </div>
          </div>
        ))}
      </div>

      {data.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Preview</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.slice(0, 10).map((contact, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">
                    {contact.firstname} {contact.lastname}
                  </p>
                  <p className="text-sm text-gray-600">
                    {contact.type === 'person' ? '👤 Person' : '🏢 Structure'}
                  </p>
                </div>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                )}
              </div>
            ))}
          </div>
          {data.length > 10 && (
            <p className="text-sm text-gray-600 mt-4">
              ...and {data.length - 10} more contacts
            </p>
          )}
        </div>
      )}
    </div>
  );
}
