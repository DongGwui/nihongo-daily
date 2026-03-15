import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: '📅' },
  { href: '/dashboard/stats', label: '통계', icon: '📊' },
  { href: '/dashboard/search', label: '검색', icon: '🔍' },
  { href: '/dashboard/level-test', label: '레벨 테스트', icon: '🎯' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/');

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <Link href="/dashboard" className="text-xl font-bold mb-8 px-2">
          <span className="text-indigo-400">日本語</span> Daily
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-800 pt-4 mt-4">
          <div className="px-3 text-sm text-gray-400">
            <div className="font-medium text-gray-200">{session.jlptLevel} 레벨</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
