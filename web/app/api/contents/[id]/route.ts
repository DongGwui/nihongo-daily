import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getContentDetail } from '@/lib/queries/contents';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const data = await getContentDetail(parseInt(id, 10));
  if (!data) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(data);
}
