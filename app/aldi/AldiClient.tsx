'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './aldi.module.css';
import { IoArrowBack, IoRefresh } from 'react-icons/io5';

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
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateMessage('크롤링 중...');
    
    try {
      const response = await fetch('/api/crawl-aldi', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUpdateMessage('✅ 업데이트 완료! 페이지를 새로고침하세요.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUpdateMessage('❌ 업데이트 실패: ' + result.error);
      }
    } catch (error) {
      setUpdateMessage('❌ 오류 발생');
      console.error('Update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const { offerPeriod, products } = initialData;
  const displayDate = offerPeriod || "Mo. 02.02. – Sa. 07.02.";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Aldi Süd Offers ({displayDate})</h1>
          <p style={{ color: '#666' }}>Crawler Results</p>
          {updateMessage && (
            <p style={{ 
              marginTop: '10px', 
              padding: '8px 12px', 
              backgroundColor: updateMessage.includes('✅') ? '#d4edda' : '#f8d7da',
              color: updateMessage.includes('✅') ? '#155724' : '#721c24',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              {updateMessage}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleUpdate}
            disabled={updating}
            className={styles.updateButton}
          >
            <IoRefresh className={updating ? styles.spinning : ''} />
            {updating ? '업데이트 중...' : '지금 업데이트'}
          </button>
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
