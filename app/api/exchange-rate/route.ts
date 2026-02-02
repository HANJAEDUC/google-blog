import { NextResponse } from 'next/server';
import { getExchangeRate } from '@/lib/data';

export const revalidate = 0;

export async function GET() {
    const results = await getExchangeRate();
    return NextResponse.json(results);
}
