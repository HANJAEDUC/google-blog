"use client";

import { useEffect, useState } from 'react';
import styles from './prices.module.css';
import { Rates, PriceItem, GasStation } from '@/lib/data';

/* Client-side fetch removed in favor of SSR/ISR */

interface Props {
    initialItems: PriceItem[];
    initialRates: Rates;
}

export default function PricesClient({ initialItems, initialRates }: Props) {
    // State
    const [rates, setRates] = useState<Rates | null>(initialRates);
    const [rateLoading, setRateLoading] = useState(false);

    const [priceItems, setPriceItems] = useState<PriceItem[]>(initialItems);
    const [itemsLoading, setItemsLoading] = useState(false);

    // Fetch Exchange Rate (Client update loop only)
    const fetchRates = async () => {
        try {
            // setRateLoading(true); // Don't show loading on background update
            const res = await fetch('/api/exchange-rate');
            if (res.ok) {
                const data = await res.json();
                setRates(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            // setRateLoading(false);
        }
    };

    // Client refetch loop
    useEffect(() => {
        const rateInterval = setInterval(fetchRates, 5 * 60 * 1000); // 5 mins
        // Note: CSV refresh is now handled by revalidating the page (5 mins) or manual reload.
        // We removed client-side CSV fetching to rely on ISR cache consistency.

        return () => {
            clearInterval(rateInterval);
        };
    }, []);

    const getConvertedPrice = (euroPrice: string) => {
        if (!rates || !rates.eur_krw.price) return '...';
        const rate = parseFloat(rates.eur_krw.price.replace(/,/g, ''));
        const price = parseFloat(euroPrice.replace(/,/g, ''));
        if (isNaN(rate) || isNaN(price)) return '...';
        // Korean specific formatting
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
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg"
                            alt="EU"
                            style={{ width: '28px', height: 'auto', borderRadius: '4px' }}
                        />
                        EUR ➔
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg"
                            alt="KRW"
                            style={{ width: '28px', height: 'auto', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        KRW
                    </h2>

                    {rateLoading && !rates ? (
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

                    <div className={styles.bigCardFooter}>
                        <div>naver.com, tankerkoenig.de</div>
                        <div>Live updates every 5 minutes</div>
                    </div>
                </div>

                {/* Loading State for Items */}
                {itemsLoading && priceItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                        Loading prices...
                    </div>
                )}

                {/* Price Items List */}
                {priceItems.map((item, index) => (
                    <div key={index} className={styles.itemCard}>
                        {/* Index Indicator */}
                        <div className={styles.itemIndex}>
                            {index + 1} / {priceItems.length}
                        </div>

                        {/* Image Section (Right) */}
                        {item.image && (
                            <div className={styles.itemImageContainer}>
                                <img
                                    src={item.image}
                                    alt={item.item}
                                    className={styles.itemImage}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        )}

                        {/* Card Content (Left) */}
                        <div className={styles.itemContent}>
                            <div className={styles.itemHeader}>
                                <h3 className={styles.itemName}>{item.item}</h3>
                                {item.category && <span className={styles.itemCategory}>{item.category}</span>}
                            </div>

                            <div className={styles.priceRow}>
                                <span className={styles.itemPrice}>{item.price} €</span>
                                <span className={styles.convertedPrice}>{getConvertedPrice(item.price)} 원</span>
                            </div>

                            {item.description && (
                                <div className={styles.descriptionBox}>
                                    <p className={styles.itemDescription}>{item.description.replace(/\\n/g, '\n')}</p>
                                </div>
                            )}

                            {/* Logo Link */}
                            {item.site && item.link && (
                                <a href={item.site} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={item.link}
                                        alt="Store Link"
                                        className={styles.brandLogo}
                                    />
                                </a>
                            )}
                        </div>
                    </div>
                ))}

                {!itemsLoading && priceItems.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No price data found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
