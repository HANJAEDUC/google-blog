import { useState } from 'react';
import Link from 'next/link';
import styles from './aldi.module.css';
import { IoArrowBack } from 'react-icons/io5';

// Type definition for the product
interface AldiProduct {
  brand: string | null;
  title: string | null;
  price: string | null;
  originalPrice: string | null;
  imageUrl: string | null;
  link: string | null;
}

interface AldiData {
  offerPeriod: string;
  lastUpdated: string;
  products: AldiProduct[];
}

export default function AldiClientPage({ initialData }: { initialData: AldiData }) {
  const { offerPeriod, products } = initialData;
  const displayDate = offerPeriod || "Mo. 02.02. – Sa. 07.02.";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Aldi Süd Offers ({displayDate})</h1>
          <p style={{ color: '#666' }}>Crawler Results</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/prices" className={styles.backButton}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoArrowBack /> Back
            </span>
          </Link>
        </div>
      </header>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No products found. Please run the crawler script first.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((item, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.imageWrapper}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title || 'Product Image'}
                    className={styles.image}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    No Image
                  </div>
                )}
              </div>
              <div className={styles.content}>
                {item.brand && <div className={styles.brand}>{item.brand}</div>}
                <div className={styles.productTitle}>{item.title}</div>

                <div className={styles.priceContainer}>
                  <div className={styles.price}>{item.price}</div>
                  {item.originalPrice && (
                    <div className={styles.originalPrice}>{item.originalPrice}</div>
                  )}
                </div>

                {item.link && (
                  <a href={item.link} className={styles.linkButton}>
                    View on Aldi
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
