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
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{
                                background: 'rgba(0, 201, 255, 0.15)',
                                padding: '4px 10px',
                                borderRadius: '6px'
                            }}>
                                {verse.chapter} : {verse.verse}
                            </span>
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
