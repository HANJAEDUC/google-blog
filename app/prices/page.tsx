import PricesClient from './PricesClient';
import { getPricesFromSheet, getExchangeRate, getGasPrices } from '@/lib/data';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function PricesPage() {
    const prices = await getPricesFromSheet();
    const rates = await getExchangeRate();
    const gasStations = await getGasPrices();

    return <PricesClient initialItems={prices} initialRates={rates} initialGasStations={gasStations} />;
}
