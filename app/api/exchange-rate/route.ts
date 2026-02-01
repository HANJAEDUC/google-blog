
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const revalidate = 0; // Don't cache

export async function GET() {
    try {
        const response = await fetch('https://finance.naver.com/marketindex/exchangeList.naver', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        const results = {
            eur_krw: { price: '0', change: '0', rate: '0' },
            eur_usd: { price: '0', change: '0', rate: '0' }
        };

        // Parse list items
        $('tr').each((i, el) => {
            const title = $(el).find('.tit').text().trim();

            if (title.includes('유럽연합 EUR')) {
                results.eur_krw = {
                    price: $(el).find('.sale').text().trim(),
                    change: $(el).find('.change').text().trim(), // fluctuations not directly available in class, just text
                    rate: ''
                };
            }

            // EUR/USD might be int 'worldExchangeList' URL, let's check marketindex main page for better data if needed
            // But actually, finance.naver.com/marketindex/ has a compact list.
        });

        // Let's try parsing the main marketindex page which is better structured
        const mainResponse = await fetch('https://finance.naver.com/marketindex/');
        const mainHtml = await mainResponse.text();
        const $main = cheerio.load(mainHtml);

        // 1. EUR / KRW
        // The data is usually in a list with ids
        /*
          EUR/KRW is usually accessed via direct script values or specific elements.
          Let's look for the specific iframe or list.
        */

        // Easier approach: Use the mobile site or specific JSON api if possible, but scraping HTML is standard for Naver.
        // Let's rely on the exchangeList.naver page for EUR/KRW.

        // For EUR/USD, it's in the 'International Market' section.
        // Let's try a different source for EUR/USD if Naver is tricky, OR parse the world exchange list.

        const worldResponse = await fetch('https://finance.naver.com/marketindex/worldExchangeList.naver?key=exchange&label=exchange');
        const worldHtml = await worldResponse.text();
        const $world = cheerio.load(worldHtml);

        $world('tr').each((i, el) => {
            const title = $world(el).find('.tit').text().trim();
            if (title.includes('유로/달러') || title.toUpperCase().includes('EUR/USD') || title.includes('EURUSD')) {
                results.eur_usd = {
                    price: $world(el).find('.sale').text().trim(),
                    change: $world(el).find('.point').text().trim(),
                    rate: ''
                };
            }
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Exchange rate fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
    }
}
