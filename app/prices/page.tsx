import PricesClient, { PriceItem } from './PricesClient';
import Papa from 'papaparse';

const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '1278793502';

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_2}&single=true&output=csv`;

export const revalidate = 0;

function formatImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('drive.google.com')) {
        const idMatch = trimmed.match(/\/d\/(.+?)(\/|$)/);
        if (idMatch && idMatch[1]) {
            // Use thumbnail endpoint for better hotlinking reliability
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
        }
    }
    return trimmed;
}

function getSafeValue(row: any, ...keys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '' && row[key] !== null) return row[key];
        // Check for trimmed match
        const found = rowKeys.find(k => k.trim() === key);
        if (found && row[found]) return row[found];
    }
    return '';
}

export default async function PricesPage() {
    let items: PriceItem[] = [];

    try {
        const response = await fetch(CSV_URL);
        if (response.ok) {
            const csvText = await response.text();
            const parseResult = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            items = (parseResult.data as any[]).map(row => {
                let name = getSafeValue(row, '제목', '내용', 'item');
                let price = getSafeValue(row, 'GermanPrices', 'price') || '0';
                let rawImage = getSafeValue(row, '설명사진', '이미지', 'Image', 'image', '그림');

                // SMART FIX: If 'name' (Content column) looks like a URL, treat it as Image
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
                    // '링크' column is now the Logo Image
                    link: formatImageUrl(getSafeValue(row, '로고추가', '링크', 'link')),
                    // '사이트' column is the Target URL
                    site: getSafeValue(row, '로고사이트', '사이트', 'site') || undefined,
                };
            }).filter(i => {
                // Updated Filter: Allow if Price matches non-zero OR Name exists
                return (i.price && i.price !== '0' && i.price.trim() !== '') || (i.item && i.item !== '' && i.item !== 'Unknown');
            });
        }
    } catch (error) {
        console.error('Failed to fetch prices CSV:', error);
    }

    return <PricesClient initialItems={items} />;
}
