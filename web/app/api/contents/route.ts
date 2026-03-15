import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { searchContents } from '@/lib/queries/contents';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const data = await searchContents(session.id, {
    level: params.get('level') || undefined,
    type: params.get('type') || undefined,
    q: params.get('q') || undefined,
    page: parseInt(params.get('page') ?? '1', 10),
    limit: parseInt(params.get('limit') ?? '20', 10),
  });

  return NextResponse.json(data);
}
