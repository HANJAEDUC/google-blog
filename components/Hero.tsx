"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
  const [currentImage, setCurrentImage] = useState('german');

  useEffect(() => {
    // Toggle image every 8 seconds
    const interval = setInterval(() => {
      setCurrentImage(prev => prev === 'german' ? 'japanese' : 'german');
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="container">
      <div className={styles.hero}>
        <div className={styles.imageWrapper} style={{ position: 'relative', width: 500, height: 500 }}>
          {/* German Image */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              opacity: currentImage === 'german' ? 1 : 0,
              transition: 'opacity 2s ease-in-out'
            }}
          >
            <Image
              src="/hero-vocab.png"
              alt="German Vocabulary"
              width={500}
              height={500}
              className={styles.image}
              priority
            />
          </div>

          {/* Japanese Image */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              opacity: currentImage === 'japanese' ? 1 : 0,
              transition: 'opacity 2s ease-in-out'
            }}
          >
            <Image
              src="/hero-japanese.png"
              alt="Japanese Vocabulary"
              width={500}
              height={500}
              className={styles.image} // Reusing same class
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
