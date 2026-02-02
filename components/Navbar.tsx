"use client";

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { IoChevronBack, IoChevronForward, IoMailOutline } from 'react-icons/io5';
import DualClock from './DualClock';

export default function Navbar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      // Small buffer to account for rounding
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav className={styles.navbar}>
      {canScrollLeft && (
        <button
          className={`${styles.navArrow} ${styles.leftArrow}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <IoChevronBack size={20} />
        </button>
      )}

      {/* Scrollable Container */}
      <div className={styles.scrollContainer} ref={scrollRef} onScroll={checkScroll}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo}>
            <div style={{ display: 'flex', alignItems: 'center', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#4285F4' }}>D</span>
              <span style={{ color: '#EA4335' }}>a</span>
              <span style={{ color: '#FBBC04' }}>i</span>
              <span style={{ color: '#4285F4' }}>l</span>
              <span style={{ color: '#34A853' }}>y</span>
            </div>
            <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 400, marginLeft: '0px', letterSpacing: '-0.5px' }}>words</span>
          </Link>

          <div className={styles.links}>
            <a
              href="mailto:hanjaeduc@gmail.com?subject=Daily Words Feedback"
              className={styles.iconLink}
              aria-label="Send Feedback"
            >
              <IoMailOutline size={22} />
            </a>
            <Link href="/words" className={styles.link}>GermanWords</Link>
            <Link href="/japanese" className={styles.link}>JapaneseWords</Link>
            <Link href="/prices" className={styles.link}>GermanPrices</Link>
            <DualClock />
          </div>
        </div>
      </div>

      {canScrollRight && (
        <button
          className={`${styles.navArrow} ${styles.rightArrow}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <IoChevronForward size={20} />
        </button>
      )}
    </nav>
  );
}
