"use client";

import { useState } from 'react';
import styles from './english-sentence.module.css';
import { SentenceItem } from '@/lib/english-data';
import { IoSearchOutline, IoCopyOutline } from 'react-icons/io5';

interface EnglishSentenceClientProps {
  initialSentences: SentenceItem[];
}

export default function EnglishSentenceClient({ initialSentences }: EnglishSentenceClientProps) {
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('📋 셀 내용이 클립보드에 복사되었습니다!');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const filteredItems = initialSentences.filter((item) => {
    if (!search) return true;
    return item.content.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>EnglishSentence</h1>
      </header>

      {/* Search Bar */}
      <div className={styles.searchBox}>
        <IoSearchOutline size={20} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="검색어를 입력하세요..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sentences Grid */}
      <div className={styles.grid}>
        {filteredItems.length === 0 ? (
          <div className={styles.emptyCanvas}>
            <div className={styles.emptyIcon}>🔍</div>
            <div className={styles.emptyTitle}>검색 결과가 없습니다</div>
            <div className={styles.emptyDesc}>다른 검색어로 다시 시도해 보세요.</div>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className={styles.cellCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cellIndex}>{item.index}번</span>
                <div className={styles.actionBtns}>
                  <button
                    className={styles.iconBtn}
                    title="셀 내용 복사"
                    onClick={() => handleCopy(item.content)}
                  >
                    <IoCopyOutline size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.cellContent}>{item.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
