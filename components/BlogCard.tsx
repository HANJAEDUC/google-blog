import Image from 'next/image';
import Link from 'next/link';
import styles from './BlogCard.module.css';

interface BlogCardProps {
  title: string;
  summary: string;
  category: string;
  image: string;
  date: string;
  slug: string;
  readTime?: string;
}

export default function BlogCard({ title, summary, category, image, date, slug, readTime }: BlogCardProps) {
  return (
    <Link href={`/posts/${slug}`} className={styles.card}>
      <div className={styles.imageContainer}>
         <Image 
           src={image} 
           alt={title} 
           fill 
           className={styles.image}
           sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
         />
      </div>
      <div className={styles.content}>
        <span className={styles.category}>{category}</span>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.summary}>{summary}</p>
        <div className={styles.meta}>
          <span>{date}</span>
          {readTime && <span>{readTime}</span>}
        </div>
      </div>
    </Link>
  );
}
