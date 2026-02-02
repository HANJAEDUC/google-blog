"use client";

import { useEffect, useState } from 'react';
import styles from './prices.module.css';
import Papa from 'papaparse';

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
    link?: string; // Logo Image
    site?: string; // Target Link
}

/* Constants for Client-side fetching */
const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_2 = '1278793502';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_2}&single=true&output=csv`;

function formatImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('drive.google.com')) {
        const idMatch = trimmed.match(/\/d\/(.+?)(\/|$)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
        }
    }
    return trimmed;
}

function getSafeValue(row: any, ...keys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '' && row[key] !== null) return row[key];
        const found = rowKeys.find(k => k.trim() === key);
        if (found && row[found]) return row[found];
    }
    return '';
}

export default function PricesClient() {
    // State
    const [rates, setRates] = useState<Rates | null>(null);
    const [rateLoading, setRateLoading] = useState(true);
    
    const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);

    // Fetch Exchange Rate
    const fetchRates = async () => {
        try {
            setRateLoading(true);
            const res = await fetch('/api/exchange-rate');
            if (res.ok) {
                const data = await res.json();
                setRates(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRateLoading(false);
        }
    };

    // Fetch CSV Data (Client Side)
    const fetchCsvData = async () => {
        try {
            setItemsLoading(true);
            const response = await fetch(CSV_URL);
            if (response.ok) {
                const csvText = await response.text();
                const parseResult = Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                });

                const items = (parseResult.data as any[]).map(row => {
                    let name = getSafeValue(row, '제목', '내용', 'item');
                    let price = getSafeValue(row, 'GermanPrices', 'price') || '0';
                    let rawImage = getSafeValue(row, '설명사진', '이미지', 'Image', 'image', '그림');

                    // If 'name' looks like URL, treat as Image
                    if (name.trim().startsWith('http')) {
                        if (!rawImage) rawImage = name;
                        name = ''; 
                    }

                    return {
                        item: name,
                        price: price,
                        description: getSafeValue(row, '설명', 'description'),
                        category: getSafeValue(row, '카테고리', 'category'),
                        image: formatImageUrl(rawImage),
                        link: formatImageUrl(getSafeValue(row, '로고추가', '링크', 'link')),
                        site: getSafeValue(row, '로고사이트', '사이트', 'site') || undefined,
                    };
                }).filter(i => {
                    return (i.price && i.price !== '0' && i.price.trim() !== '') || (i.item && i.item !== '' && i.item !== 'Unknown');
                });
                
                setPriceItems(items);
            }
        } catch (error) {
            console.error("Failed to fetch CSV", error);
        } finally {
            setItemsLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
        fetchCsvData();

        const rateInterval = setInterval(fetchRates, 10 * 60 * 1000); // 10 mins
        // CSV refresh every 5 min
        const csvInterval = setInterval(fetchCsvData, 5 * 60 * 1000); 

        return () => {
            clearInterval(rateInterval);
            clearInterval(csvInterval);
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
                        <div>naver.com</div>
                        <div>Live exchange rate updates every 10 minutes</div>
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
