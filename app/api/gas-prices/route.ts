import { NextResponse } from 'next/server';

const API_KEY = 'f8b86ac2-0d3a-4a16-be41-32ac79e1448f';

export async function GET(request: Request) {
    const urlObj = new URL(request.url);
    const lat = urlObj.searchParams.get('lat');
    const lng = urlObj.searchParams.get('lng');
    const rad = urlObj.searchParams.get('rad') || '10';

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Lat and Lng are required' }, { status: 400 });
    }

    const apiUrl = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${rad}&sort=dist&type=all&apikey=${API_KEY}`;

    try {
        const res = await fetch(apiUrl, { next: { revalidate: 0 } }); // No cache for dynamic location lookups
        if (!res.ok) throw new Error('Failed to fetch from Tankerkönig');
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
