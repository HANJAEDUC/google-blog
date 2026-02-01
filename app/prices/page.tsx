
import PricesClient from './PricesClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'German Prices - Daily Words',
    description: 'Real-time Euro exchange rates (EUR/KRW, EUR/USD).',
};

export default function PricesPage() {
    return <PricesClient />;
}
