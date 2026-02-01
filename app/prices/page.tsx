
import PricesClient, { PriceItem } from './PricesClient';
import Papa from 'papaparse';

const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '1278793502'; // Verified GID

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_2}&single=true&output=csv`;

export const revalidate = 300;

// Helper to convert Google Drive sharing links to direct image links
function formatImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    // Handle Google Drive links
    if (trimmed.includes('drive.google.com')) {
        // Match ID between /d/ and /
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

            items = (parseResult.data as any[]).map(row => ({
                item: row['내용'] || row.item || 'Unknown',
                price: row['GermanPrices'] || row.price || '0',
                description: row['설명'] || row.description || '', // Added '설명' just in case
                category: row['카테고리'] || row.category || '',
                // Check multiple possible headers for image
                image: formatImageUrl(row['이미지'] || row['Image'] || row['image'] || row['그림'])
            })).filter(i => i.item && i.item !== 'Unknown' && i.price !== '0');
        }
    } catch (error) {
        console.error('Failed to fetch prices CSV:', error);
    }

    return <PricesClient initialItems={items} />;
}
