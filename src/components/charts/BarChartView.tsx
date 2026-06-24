'use client';

import type { Contact } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartViewProps {
  data: Contact[];
}

export function BarChartView({ data }: BarChartViewProps) {
  const chartData = [
    {
      category: 'Contact Types',
      Persons: data.filter((c) => c.type === 'person').length,
      Structures: data.filter((c) => c.type === 'structure').length,
    },
    {
      category: 'Contact Info',
      'With Email': data.filter((c) => c.email).length,
      'With Phone': data.filter((c) => c.mobilePhone || c.landlinePhone).length,
    },
  ];

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-6">Contact Analytics</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Persons" fill="#3b82f6" />
          <Bar dataKey="Structures" fill="#10b981" />
          <Bar dataKey="With Email" fill="#f59e0b" />
          <Bar dataKey="With Phone" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-6">
        Total contacts: <span className="font-semibold">{data.length}</span>
      </p>
    </div>
  );
}
