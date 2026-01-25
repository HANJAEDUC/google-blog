import Link from 'next/link';
import styles from './Navbar.module.css';
import { IoSearchOutline, IoApps } from 'react-icons/io5';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <div style={{ display: 'flex', alignItems: 'center', letterSpacing: '-1px' }}>
            <span style={{ color: '#4285F4' }}>G</span>
            <span style={{ color: '#EA4335' }}>o</span>
            <span style={{ color: '#FBBC04' }}>o</span>
            <span style={{ color: '#4285F4' }}>g</span>
            <span style={{ color: '#34A853' }}>l</span>
            <span style={{ color: '#EA4335' }}>e</span>
          </div>
          <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 400 }}>Blog</span>
        </Link>
        
        <div className={styles.links}>
          <Link href="/words" className={styles.link}>Words</Link>
          <Link href="/products" className={styles.link}>Dialog</Link>
          <Link href="/technology" className={styles.link}>Technology</Link>
          <Link href="/culture" className={styles.link}>Culture</Link>
        </div>
        
        <div className={styles.actions}>
          <button className="btn btn-tonal" style={{ width: 48, padding: 0 }}>
            <IoSearchOutline size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
}
