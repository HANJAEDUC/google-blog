
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
    // Use TextDecoder to handle EUC-KR encoding used by Naver Finance
    const decoder = new TextDecoder('euc-kr');
    return decoder.decode(buffer);
}

export async function GET() {
    const results = {
        eur_krw: { price: '0', change: '0', rate: '0' },
        eur_usd: { price: '0', change: '0', rate: '0' }
    };

    try {
        // 1. EUR -> KRW (Domestic Exchange List)
        const htmlKRW = await fetchWithDecoding('https://finance.naver.com/marketindex/exchangeList.naver');
        const $krw = cheerio.load(htmlKRW);

        $krw('tr').each((_, el) => {
            const title = $krw(el).find('.tit').text().trim();
            // Search for 'EUR' or '유럽연합'
            if (title.toUpperCase().includes('EUR') || title.includes('유럽연합')) {
                results.eur_krw.price = $krw(el).find('.sale').text().trim();
                // Naver often puts blind text for 'Rise/Fall' + number
                results.eur_krw.change = $krw(el).find('.change').text().trim();
            }
        });

        // 2. EUR -> USD (International Market)
        const htmlUSD = await fetchWithDecoding('https://finance.naver.com/marketindex/worldExchangeList.naver?key=exchange&label=exchange');
        const $usd = cheerio.load(htmlUSD);

        $usd('tr').each((_, el) => {
            const title = $usd(el).find('.tit').text().trim();
            // Search for 'Euro to Dollar' or EUR/USD
            if ((title.includes('유로') && title.includes('달러')) || title.replace(/\s/g, '').includes('EUR/USD')) {
                results.eur_usd.price = $usd(el).find('.sale').text().trim();
                results.eur_usd.change = $usd(el).find('.point').text().trim() || $usd(el).find('.change').text().trim();
            }
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Exchange rate fetch error:', error);
        return NextResponse.json(results);
    }
}
