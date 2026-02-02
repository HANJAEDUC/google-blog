import styles from './prices.module.css';

export default function Loading() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                {/* Title Skeleton */}
                <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            </header>

            <div className={styles.mainStack}>
                {/* Big Exchange Rate Card Skeleton */}
                <div className={`${styles.bigCard} ${styles.skeletonBigCard}`}>
                    <div className={styles.bigTitle} style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }}>
                        <div className={styles.skeleton} style={{ width: '150px', height: '32px' }} />
                    </div>
                    <div className={styles.bigPriceContainer} style={{ opacity: 0.5 }}>
                        <div className={styles.skeleton} style={{ width: '200px', height: '64px' }} />
                    </div>
                    <div className={styles.skeleton} style={{ width: '100px', height: '28px', marginTop: '16px', borderRadius: '99px' }} />
                </div>

                {/* Price Items List Skeleton (Show 3 placeholder items) */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`${styles.itemCard} ${styles.skeletonItem}`}>
                        {/* Fake Content Left */}
                        <div className={styles.itemContent}>
                            <div className={styles.itemHeader}>
                                <div className={styles.skeleton} style={{ width: '60%', height: '32px' }} />
                            </div>
                            <div className={styles.priceRow}>
                                <div className={styles.skeleton} style={{ width: '40%', height: '24px', marginBottom: '8px' }} />
                                <div className={styles.skeleton} style={{ width: '30%', height: '24px' }} />
                            </div>
                            <div className={styles.skeleton} style={{ width: '100%', height: '40px', marginTop: '16px' }} />
                        </div>

                        {/* Fake Image Right */}
                        <div className={styles.itemImageContainer} style={{ width: '250px', background: 'transparent' }}>
                            <div className={styles.skeleton} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
