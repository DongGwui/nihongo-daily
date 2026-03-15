'use client';

import { useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

const AccuracyChart = dynamic(() => import('@/components/stats/accuracy-chart').then(m => ({ default: m.AccuracyChart })), { ssr: false });
const QuizTypeRadar = dynamic(() => import('@/components/stats/quiz-type-radar').then(m => ({ default: m.QuizTypeRadar })), { ssr: false });
const LevelDistribution = dynamic(() => import('@/components/stats/level-distribution').then(m => ({ default: m.LevelDistribution })), { ssr: false });

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const periods = ['week', 'month', 'all'] as const;
const periodLabels = { week: '1주', month: '1개월', all: '전체' };

export default function StatsPage() {
  const [period, setPeriod] = useState<string>('week');
  const { data, isLoading } = useSWR(`/api/stats?period=${period}`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">상세 통계</h1>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                period === p ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-80 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <AccuracyChart data={data.accuracy} />
          </div>
          <QuizTypeRadar data={data.quizTypes} />
          <LevelDistribution data={data.levelDistribution} />
        </div>
      ) : null}
    </div>
  );
}
