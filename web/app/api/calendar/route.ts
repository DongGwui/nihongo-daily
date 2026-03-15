import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getCalendarData } from '@/lib/queries/calendar';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const months = parseInt(request.nextUrl.searchParams.get('months') ?? '6', 10);
  const data = await getCalendarData(session.id, months);

  return NextResponse.json(data);
}
