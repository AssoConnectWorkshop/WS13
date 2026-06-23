'use client';

import type { Contact } from '@/types';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface PieChartViewProps {
  data: Contact[];
}

export function PieChartView({ data }: PieChartViewProps) {
  const typeCounts = data.reduce(
    (acc, contact) => {
      const type = contact.type === 'person' ? 'Persons' : 'Structures';
      const existing = acc.find((item) => item.name === type);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: type, value: 1 });
      }
      return acc;
    },
    [] as { name: string; value: number }[]
  );

  const COLORS = ['#3b82f6', '#10b981'];

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-6">Contact Distribution</h2>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={typeCounts}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) =>
              `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
            }
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {typeCounts.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} contacts`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-6">
        Total contacts: <span className="font-semibold">{data.length}</span>
      </p>
    </div>
  );
}
