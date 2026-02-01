
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const revalidate = 0;

async function fetchWithDecoding(url: string) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('euc-kr');
    return decoder.decode(buffer);
}

export async function GET() {
    const results = {
        eur_krw: { price: '0', change: '0' }
    };

    try {
        // 1. EUR -> KRW Only
        const htmlKRW = await fetchWithDecoding('https://finance.naver.com/marketindex/exchangeList.naver');
        const $krw = cheerio.load(htmlKRW);

        $krw('tr').each((_, el) => {
            const title = $krw(el).find('.tit').text().trim();
            if (title.toUpperCase().includes('EUR') || title.includes('유럽연합')) {
                results.eur_krw.price = $krw(el).find('.sale').text().trim();
                results.eur_krw.change = $krw(el).find('.change').text().trim();
            }
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Exchange rate fetch error:', error);
        return NextResponse.json(results);
    }
}
