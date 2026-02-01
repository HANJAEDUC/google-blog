
import PricesClient, { PriceItem } from './PricesClient';
import Papa from 'papaparse';

// GID for Sheet 2 provided by user
const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '1278793502';

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_2}&single=true&output=csv`;

export const revalidate = 300;

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

            // Mapping based on User Screenshot (Sheet 2)
            // Col A: GermanPrices (Price)
            // Col B: 내용 (Item)
            items = (parseResult.data as any[]).map(row => ({
                // Try '내용' (Korean header) first, fallback to 'item'
                item: row['내용'] || row.item || 'Unknown',
                // Try 'GermanPrices' header, fallback to 'price'
                price: row['GermanPrices'] || row.price || '0',
                description: '',
                category: 'Living Cost'
            })).filter(i => i.item && i.item !== 'Unknown' && i.price !== '0');
        }
    } catch (error) {
        console.error('Failed to fetch prices CSV:', error);
    }

    return <PricesClient initialItems={items} />;
}
