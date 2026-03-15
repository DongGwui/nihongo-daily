'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface LevelDistributionProps {
  data: Record<string, number>;
}

const COLORS = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ef4444'];
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function LevelDistribution({ data }: LevelDistributionProps) {
  const chartData = LEVELS.map((level) => ({
    name: level,
    value: data[level] || 0,
  })).filter((d) => d.value > 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">JLPT 레벨별 분포</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
