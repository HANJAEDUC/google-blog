import Link from 'next/link';
import styles from './Navbar.module.css';
import { IoSearchOutline, IoApps } from 'react-icons/io5';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <div style={{ display: 'flex', alignItems: 'center', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#4285F4' }}>D</span>
            <span style={{ color: '#EA4335' }}>a</span>
            <span style={{ color: '#FBBC04' }}>i</span>
            <span style={{ color: '#4285F4' }}>l</span>
            <span style={{ color: '#34A853' }}>y</span>
          </div>
          <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 400, marginLeft: '5px' }}>words</span>
        </Link>

        <div className={styles.links}>
          <Link href="/words" className={styles.link}>Words</Link>
          <Link href="/products" className={styles.link}>Dialog</Link>
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
