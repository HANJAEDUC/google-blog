"use client";

import { useEffect, useState, useRef } from 'react';
import styles from './words.module.css';

export interface WordExample {
    sentence: string;
    meaning: string;
}

export interface Word {
    german: string;
    korean: string;
    part: string;
    // Changed from single string to array of objects
    examples: WordExample[];
    pronunciation?: string;
    ipa?: string;
}

interface WordsClientProps {
    initialVocabulary: Word[];
}

export default function WordsClient({ initialVocabulary }: WordsClientProps) {
    const vocabulary = initialVocabulary;

    const [isPlayingSequence, setIsPlayingSequence] = useState(false);
    const [currentSequenceIndex, setCurrentSequenceIndex] = useState(-1);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Ref to track active state to preventing overlap
    const isPlayingRef = useRef(false);
    // Ref for auto-scrolling
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // 1. Load Voices (Mobile Support)
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

        return () => {
            if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // 2. Sequence Logic
    useEffect(() => {
        if (!isPlayingSequence) return;

        if (currentSequenceIndex >= vocabulary.length) {
            if (vocabulary.length > 0) setCurrentSequenceIndex(0);
            else handleStop();
            return;
        }

        if (currentSequenceIndex < 0) return;

        // Auto-scroll to active card
        if (cardRefs.current[currentSequenceIndex]) {
            cardRefs.current[currentSequenceIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }

        const word = vocabulary[currentSequenceIndex];
        if (word) {
            speakWordSequence(word);
        }

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

        const googleVoice = voices.find(v => v.name.includes('Google'));
        if (googleVoice) return googleVoice;

        if (rootLang === 'ko') {
            const yuna = voices.find(v => v.name.includes('Yuna'));
            if (yuna) return yuna;
        }
        if (rootLang === 'de') {
            const anna = voices.find(v => v.name.includes('Anna'));
            if (anna) return anna;
        }

        return voices.find(v => v.lang === langPrefix) || voices[0];
    };

    const preprocessForTTS = (text: string, lang: string) => {
        if (lang.startsWith('ko') && text.includes('~')) {
            return text.replace(/~/g, '뭐뭐 ');
        }
        return text;
    };

    const speakWordSequence = (word: Word) => {
        window.speechSynthesis.cancel();
        isPlayingRef.current = true;

        // Basic helper for a single TTS step
        const playStep = (text: string, lang: string, nextStep: () => void, delay: number = 500) => {
            if (!text || text.trim() === '') {
                nextStep();
                return;
            }

            const speechText = preprocessForTTS(text, lang);
            const utterance = new SpeechSynthesisUtterance(speechText);

            // Language specifics
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
                handleStop();
            };

            window.speechSynthesis.speak(utterance);
        };

        // Recursive function to play examples one by one
        const playExamples = (index: number) => {
            // If no more examples, move to next word
            if (index >= word.examples.length) {
                setCurrentSequenceIndex(prev => prev + 1);
                return;
            }

            const ex = word.examples[index];

            // Define the micro-sequence for ONE example: German -> German(2nd) -> Korean
            // 3. Korean Meaning
            const stepExampleMeaning = () => {
                playStep(ex.meaning, 'ko-KR', () => playExamples(index + 1), 1000);
            };

            // 2. German (2nd time)
            const stepExampleSecond = () => {
                playStep(ex.sentence, 'de-DE', stepExampleMeaning, 500);
            };

            // 1. German (1st time)
            const stepExampleFirst = () => {
                playStep(ex.sentence, 'de-DE', stepExampleSecond, 500);
            };

            // Start this example sequence
            stepExampleFirst();
        };


        // Main Sequence: German Word -> German Word(2nd) -> Korean Meaning -> [Examples...]

        // Step 3: Start Examples Loop
        const startExamples = () => {
            playExamples(0);
        };

        // Step 2: Korean Word Meaning
        const stepWordMeaning = () => {
            playStep(word.korean, 'ko-KR', startExamples, 500);
        };

        // Step 1: German Word (2nd time)
        const stepWordSecond = () => {
            playStep(word.german, 'de-DE', stepWordMeaning, 500);
        };

        // Start: German Word (1st time)
        playStep(word.german, 'de-DE', stepWordSecond, 1000);
    };

    const speakIndividual = (text: string, lang: 'de' | 'ko') => {
        if (isPlayingSequence) handleStop();

        window.speechSynthesis.cancel();
        const targetLang = lang === 'de' ? 'de-DE' : 'ko-KR';
        const speechText = preprocessForTTS(text, targetLang);
        const utterance = new SpeechSynthesisUtterance(speechText);
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Wortschatz</h1>
                <p className={styles.subtitle}>Daily German Vocabulary</p>
                <button className={styles.playAllButton} onClick={togglePlayAll}>
                    {isPlayingSequence ? 'Stop Playing' : 'Play All Words'}
                </button>

                <div style={{
                    marginTop: '20px',
                    fontSize: '0.65rem',
                    color: '#9aa0a6',
                    lineHeight: '1.6',
                    opacity: 0.8,
                    textAlign: 'left',
                    width: 'fit-content',
                    margin: '20px auto'
                }}>
                    <div>• Play All Words : Start from beginning</div>
                    <div>• Click Index / ▶ : Loop from that word</div>
                    <div>• Click Text : Play individual sound</div>
                </div>
            </header>

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
                            alignItems: 'center',
                            cursor: 'pointer'
                        }} onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSequenceIndex(index);
                            setIsPlayingSequence(true);
                            isPlayingRef.current = true;
                        }} title="Start loop from here">
                            <span style={{ marginRight: '6px' }}>
                                <span style={{ fontSize: '1.2em' }}>▶</span>
                            </span>
                            {index + 1} / {vocabulary.length}
                        </div>

                        {/* Word Header */}
                        <h2
                            className={styles.word}
                            onClick={() => speakIndividual(word.german, 'de')}
                            title="Click to listen"
                        >
                            {word.german}
                            {word.pronunciation && !word.pronunciation.startsWith('#') && (
                                <span className={styles.pronunciationInline}>
                                    {word.pronunciation}
                                    {word.ipa && <span style={{ marginLeft: '8px', fontWeight: 400, fontFamily: 'Arial, sans-serif' }}>{word.ipa}</span>}
                                </span>
                            )}
                        </h2>

                        <p className={styles.translation}>{word.korean}</p>

                        {/* Examples List */}
                        {word.examples.length > 0 && (
                            <div className={styles.examplesContainer} style={{ marginTop: '16px' }}>
                                {word.examples.map((ex, i) => (
                                    <div
                                        key={i}
                                        className={styles.example}
                                        style={{
                                            marginTop: i > 0 ? '12px' : '0',
                                            paddingTop: i > 0 ? '12px' : '10px',
                                            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                        }}
                                        onClick={() => speakIndividual(ex.sentence, 'de')}
                                        title="Click to listen"
                                    >
                                        <p style={{ marginBottom: 4 }}>{ex.sentence}</p>
                                        <p style={{ opacity: 0.7 }}>{ex.meaning}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
