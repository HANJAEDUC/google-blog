
import PricesClient, { PriceItem } from './PricesClient';
import Papa from 'papaparse';

// TODO: USER must update this GID for the second sheet (GermanPrices)
// If you published the entire document, find the GID of the second sheet.
const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk'; // Same doc ID
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=YOUR_GID_HERE&single=true&output=csv`;

export const revalidate = 300; // 5 min cache

export default async function PricesPage() {
    let items: PriceItem[] = [];

    try {
        // We intentionally allow this to fail or return empty if GID is invalid, 
        // so the Client can still show the Exchange Rate header.
        // In a real scenario, you'd want to handle this better.
        // For now, I'll allow fetching ONLY IF the user updates the URL.
        // Since I don't know the GID, I will pass an empty list or mock data if fetch fails.

        // Attempt fetch (will likely fail 400 with invalid GID, or get Sheet 1 if I use gid=0)
        // Let's use gid=0 temporarily so the user can verify the structure with existing data (even if columns are wrong)
        // OR just pass empty array.

        // I'LL USE GID=0 for DEMO, but user must change it.
        const DEMO_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=0&single=true&output=csv`;

        const response = await fetch(DEMO_URL);
        if (response.ok) {
            const csvText = await response.text();
            const parseResult = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            // Map CSV rows to PriceItem
            // Assuming columns: Item (German), Price, Description (Korean)
            // Adjust these keys based on your actual Sheet 2 columns!
            items = (parseResult.data as any[]).map(row => ({
                item: row.german || row.item || 'Unknown',
                price: row.price || '0',
                description: row.korean || row.description || '',
                category: row.part || row.category || 'General' // reuse 'part' from words sheet as category for now?
            })).filter(i => i.item && i.item !== 'Unknown'); // Basic filter

            // Truncate for demo if using Sheet 1 data
            if (items.length > 50) items = items.slice(0, 50);
        }

    } catch (error) {
        console.error('Failed to fetch CSV:', error);
    }

    return <PricesClient initialItems={items} />;
}
