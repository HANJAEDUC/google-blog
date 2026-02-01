
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

export default function PricesClient() {
    const [rates, setRates] = useState<Rates | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/exchange-rate');
            if (res.ok) {
                const data = await res.json();
                setRates(data);
                setLastUpdated(new Date());
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

    const formatPrice = (price: string) => {
        return price; // Already formatted by Naver usually
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>German Prices</h1>
                <p className={styles.subtitle}>Exchange Rates (EUR)</p>
                {lastUpdated && (
                    <p style={{ fontSize: '0.8rem', color: '#9aa0a6', marginTop: '10px' }}>
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}
            </header>

            <div className={styles.grid}>
                {loading && !rates ? (
                    <div className={styles.card} style={{ textAlign: 'center', opacity: 0.7 }}>
                        <h2>Loading rates...</h2>
                    </div>
                ) : rates ? (
                    <>
                        {/* EUR -> KRW */}
                        <div className={styles.card} data-type="KRW">
                            <h2 className={styles.currencyTitle}>
                                <span style={{ fontSize: '1.5em', marginRight: '8px' }}>💶</span>
                                EUR ➔ <span style={{ fontSize: '1.5em', marginLeft: '8px' }}>🇰🇷</span> KRW
                            </h2>
                            <div className={styles.priceContainer}>
                                <span className={styles.price}>{rates.eur_krw.price}</span>
                                <span className={styles.unit}>원</span>
                            </div>
                            <p className={styles.change}>{rates.eur_krw.change} (오늘 변동)</p>
                        </div>

                        {/* EUR -> USD */}
                        <div className={styles.card} data-type="USD">
                            <h2 className={styles.currencyTitle}>
                                <span style={{ fontSize: '1.5em', marginRight: '8px' }}>💶</span>
                                EUR ➔ <span style={{ fontSize: '1.5em', marginLeft: '8px' }}>🇺🇸</span> USD
                            </h2>
                            <div className={styles.priceContainer}>
                                <span className={styles.price}>{rates.eur_usd.price}</span>
                                <span className={styles.unit}>$</span>
                            </div>
                            <p className={styles.change}>{rates.eur_usd.change} (Today)</p>
                        </div>
                    </>
                ) : (
                    <div className={styles.card}>
                        <p>Failed to load data.</p>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px', color: '#5f6368', fontSize: '0.8rem' }}>
                <p>* Live data from Naver Finance</p>
                <p>* Updates every 10 minutes</p>
            </div>
        </div>
    );
}
