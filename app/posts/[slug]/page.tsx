import Image from 'next/image';
import Link from 'next/link';

// This would normally fetch data based on slug.
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Simple logic to pick an image based on slug keywords, fallback to gemini
  let imageSrc = "/gemini.png";
  if (slug.includes("android")) imageSrc = "/android.png";
  if (slug.includes("search")) imageSrc = "/search.png";

  return (
    <article className="container" style={{ maxWidth: 840, padding: '60px 24px 120px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 40, color: 'var(--md-sys-color-primary)', fontWeight: 500 }}>
        ← Back to all stories
      </Link>

      <span style={{ display: 'block', color: 'var(--md-sys-color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
        {slug.includes('android') ? 'Product' : slug.includes('search') ? 'Company' : 'Technology'}
      </span>
      
      <h1 className="display-large" style={{ marginTop: 0, marginBottom: 32, fontWeight: 500 }}>
        {slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </h1>
      
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E3E3E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>G</div>
        <div>
           <div style={{ fontWeight: 600 }}>Google Team</div>
           <div style={{ fontSize: 14, color: 'var(--md-sys-color-on-surface-variant)' }}>Published on Dec 6, 2023</div>
        </div>
      </div>
      
      <div style={{ position: 'relative', width: '100%', height: 450, borderRadius: 'var(--border-radius-xl)', overflow: 'hidden', marginBottom: 64, boxShadow: 'var(--elevation-1)' }}>
         <Image 
           src={imageSrc}
           alt="Cover"
           fill
           style={{ objectFit: 'cover' }}
           priority
         />
      </div>
      
      <div className="body-large" style={{ color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.8 }}>
        <p style={{ marginBottom: 24, fontSize: 20, lineHeight: 1.6 }}>
            This is a placeholder for the blog post content. In a real application, this content would be fetched from a CMS (like Sanity, Contentful) or markdown files based on the slug: <strong>{slug}</strong>.
        </p>
        <p style={{ marginBottom: 24 }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
        </p>
        <h3 className="headline-large" style={{ fontSize: 28, marginTop: 48, marginBottom: 24 }}>Looking ahead</h3>
        <p style={{ marginBottom: 24 }}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
        <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
        </p>
      </div>
    </article>
  );
}
