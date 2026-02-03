import * as cheerio from 'cheerio';
import Papa from 'papaparse';

/* Constants */
const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '1278793502';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_2}&single=true&output=csv`;

/* Types */
export interface PriceData {
    price: string;
    change: string;
}

export interface Rates {
    eur_krw: PriceData;
}

export interface PriceItem {
    item: string;
    price: string;
    description: string;
    category: string;
    image?: string;
    link?: string; // Logo Image
    site?: string; // Target Link
}

/* Helper Functions */
function formatImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('drive.google.com')) {
        const idMatch = trimmed.match(/\/d\/(.+?)(\/|$)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
        }
    }
    return trimmed;
}

function getSafeValue(row: any, ...keys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '' && row[key] !== null) return row[key];
        const found = rowKeys.find(k => k.trim() === key);
        if (found && row[found]) return row[found];
    }
    return '';
}

async function fetchWithDecoding(url: string) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        next: { revalidate: 300 } // Cache for 5 minutes
    });
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('euc-kr');
    return decoder.decode(buffer);
}

/* Data Fetching Functions */
export async function getExchangeRate(): Promise<Rates> {
    const results = {
        eur_krw: { price: '0', change: '0' }
    };

    try {
        const htmlKRW = await fetchWithDecoding('https://finance.naver.com/marketindex/exchangeList.naver');
        const $krw = cheerio.load(htmlKRW);

        $krw('tr').each((_, el) => {
            const title = $krw(el).find('.tit').text().trim();
            if (title.toUpperCase().includes('EUR') || title.includes('유럽연합')) {
                results.eur_krw.price = $krw(el).find('.sale').text().trim();
                results.eur_krw.change = $krw(el).find('.change').text().trim();
            }
        });
    } catch (error) {
        console.error('Exchange rate fetch error:', error);
    }

    return results;
}

export async function getPricesFromSheet(): Promise<PriceItem[]> {
    try {
        const response = await fetch(CSV_URL, { next: { revalidate: 300 } }); // Cache for 5 minutes
        if (!response.ok) return [];

        const csvText = await response.text();
        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        const items = (parseResult.data as any[]).map(row => {
            let name = getSafeValue(row, '제목', '내용', 'item');
            let price = getSafeValue(row, 'GermanPrices', 'price') || '0';
            let rawImage = getSafeValue(row, '설명사진', '이미지', 'Image', 'image', '그림');

            // If 'name' looks like URL, treat as Image
            if (name.trim().startsWith('http')) {
                if (!rawImage) rawImage = name;
                name = '';
            }

            return {
                item: name,
                price: price,
                description: getSafeValue(row, '설명', 'description'),
                category: getSafeValue(row, '카테고리', 'category'),
                image: formatImageUrl(rawImage),
                link: formatImageUrl(getSafeValue(row, '로고추가', '링크', 'link')),
                site: getSafeValue(row, '로고사이트', '사이트', 'site') || undefined,
            };
        }).filter(i => {
            return (i.price && i.price !== '0' && i.price.trim() !== '') || (i.item && i.item !== '' && i.item !== 'Unknown');
        });

        return items;
    } catch (error) {
        console.error("Failed to fetch CSV", error);
        return [];
    }
}
export interface GasStation {
    id: string;
    name: string;
    brand: string;
    street: string;
    place: string;
    lat: number;
    lng: number;
    dist: number;
    diesel: number;
    e5: number;
    e10: number;
    isOpen: boolean;
}

export async function getGasPrices(): Promise<GasStation[]> {
    const API_KEY = 'f8b86ac2-0d3a-4a16-be41-32ac79e1448f';
    const LAT = 52.521;
    const LNG = 13.438;
    const RAD = 5;
    const URL = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${LAT}&lng=${LNG}&rad=${RAD}&sort=dist&type=all&apikey=${API_KEY}`;

    try {
        const res = await fetch(URL, { next: { revalidate: 300 } }); // Cache for 5 minutes
        if (!res.ok) return [];
        const data = await res.json();
        if (data.ok && data.stations) {
            return data.stations;
        }
        return [];
    } catch (error) {
        console.error('Gas prices fetch error:', error);
        return [];
    }
}
