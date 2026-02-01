
"use client";

import { useEffect, useState } from 'react';
import styles from './prices.module.css';

interface PriceData {
    price: string;
    change: string;
    rate: string;
}

interface Rates {
    eur_krw: PriceData;
    eur_usd: PriceData;
}

export interface PriceItem {
    item: string;
    price: string;
    description: string;
    category: string;
}

interface Props {
    initialItems: PriceItem[];
}

export default function PricesClient({ initialItems }: Props) {
    const [rates, setRates] = useState<Rates | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/exchange-rate');
            if (res.ok) {
                const data = await res.json();
                setRates(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
        const interval = setInterval(fetchRates, 10 * 60 * 1000); // 10 minutes
        return () => clearInterval(interval);
    }, []);

    // Calculate converted Price
    const getConvertedPrice = (euroPrice: string) => {
        if (!rates || !rates.eur_krw.price) return '...';
        // Clean strings: '1,719.50' -> 1719.50
        const rate = parseFloat(rates.eur_krw.price.replace(/,/g, ''));
        const price = parseFloat(euroPrice.replace(/,/g, ''));
        if (isNaN(rate) || isNaN(price)) return '...';

        const krw = price * rate;
        // Format: 12,345
        return krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>German Prices</h1>
                <p className={styles.subtitle}>Living Costs in Germany</p>

                {/* Exchange Rate Banner */}
                <div className={styles.rateBanner}>
                    {loading && !rates ? (
                        <span>Loading Exchange Rate...</span>
                    ) : rates ? (
                        <div className={styles.rateContent}>
                            <span className={styles.rateLabel}>Current Exchange Rate:</span>
                            <div className={styles.rateGroup}>
                                <strong className={styles.rateValue}>1 EUR = {rates.eur_krw.price} KRW</strong>
                                <span className={styles.rateChange}>({rates.eur_krw.change})</span>
                            </div>
                        </div>
                    ) : (
                        <span>Exchange Rate Unavailable</span>
                    )}
                </div>
            </header>

            {/* Price Items Grid */}
            <div className={styles.itemGrid}>
                {initialItems.map((item, index) => (
                    <div key={index} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                            <h3 className={styles.itemName}>{item.item}</h3>
                            <span className={styles.itemCategory}>{item.category}</span>
                        </div>
                        <div className={styles.priceRow}>
                            <span className={styles.itemPrice}>{item.price} €</span>
                            <span className={styles.convertedPrice}>≈ {getConvertedPrice(item.price)} 원</span>
                        </div>
                        <p className={styles.itemDescription}>{item.description}</p>
                    </div>
                ))}
            </div>

            {initialItems.length === 0 && (
                <div className={styles.emptyState}>
                    <p>No price data found.</p>
                    <p style={{ fontSize: '0.8em', marginTop: '8px' }}>Please update the Google Sheet GID in code.</p>
                </div>
            )}

            <footer className={styles.footer}>
                <p>* Exchange rate updates every 10 minutes via Naver Finance</p>
            </footer>
        </div>
    );
}
