import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        KOSPI_KODEX: process.env.KOSPI_KODEX || 'NOT_SET',
        KOSPI_KOSDAQ: process.env.KOSPI_KOSDAQ || 'NOT_SET',
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV,
    });
}
