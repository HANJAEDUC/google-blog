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
          <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 400, marginLeft: '0px', letterSpacing: '-0.5px' }}>words</span>
        </Link>

        <div className={styles.links}>
          <Link href="/words" className={styles.link}>GermanWord</Link>
          <Link href="/japanese" className={styles.link}>JapaneseWords</Link>
        </div>
      </div>
    </nav>
  );
}
