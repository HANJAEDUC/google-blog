"use client";

import { useState } from 'react';
import romansData from './romans.json';

export default function DashboardClient1() {
    const [selectedChapter, setSelectedChapter] = useState(1);
    const chapters = Array.from({ length: 16 }, (_, i) => i + 1);

    const chapterVerses = romansData.filter((v: any) => v.chapter === selectedChapter);

    return (
        <div style={{ padding: '20px 40px', color: 'white', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{
                fontSize: '2.5rem',
                marginBottom: '30px',
                textAlign: 'center',
                background: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                📖 Romans (로마서)
            </h1>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
                {chapters.map(ch => (
                    <button
                        key={ch}
                        onClick={() => setSelectedChapter(ch)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: selectedChapter === ch ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontWeight: selectedChapter === ch ? 'bold' : 'normal',
                            boxShadow: selectedChapter === ch ? '0 4px 15px rgba(118, 75, 162, 0.4)' : 'none',
                            outline: 'none'
                        }}
                    >
                        Ch. {ch}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chapterVerses.map((verse: any) => (
                    <div key={`${verse.chapter}-${verse.verse}`} style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            fontSize: '1rem',
                            color: '#00C9FF',
                            fontWeight: '600',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            paddingBottom: '10px',
                            marginBottom: '6px'
                        }}>
                            <span style={{
                                background: 'rgba(0, 201, 255, 0.15)',
                                padding: '4px 10px',
                                borderRadius: '6px'
                            }}>
                                {verse.chapter} : {verse.verse}
                            </span>
                            <button
                                onClick={() => {
                                    if ('speechSynthesis' in window) {
                                        if (window.speechSynthesis.speaking) {
                                            window.speechSynthesis.cancel();
                                        }
                                        const utterance = new SpeechSynthesisUtterance(verse.niv);

                                        // Try to find a high-quality English voice
                                        const voices = window.speechSynthesis.getVoices();
                                        const voiceNames = ['Google US English', 'Samantha', 'Karen', 'Daniel'];

                                        let selectedVoice: SpeechSynthesisVoice | undefined;

                                        // 1. Try specific high-quality names
                                        for (let i = 0; i < voices.length; i++) {
                                            if (voiceNames.includes(voices[i].name)) {
                                                selectedVoice = voices[i];
                                                break;
                                            }
                                        }

                                        // 2. Try any English Premium voice
                                        if (!selectedVoice) {
                                            for (let i = 0; i < voices.length; i++) {
                                                if (voices[i].name.includes('English') &&
                                                    (voices[i].name.includes('Premium') || voices[i].name.includes('Enhanced'))) {
                                                    selectedVoice = voices[i];
                                                    break;
                                                }
                                            }
                                        }

                                        // 3. Fallback to any en-US or en-GB voice
                                        if (!selectedVoice) {
                                            for (let i = 0; i < voices.length; i++) {
                                                if (voices[i].lang === 'en-US' || voices[i].lang === 'en-GB') {
                                                    selectedVoice = voices[i];
                                                    break;
                                                }
                                            }
                                        }

                                        if (selectedVoice) {
                                            utterance.voice = selectedVoice;
                                        }

                                        utterance.lang = 'en-US';
                                        utterance.rate = 0.85; // Slightly slower for better dictation feel
                                        utterance.pitch = 1.0;
                                        window.speechSynthesis.speak(utterance);
                                    } else {
                                        alert("Sorry, your browser doesn't support text to speech!");
                                    }
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            >
                                🔊 Listen
                            </button>
                        </div>
                        <div style={{ fontSize: '1.3rem', lineHeight: '1.6', color: '#ffffff', wordBreak: 'keep-all' }}>
                            {verse.gae}
                        </div>
                        <div style={{ fontSize: '1.15rem', lineHeight: '1.6', color: '#a0aec0', fontStyle: 'italic' }}>
                            {verse.niv}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
