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

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';

export default function WordsPage() {
  const [vocabulary, setVocabulary] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  // Playback state
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(-1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Ref to track active state to preventing overlap
  const isPlayingRef = useRef(false);

  // 1. Fetch Data
  useEffect(() => {
    Papa.parse(`${SHEET_URL}&t=${Date.now()}`, {
      download: true,
      header: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const data = (results.data as Word[]).filter(row => row.german && row.german.trim() !== '');
        setVocabulary(data);
        setLoading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setLoading(false);
      }
    });

    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 2. Load Voices (Mobile Support)
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // 3. Sequence Logic
  useEffect(() => {
    if (!isPlayingSequence || currentSequenceIndex < 0 || currentSequenceIndex >= vocabulary.length) {
      if (currentSequenceIndex >= vocabulary.length) {
        handleStop();
      }
      return;
    }

    const word = vocabulary[currentSequenceIndex];
    speakWordSequence(word);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSequenceIndex, isPlayingSequence, vocabulary]);

  const handleStop = () => {
    setIsPlayingSequence(false);
    setCurrentSequenceIndex(-1);
    isPlayingRef.current = false;
    window.speechSynthesis.cancel();
  };

  const getBestVoice = (langPrefix: string) => {
    return availableVoices.find(v => v.lang === langPrefix) ||
      availableVoices.find(v => v.lang.startsWith(langPrefix.split('-')[0]));
  };

  const speakWordSequence = (word: Word) => {
    window.speechSynthesis.cancel();
    isPlayingRef.current = true;

    const germanUtterance = new SpeechSynthesisUtterance(word.german);
    germanUtterance.lang = 'de-DE';
    germanUtterance.rate = 0.9;

    const gVoice = getBestVoice('de-DE');
    if (gVoice) germanUtterance.voice = gVoice;

    const koreanUtterance = new SpeechSynthesisUtterance(word.korean);
    koreanUtterance.lang = 'ko-KR';
    koreanUtterance.rate = 0.9;

    const kVoice = getBestVoice('ko-KR');
    if (kVoice) koreanUtterance.voice = kVoice;

    germanUtterance.onend = () => {
      if (!isPlayingRef.current) return;
      setTimeout(() => {
        if (isPlayingRef.current) window.speechSynthesis.speak(koreanUtterance);
      }, 500);
    };

    koreanUtterance.onend = () => {
      if (!isPlayingRef.current) return;
      setTimeout(() => {
        if (isPlayingRef.current) setCurrentSequenceIndex(prev => prev + 1);
      }, 1000);
    };

    germanUtterance.onerror = (e) => {
      console.error(e);
      handleStop();
    };

    window.speechSynthesis.speak(germanUtterance);
  };

  const speakIndividual = (text: string, lang: 'de' | 'ko') => {
    if (isPlayingSequence) handleStop();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = lang === 'de' ? 'de-DE' : 'ko-KR';
    utterance.lang = targetLang;

    const voice = getBestVoice(targetLang);
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  };

  const togglePlayAll = () => {
    if (isPlayingSequence) {
      handleStop();
    } else {
      setIsPlayingSequence(true);
      setCurrentSequenceIndex(0);
      isPlayingRef.current = true;
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

