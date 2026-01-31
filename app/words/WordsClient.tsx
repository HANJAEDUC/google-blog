"use client";

import { useEffect, useState, useRef } from 'react';
import styles from './words.module.css';

export interface Word {
    german: string;
    korean: string;
    part: string;
    example: string;
    exampleMeaning: string;
    pronunciation?: string;
    ipa?: string;
}

interface WordsClientProps {
    initialVocabulary: Word[];
}

export default function WordsClient({ initialVocabulary }: WordsClientProps) {
    // Vocabulary is passed as a prop, but we keep it in variable for consistent access
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

        // Cleanup speech on unmount
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

        // 1. Prefer "Google" voices (Chrome/Android High Quality)
        const googleVoice = voices.find(v => v.name.includes('Google'));
        if (googleVoice) return googleVoice;

        // 2. Prefer specific natural voices on macOS/iOS
        if (rootLang === 'ko') {
            const yuna = voices.find(v => v.name.includes('Yuna')); // macOS/iOS 'Yuna'
            if (yuna) return yuna;
        }
        if (rootLang === 'de') {
            const anna = voices.find(v => v.name.includes('Anna')); // macOS 'Anna'
            if (anna) return anna;
        }

        // 3. Fallback to exact match or first available
        return voices.find(v => v.lang === langPrefix) || voices[0];
    };

    // Helper function to preprocess text for TTS
    const preprocessForTTS = (text: string, lang: string) => {
        if (lang.startsWith('ko') && text.includes('~')) {
            return text.replace(/~/g, '뭐뭐 ');
        }
        return text;
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

            // Preprocess text for better pronunciation (e.g. ~ -> 뭐뭐)
            const speechText = preprocessForTTS(text, lang);

            const utterance = new SpeechSynthesisUtterance(speechText);
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

        // Step 2.5: German Example (2nd time)
        const stepExampleSecond = () => {
            if (word.example) {
                playStep(word.example, 'de-DE', stepExampleMeaning, 500);
            } else {
                stepExampleMeaning();
            }
        };

        // Step 2: German Example
        const stepExample = () => {
            if (word.example) {
                playStep(word.example, 'de-DE', stepExampleSecond, 500);
            } else {
                stepExampleMeaning();
            }
        };

        // Step 1: Korean Word Meaning
        const stepWordMeaning = () => {
            playStep(word.korean, 'ko-KR', stepExample, 500);
        };

        // Step 0.5: German Word (2nd time)
        const stepWordSecond = () => {
            playStep(word.german, 'de-DE', stepWordMeaning, 500);
        };

        // Start: German Word (1st time)
        playStep(word.german, 'de-DE', stepWordSecond, 1000);
    };

    const speakIndividual = (text: string, lang: 'de' | 'ko') => {
        if (isPlayingSequence) handleStop();

        window.speechSynthesis.cancel();

        // Determine language code
        const targetLang = lang === 'de' ? 'de-DE' : 'ko-KR';

        // Preprocess text (e.g. replace ~ with 뭐뭐 in Korean)
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
                <p className={styles.subtitle}>
                    Daily German Vocabulary
                </p>
                <button
                    className={styles.playAllButton}
                    onClick={togglePlayAll}
                >
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
                        <h2
                            className={styles.word}
                            onClick={() => speakIndividual(word.german, 'de')}
                            title="Click to listen"
                        >
                            {word.german}
                            {word.pronunciation && !word.pronunciation.startsWith('#') && (
                                <span className={styles.pronunciationInline}>
                                    {word.pronunciation}
                                    {word.ipa && <span style={{ opacity: 0.8, marginLeft: '8px', fontWeight: 400, fontFamily: 'Arial, sans-serif' }}>{word.ipa}</span>}
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
