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
    if (!isPlayingSequence) return;

    if (currentSequenceIndex >= vocabulary.length) {
      if (vocabulary.length > 0) setCurrentSequenceIndex(0);
      else handleStop();
      return;
    }

    if (currentSequenceIndex < 0) return;

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

    // Helper to create utterances with consistent error handling and options
    const playStep = (text: string, lang: string, nextStep: () => void, delay: number = 500) => {
      // If text is effectively empty (or just placeholder formatting), skip
      if (!text || text.trim() === '') {
        nextStep();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;

      const voice = getBestVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        setTimeout(() => {
          if (isPlayingRef.current) nextStep();
        }, delay);
      };

      utterance.onerror = (e) => {
        console.error("Speech error", e);
        // On error, stop to prevent broken state
        handleStop();
      };

      window.speechSynthesis.speak(utterance);
    };

    // Step 4: Finish (Next Word)
    const stepFinish = () => {
      setCurrentSequenceIndex(prev => prev + 1);
    };

    // Step 3: Korean Example Meaning
    const stepExampleMeaning = () => {
      // Only play if example exists
      if (word.exampleMeaning) {
        playStep(word.exampleMeaning, 'ko-KR', stepFinish, 1000);
      } else {
        stepFinish();
      }
    };

    // Step 2: German Example
    const stepExample = () => {
      if (word.example) {
        playStep(word.example, 'de-DE', stepExampleMeaning, 500);
      } else {
        stepExampleMeaning();
      }
    };

    // Step 1: Korean Word Meaning
    const stepWordMeaning = () => {
      playStep(word.korean, 'ko-KR', stepExample, 500);
    };

    // Start: German Word
    playStep(word.german, 'de-DE', stepWordMeaning, 500);
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

