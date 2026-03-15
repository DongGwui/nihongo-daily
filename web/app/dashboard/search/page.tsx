'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const LEVELS = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];
const TYPES = ['', 'vocabulary', 'grammar', 'sentence', 'news'];
const typeLabels: Record<string, string> = { '': '전체', vocabulary: '어휘', grammar: '문법', sentence: '예문', news: '뉴스' };
const levelColors: Record<string, string> = {
  N5: 'bg-emerald-900 text-emerald-300',
  N4: 'bg-cyan-900 text-cyan-300',
  N3: 'bg-indigo-900 text-indigo-300',
  N2: 'bg-amber-900 text-amber-300',
  N1: 'bg-red-900 text-red-300',
};

export default function SearchPage() {
  const [level, setLevel] = useState('');
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (level) params.set('level', level);
  if (type) params.set('type', type);
  if (query) params.set('q', query);
  params.set('page', String(page));

  const { data, isLoading } = useSWR(`/api/contents?${params}`, fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">콘텐츠 검색</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">모든 레벨</option>
          {LEVELS.filter(Boolean).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                type === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="키워드 검색..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-32 animate-pulse" />
          ))}
        </div>
      ) : data?.items?.length > 0 ? (
        <>
          <p className="text-sm text-gray-400">{data.total}개 결과</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.items.map((item: { id: number; type: string; jlptLevel: string; title: string | null; bodyJa: string; bodyKo: string | null; studied: boolean }) => (
              <div
                key={item.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${levelColors[item.jlptLevel] || 'bg-gray-800'}`}>
                    {item.jlptLevel}
                  </span>
                  <span className="text-xs text-gray-500">{typeLabels[item.type] || item.type}</span>
                  {item.studied && <span className="text-xs text-emerald-400">학습 완료</span>}
                </div>
                {item.title && <div className="font-medium mb-1">{item.title}</div>}
                <div className="text-sm text-gray-300 line-clamp-2">{item.bodyJa}</div>
                {item.bodyKo && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.bodyKo}</div>}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-gray-800 text-sm disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-gray-400">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1 rounded bg-gray-800 text-sm disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">검색 결과가 없습니다</div>
      )}
    </div>
  );
}
