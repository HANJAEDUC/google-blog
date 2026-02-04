import fs from 'fs';
import path from 'path';
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

export const revalidate = 60; // Revalidate every minute? Or just static is fine.

export default async function AldiPage() {
  let products: AldiProduct[] = [];
  
  try {
    const filePath = path.join(process.cwd(), 'scripts', 'aldi_offers.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      products = JSON.parse(fileContent);
    }
  } catch (error) {
    console.error("Error reading Aldi data:", error);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Aldi Süd Offers</h1>
          <p style={{ color: '#666' }}>Crawler Results</p>
        </div>
        <Link href="/prices" className={styles.backButton}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IoArrowBack /> Back
          </span>
        </Link>
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
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
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
