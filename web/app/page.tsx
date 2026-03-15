'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleTelegramAuth = useCallback(async (user: Record<string, unknown>) => {
    const res = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json();
      if (data.error === 'NOT_REGISTERED') {
        alert(data.message);
      } else {
        alert('로그인에 실패했습니다.');
      }
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onTelegramAuth = handleTelegramAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_BOT_USERNAME || 'nihongo_daily_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-login');
    container?.appendChild(script);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-indigo-400">日本語</span> Daily
          </h1>
          <p className="text-gray-400 text-lg">일본어 학습 대시보드</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm text-gray-400">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📅</div>
              <div>학습 캘린더</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div>상세 통계</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🔍</div>
              <div>콘텐츠 검색</div>
            </div>
          </div>

          <div className="pt-4">
            <div id="telegram-login" className="flex justify-center" />
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                위젯이 작동하지 않으면 봇에서 <code className="text-indigo-400">/web</code> 명령을 보내세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
