"use client";

import { useEffect, useState } from 'react';
import styles from './words.module.css';
import { IoVolumeHigh } from 'react-icons/io5';
import Papa from 'papaparse';

interface Word {
  german: string;
  korean: string;
  part: string;
  example: string;
  exampleMeaning: string;
  pronunciation?: string; // Optional field for Korean pronunciation
}

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';

export default function WordsPage() {
  const [vocabulary, setVocabulary] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(-1);

  useEffect(() => {
    // Append timestamp to avoid browser caching
    Papa.parse(`${SHEET_URL}&t=${Date.now()}`, {
      download: true,
      header: true,
      transformHeader: (h) => h.trim(), // Remove whitespace from headers
      complete: (results) => {
        // Filter out empty rows just in case
        const data = (results.data as Word[]).filter(row => row.german && row.german.trim() !== '');
        console.log('Fetched Vocabulary Data (First Item):', data[0]); // Log first item to check keys
        setVocabulary(data);
        setLoading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setLoading(false);
      }
    });
  }, []);

  // Handle sequential playback
  useEffect(() => {
    let active = true;

    if (!isPlayingSequence || currentSequenceIndex < 0 || currentSequenceIndex >= vocabulary.length) {
      if (currentSequenceIndex >= vocabulary.length) {
        setIsPlayingSequence(false);
        setCurrentSequenceIndex(-1);
      }
      return;
    }

    const word = vocabulary[currentSequenceIndex];
    if ('speechSynthesis' in window) {
      // Cancel any current speech
      window.speechSynthesis.cancel();

      const germanUtterance = new SpeechSynthesisUtterance(word.german);
      germanUtterance.lang = 'de-DE';
      germanUtterance.rate = 0.9;

      // Explicitly try to find a German voice
      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(v => v.lang.startsWith('de'));
      if (germanVoice) {
        germanUtterance.voice = germanVoice;
      }

      const koreanUtterance = new SpeechSynthesisUtterance(word.korean);
      koreanUtterance.lang = 'ko-KR';
      koreanUtterance.rate = 0.9;

      // Explicitly try to find a Korean voice
      const koreanVoice = voices.find(v => v.lang.startsWith('ko'));
      if (koreanVoice) {
        koreanUtterance.voice = koreanVoice;
      }

      germanUtterance.onend = () => {
        if (!active) return;
        // Delay 0.5s before Korean meaning
        setTimeout(() => {
          if (active) window.speechSynthesis.speak(koreanUtterance);
        }, 500);
      };

      koreanUtterance.onend = () => {
        if (!active) return;
        // Delay 1s before next word
        setTimeout(() => {
          if (active) setCurrentSequenceIndex(prev => prev + 1);
        }, 1000);
      };

      germanUtterance.onerror = (e) => {
        console.error("Speech error", e);
        if (active) setIsPlayingSequence(false);
      };

      window.speechSynthesis.speak(germanUtterance);
    }

    return () => {
      active = false;
    };
  }, [currentSequenceIndex, isPlayingSequence, vocabulary]);

  const speak = (text: string) => {
    // Stop sequence if user manually plays a word
    if (isPlayingSequence) {
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      window.speechSynthesis.cancel();
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(v => v.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const togglePlayAll = () => {
    if (isPlayingSequence) {
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      window.speechSynthesis.cancel();
    } else {
      setIsPlayingSequence(true);
      setCurrentSequenceIndex(0);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: 18, color: 'var(--md-sys-color-on-surface-variant)' }}>Loading vocabulary...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Wortschatz</h1>
        <p className={styles.subtitle}>
          Daily German Vocabulary for Inspiration
        </p>
        <button
          className={styles.playAllButton}
          onClick={togglePlayAll}
        >
          {isPlayingSequence ? 'Stop Playing' : 'Play All Words'}
        </button>
      </header>

      <div className={styles.grid}>
        {vocabulary.map((word, index) => (
          <div
            key={index}
            className={`${styles.card} ${index === currentSequenceIndex ? styles.activeCard : ''}`}
            data-part={word.part}
          >
            {/* Tag removed as requested */}
            <h2
              className={styles.word}
              onClick={() => speak(word.german)}
              title="Click to listen"
            >
              {word.german}
              {word.pronunciation && !word.pronunciation.startsWith('#') && (
                <span className={styles.pronunciationInline}>
                  {word.pronunciation}
                </span>
              )}
            </h2>
            <p className={styles.translation}>{word.korean}</p>
            <div className={styles.example} onClick={() => speak(word.example)} title="Click to listen">
              <p style={{ marginBottom: 4 }}>{word.example}</p>
              <p style={{ opacity: 0.7, fontStyle: 'normal', fontSize: '0.9em' }}>{word.exampleMeaning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
