import { getSignsFromSheet } from '@/lib/signs-data';
import SignsClient from './SignsClient';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function GermanSignsPage() {
    const signs = await getSignsFromSheet();

    return <SignsClient initialSigns={signs} />;
}
