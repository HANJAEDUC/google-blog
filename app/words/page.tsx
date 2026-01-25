"use client";

import { useEffect, useState, useRef } from 'react';
import styles from './words.module.css';
import Papa from 'papaparse';

interface Word {
  german: string;
  korean: string;
  part: string;
  example: string;
  exampleMeaning: string;
  pronunciation?: string;
}

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';

export default function WordsPage() {
  const [vocabulary, setVocabulary] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  // Playback state
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(-1);

  // Refs for checking state inside async functions
  const isPlayingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Papa.parse(`${SHEET_URL}&t=${Date.now()}`, {
      download: true,
      header: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const data = (results.data as Word[]).filter(row => row.german && row.german.trim() !== '');
        console.log('Fetched Vocabulary Data (First Item):', data[0]);
        setVocabulary(data);
        setLoading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setLoading(false);
      }
    });

    // Cleanup on unmount
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const playGoogleAudio = (text: string, lang: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      stopAudio(); // Ensure previous is stopped
      if (isPlayingSequence) isPlayingRef.current = true; // Restore flag if we are in sequence mode

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => resolve();
      audio.onerror = (e) => reject(e);

      // Attempt play
      audio.play().catch(e => {
        console.error("Audio play failed", e);
        reject(e);
      });
    });
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const playSequenceRecursive = async (index: number) => {
    // Check if stopped or finished
    if (!isPlayingRef.current || index >= vocabulary.length) {
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      isPlayingRef.current = false;
      return;
    }

    setCurrentSequenceIndex(index);

    try {
      // 1. Play German
      await playGoogleAudio(vocabulary[index].german, 'de');

      if (!isPlayingRef.current) return;
      await wait(500);

      // 2. Play Korean
      if (!isPlayingRef.current) return;
      await playGoogleAudio(vocabulary[index].korean, 'ko');

      if (!isPlayingRef.current) return;
      await wait(1000);

      // 3. Next Word
      playSequenceRecursive(index + 1);
    } catch (error) {
      console.error("Sequence stopped or error:", error);
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      isPlayingRef.current = false;
    }
  };

  const togglePlayAll = () => {
    if (isPlayingSequence) {
      // Stop
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      isPlayingRef.current = false;
      stopAudio();
    } else {
      // Start
      setIsPlayingSequence(true);
      isPlayingRef.current = true;
      playSequenceRecursive(0);
    }
  };

  const speakIndividual = (text: string, lang: 'de' | 'ko' = 'de') => {
    // If playing sequence, stop it first
    if (isPlayingSequence) {
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      isPlayingRef.current = false;
    }

    // Just play once without tracking sequence
    // Using a separate throwaway audio logic or reusing the helper
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    stopAudio(); // Stop any currently playing
    audioRef.current = audio;
    audio.play().catch(e => console.error(e));
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
              onClick={() => speakIndividual(word.german, 'de')}
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
            <div className={styles.example} onClick={() => speakIndividual(word.example, 'de')} title="Click to listen">
              <p style={{ marginBottom: 4 }}>{word.example}</p>
              <p style={{ opacity: 0.7, fontStyle: 'normal', fontSize: '0.9em' }}>{word.exampleMeaning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

