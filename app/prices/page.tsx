
import PricesClient, { PriceItem } from './PricesClient';
import Papa from 'papaparse';

const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '1278793502';

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_2}&single=true&output=csv`;

export const revalidate = 300;

function formatImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('drive.google.com')) {
        const idMatch = trimmed.match(/\/d\/(.+?)(\/|$)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
        }
    }
    return trimmed;
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
                let name = row['내용'] || row.item || '';
                let price = row['GermanPrices'] || row.price || '0';
                // Try to find image in standard columns OR '그림' column
                let rawImage = row['이미지'] || row['Image'] || row['image'] || row['그림'] || '';

                // SMART FIX: If 'name' (Content column) looks like a URL, treat it as Image
                // This handles the user case where link was put in Content column
                if (name.trim().startsWith('http')) {
                    if (!rawImage) rawImage = name;
                    name = ''; // Clear name since it was a link
                }

                return {
                    item: name,
                    price: price,
                    description: row['설명'] || row.description || '',
                    // Default category to empty as requested
                    category: row['카테고리'] || row.category || '',
                    image: formatImageUrl(rawImage),
                };
            }).filter(i => {
                // Updated Filter: Allow if Price matches non-zero OR Name exists
                // This allows entry with just Price (e.g. 025(pfand)) to show up
                return (i.price && i.price !== '0' && i.price.trim() !== '') || (i.item && i.item !== '' && i.item !== 'Unknown');
            });
        }
    } catch (error) {
        console.error('Failed to fetch prices CSV:', error);
    }

    return <PricesClient initialItems={items} />;
}
