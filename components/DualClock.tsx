"use client";

import { useEffect, useState } from 'react';
import styles from './DualClock.module.css';

export default function DualClock() {
    const [times, setTimes] = useState({
        de: '',
        kr: ''
    });

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();

            const deTime = new Intl.DateTimeFormat('de-DE', {
                timeZone: 'Europe/Berlin',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now);

            const krTime = new Intl.DateTimeFormat('ko-KR', {
                timeZone: 'Asia/Seoul',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now);

            setTimes({
                de: deTime,
                kr: krTime
            });
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    // Prevent hydration mismatch by not rendering until client-side (or handle gracefully)
    // Initializes with empty string which is fine
    if (!times.de) return null;

    return (
        <div className={styles.clockContainer}>
            <div className={styles.clockItem}>
                <span className={styles.label}>DE 🇩🇪</span>
                <span className={styles.time}>{times.de}</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.clockItem}>
                <span className={styles.label}>KR 🇰🇷</span>
                <span className={styles.time}>{times.kr}</span>
            </div>
        </div>
    );
}
