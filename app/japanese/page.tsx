"use client";

import { useEffect, useState, useRef } from 'react';
import styles from './japanese.module.css';
import Papa from 'papaparse';

interface Word {
    word: string; // The main word (Japanese)
    korean: string;
    part: string;
    example: string;
    exampleMeaning: string;
    pronunciation?: string;
}

// TODO: Replace with your Japanese Google Sheet CSV URL
// Currently empty to show blank state.
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQqKyjSncskBs0QKQcqOJV0ZaMuWWjdmaHH70Mcnd6hBcVSabE2PbG6zOLNDQa40Y6jMso7_c7uUGTm/pub?gid=0&single=true&output=csv';

export default function JapaneseWordsPage() {
    const [vocabulary, setVocabulary] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);

    const [isPlayingSequence, setIsPlayingSequence] = useState(false);
    const [currentSequenceIndex, setCurrentSequenceIndex] = useState(-1);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    const isPlayingRef = useRef(false);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // 1. Fetch Data
    useEffect(() => {
        if (!SHEET_URL) {
            setLoading(false);
            return;
        }

        Papa.parse(`${SHEET_URL}&t=${Date.now()}`, {
            download: true,
            header: true,
            transformHeader: (h) => h.trim().toLowerCase(), // Normalize headers
            complete: (results) => {
                // Map CSV fields to Word interface
                // Assuming CSV has 'german' column currently. Change to 'japanese' if you update CSV headers.
                const data = (results.data as any[]).
                    filter(row => row.japanese && row.japanese.trim() !== '')
                    .map(row => ({
                        word: row.japanese, // Mapping 'japanese' column to 'word'
                        korean: row.korean,
                        part: row.part,
                        example: row.example,
                        exampleMeaning: row.examplemeaning || row['example meaning'], // Handle varying headers
                        pronunciation: row.pronunciation
                    }));
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

    // 2. Load Voices
    useEffect(() => {
        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) setAvailableVoices(voices);
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
            if (vocabulary.length > 0) setCurrentSequenceIndex(0); // Loop
            else handleStop();
            return;
        }
        if (currentSequenceIndex < 0) return;

        if (cardRefs.current[currentSequenceIndex]) {
            cardRefs.current[currentSequenceIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        const rootLang = langPrefix.split('-')[0];
        const voices = availableVoices.filter(v => v.lang.startsWith(rootLang));

        // 1. Prefer "Google" voices (Chrome/Android High Quality)
        const googleVoice = voices.find(v => v.name.includes('Google'));
        if (googleVoice) return googleVoice;

        // 2. Prefer specific natural voices on macOS/iOS
        if (rootLang === 'ko') {
            const yuna = voices.find(v => v.name.includes('Yuna'));
            if (yuna) return yuna;
        }
        if (rootLang === 'ja') {
            const kyoko = voices.find(v => v.name.includes('Kyoko') || v.name.includes('Otoya'));
            if (kyoko) return kyoko;
        }

        // 3. Fallback to exact match or first available
        return voices.find(v => v.lang === langPrefix) || voices[0];
    };

    const speakWordSequence = (word: Word) => {
        window.speechSynthesis.cancel();
        isPlayingRef.current = true;

        const playStep = (text: string, lang: string, nextStep: () => void, delay: number = 500) => {
            if (!text || text.trim() === '') { nextStep(); return; }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9;
            const voice = getBestVoice(lang);
            if (voice) utterance.voice = voice;

            utterance.onend = () => {
                if (!isPlayingRef.current) return;
                setTimeout(() => { if (isPlayingRef.current) nextStep(); }, delay);
            };
            utterance.onerror = (e) => {
                console.error("Speech error", e);
                handleStop();
            };
            window.speechSynthesis.speak(utterance);
        };

        const stepFinish = () => setCurrentSequenceIndex(prev => prev + 1);

        // Sequence: Word(JP) -> Korean -> Example(JP) -> Meaning(KR)
        const stepExampleMeaning = () => {
            if (word.exampleMeaning) playStep(word.exampleMeaning, 'ko-KR', stepFinish, 1000);
            else stepFinish();
        };
        const stepExample = () => {
            if (word.example) playStep(word.example, 'ja-JP', stepExampleMeaning, 500);
            else stepExampleMeaning();
        };
        const stepWordMeaning = () => playStep(word.korean, 'ko-KR', stepExample, 500);

        // Start with Japanese
        playStep(word.word, 'ja-JP', stepWordMeaning, 500);
    };

    const speakIndividual = (text: string, lang: 'ja' | 'ko') => {
        if (isPlayingSequence) handleStop();
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = lang === 'ja' ? 'ja-JP' : 'ko-KR';
        utterance.lang = targetLang;
        const voice = getBestVoice(targetLang);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    };

    const togglePlayAll = () => {
        if (isPlayingSequence) handleStop();
        else {
            setIsPlayingSequence(true);
            setCurrentSequenceIndex(0);
            isPlayingRef.current = true;
        }
    };

    if (loading) {
        return (
            <div className={styles.container} style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontSize: 18, color: 'var(--md-sys-color-on-surface-variant)' }}>Loading Japanese vocabulary...</p>
            </div>
        );
    }

    // Resume Logic Disabled
    // const [resumeIndex, setResumeIndex] = useState<number | null>(null);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>日本語単語</h1>
                <p className={styles.subtitle}>Daily Japanese Vocabulary</p>
                <button className={styles.playAllButton} onClick={togglePlayAll}>
                    {isPlayingSequence ? 'Stop Playing' : 'Play All Words'}
                </button>
            </header>

            {/* Resume Button Removed */}

            <div className={styles.grid}>
                {vocabulary.map((word, index) => (
                    <div
                        key={index}
                        ref={(el) => { cardRefs.current[index] = el; }}
                        className={`${styles.card} ${index === currentSequenceIndex ? styles.activeCard : ''}`}
                        data-part={word.part}
                    >
                        {/* Index Counter */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '16px',
                            fontSize: '70%',
                            color: '#9aa0a6',
                            fontWeight: 400,
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <span style={{ cursor: 'pointer', display: 'flex', marginRight: '6px' }} onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSequenceIndex(index);
                                setIsPlayingSequence(true);
                                isPlayingRef.current = true;
                            }} title="Start loop from here">
                                <span>▶</span>
                            </span>
                            {index + 1} / {vocabulary.length}
                        </div>

                        <h2 className={styles.word} onClick={() => speakIndividual(word.word, 'ja')} title="Click to listen">
                            {word.word}
                            {word.pronunciation && (
                                <span className={styles.pronunciationInline} style={{ color: '#ff9999' }}>
                                    {word.pronunciation} {/* Custom color for JP maybe? */}
                                </span>
                            )}
                        </h2>
                        <p className={styles.translation}>{word.korean}</p>
                        <div className={styles.example} onClick={() => speakIndividual(word.example, 'ja')} title="Click to listen">
                            <p style={{ marginBottom: 4 }}>{word.example}</p>
                            <p style={{ opacity: 0.7, fontStyle: 'normal', fontSize: '0.9em' }}>{word.exampleMeaning}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
