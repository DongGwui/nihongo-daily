'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface QuizTypeRadarProps {
  data: Record<string, { correct: number; total: number }>;
}

const typeLabels: Record<string, string> = {
  vocabulary: '어휘',
  reading: '읽기',
  grammar: '문법',
  translate: '해석',
  comprehension: '독해',
};

export function QuizTypeRadar({ data }: QuizTypeRadarProps) {
  const chartData = Object.entries(data).map(([type, stats]) => ({
    type: typeLabels[type] || type,
    정답률: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">퀴즈 유형별 성과</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="type" stroke="#9ca3af" fontSize={12} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#4b5563" fontSize={10} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          />
          <Radar name="정답률" dataKey="정답률" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
