
import PricesClient, { PriceItem } from './PricesClient';
import Papa from 'papaparse';

// TODO: USER PLEASE UPDATE THIS GID FOR SHEET 2
// Usually the URL looks like: .../pub?gid=12345678...
// You provided the Doc ID, now we need to point to Sheet 2.
// Assuming user will configure this.
const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '0'; // Change this to the GID of Sheet 2!

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

            // Use generic column mapping or specific to Sheet 2
            // Assumption: Sheet 2 has 'Item', 'Price', 'Description', 'Category'
            items = (parseResult.data as any[]).map(row => ({
                item: row.item || row.german || row.name || 'Unknown',
                price: row.price || '0',
                description: row.description || row.korean || '',
                category: row.category || row.part || 'Misc'
            })).filter(i => i.item && i.item !== 'Unknown' && i.price !== '0');
        }
    } catch (error) {
        console.error('Failed to fetch prices CSV:', error);
    }

    return <PricesClient initialItems={items} />;
}
