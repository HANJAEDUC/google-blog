import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className="container">
      <div className={styles.hero}>
        <div className={styles.imageWrapper}>
          <Image
            src="/hero-vocab.png"
            alt="German Vocabulary Learning"
            width={500}
            height={500}
            className={styles.image}
            priority
          />
        </div>
      </div>
    </section>
  );
}
