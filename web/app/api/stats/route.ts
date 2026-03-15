import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getStatsData } from '@/lib/queries/stats';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get('period') ?? 'week';
  const data = await getStatsData(session.id, period);

  return NextResponse.json(data);
}
