import PricesClient from './PricesClient';
import { getPricesFromSheet, getExchangeRate, getGasPrices } from '@/lib/data';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function PricesPage() {
    const gasStations = await getGasPrices();
    const prices = await getPricesFromSheet(gasStations);
    const rates = await getExchangeRate();
    const serverTimestamp = new Date().toISOString();

    return <PricesClient initialItems={prices} initialRates={rates} serverTimestamp={serverTimestamp} />;
}
