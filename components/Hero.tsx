import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className="container">
      <div className={styles.hero}>
        <div className={styles.imageWrapper}>
          <Image 
            src="/hero.png" 
            alt="Google Abstract Visualization" 
            width={800} 
            height={800} 
            className={styles.image}
            priority
          />
        </div>
      </div>
    </section>
  );
}
