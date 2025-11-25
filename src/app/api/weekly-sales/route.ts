import { NextResponse } from 'next/server';
import { getWeeklySales } from '@/lib/actions';
import { DEFAULT_TZ } from '@/config/timezone';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
    const month = Number(url.searchParams.get('month')) || (new Date().getMonth() + 1);
    const tz = url.searchParams.get('tz') || DEFAULT_TZ;

    const data = await getWeeklySales(year, month, tz);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
