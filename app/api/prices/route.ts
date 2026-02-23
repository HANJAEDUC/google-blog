import { NextResponse } from 'next/server';
import { getPricesFromSheet, getGasPrices } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const gasStations = await getGasPrices();
        const prices = await getPricesFromSheet(gasStations);
        return NextResponse.json(prices);
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
    }
}
