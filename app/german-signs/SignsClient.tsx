"use client";

import { useState } from 'react';
import styles from '../prices/prices.module.css';
import { SignItem } from '@/lib/signs-data';

interface Props {
    initialSigns: SignItem[];
}

export default function SignsClient({ initialSigns }: Props) {
    const [signs] = useState<SignItem[]>(initialSigns);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Deutsche Verkehrszeichen</h1>
            </header>

            <div className={styles.mainStack}>
                {signs.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Keine Verkehrszeichen gefunden.</p>
                    </div>
                ) : (
                    signs.map((sign, index) => (
                        <div key={index} className={styles.itemCard}>
                            {/* Index */}
                            <div className={styles.itemIndex}>
                                {index + 1} / {signs.length}
                            </div>

                            {/* Description Image (Right Side) */}
                            {sign.descImage && (
                                <div className={styles.itemImageContainer}>
                                    <img
                                        src={sign.descImage}
                                        alt={sign.title}
                                        className={styles.itemImage}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div className={styles.itemContent}>
                                <div className={styles.itemHeader}>
                                    <h3 className={styles.itemName}>{sign.title}</h3>
                                </div>

                                {sign.germanSign && (
                                    <div className={styles.priceRow}>
                                        <span className={styles.itemPrice}>{sign.germanSign}</span>
                                    </div>
                                )}

                                {sign.description && (
                                    <div className={styles.descriptionBox}>
                                        <p className={styles.itemDescription}>
                                            {sign.description.replace(/\\n/g, '\n')}
                                        </p>
                                    </div>
                                )}

                                {/* Logo */}
                                {sign.logo && sign.logoSite && (
                                    <a href={sign.logoSite} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={sign.logo}
                                            alt="Source Link"
                                            className={styles.brandLogo}
                                        />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
