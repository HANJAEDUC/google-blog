
"use client";

import { useEffect, useState } from 'react';
import styles from './prices.module.css';

interface PriceData {
    price: string;
    change: string;
}

interface Rates {
    eur_krw: PriceData;
}

export interface PriceItem {
    item: string;
    price: string;
    description: string;
    category: string;
    image?: string;
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

    const getConvertedPrice = (euroPrice: string) => {
        if (!rates || !rates.eur_krw.price) return '...';
        const rate = parseFloat(rates.eur_krw.price.replace(/,/g, ''));
        const price = parseFloat(euroPrice.replace(/,/g, ''));
        if (isNaN(rate) || isNaN(price)) return '...';

        return (price * rate).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Deutsche Preise</h1>
            </header>

            <div className={styles.mainStack}>
                {/* Big Exchange Rate Card */}
                <div className={styles.bigCard}>
                    <h2 className={styles.bigTitle}>
                        <span style={{ fontSize: '1.4em' }}>💶</span>
                        EUR ➔
                        <span style={{ fontSize: '1.4em' }}>🇰🇷</span> KRW
                    </h2>

                    {loading && !rates ? (
                        <div style={{ padding: '20px', opacity: 0.6 }}>Loading...</div>
                    ) : rates ? (
                        <>
                            <div className={styles.bigPriceContainer}>
                                <span className={styles.bigPrice}>{rates.eur_krw.price}</span>
                                <span className={styles.bigUnit}>원</span>
                            </div>
                            <div className={styles.bigChange}>
                                {rates.eur_krw.change}
                            </div>
                        </>
                    ) : (
                        <div>Unavailable</div>
                    )}
                </div>

                {/* Price Items List */}
                {initialItems.map((item, index) => (
                    <div key={index} className={styles.itemCard}>
                        {/* Index Indicator */}
                        <div className={styles.itemIndex}>
                            {index + 1} / {initialItems.length}
                        </div>

                        {/* Image Section (Now on Right due to flex-row-reverse in CSS) */}
                        {item.image && (
                            <div className={styles.itemImageContainer}>
                                <img
                                    src={item.image}
                                    alt={item.item}
                                    className={styles.itemImage}
                                    loading="lazy"
                                />
                            </div>
                        )}

                        {/* Card Content (On Left) */}
                        <div className={styles.itemContent}>
                            <div className={styles.itemHeader}>
                                <h3 className={styles.itemName}>{item.item}</h3>
                                {item.category && <span className={styles.itemCategory}>{item.category}</span>}
                            </div>

                            <div className={styles.priceRow}>
                                <span className={styles.itemPrice}>{item.price} €</span>
                                <span style={{ color: '#5f6368', fontSize: '1.2rem' }}>≈</span>
                                <span className={styles.convertedPrice}>{getConvertedPrice(item.price)} 원</span>
                            </div>

                            {item.description && (
                                <div className={styles.descriptionBox}>
                                    <p className={styles.itemDescription}>{item.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {initialItems.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No price data found in Sheet 2.</p>
                    </div>
                )}
            </div>

            <footer className={styles.footer}>
                <p>* Live exchange rate updates every 10 minutes</p>
            </footer>
        </div>
    );
}
