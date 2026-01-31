"use client";

import { useEffect, useState } from 'react';
import styles from './DualClock.module.css';

// Coordinates
const LOCATIONS = {
    de: { lat: 50.25, lon: 8.63 }, // Friedrichsdorf
    kr: { lat: 37.56, lon: 126.97 } // Seoul
};

export default function DualClock() {
    const [times, setTimes] = useState({ de: '', kr: '' });
    const [temps, setTemps] = useState<{ de: number | null, kr: number | null }>({ de: null, kr: null });

    // 1. Time Update (Every 1 second)
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const fmt = (tz: string) => new Intl.DateTimeFormat('de-DE', {
                timeZone: tz,
                hour: '2-digit', minute: '2-digit',
                hour12: false
            }).format(now);

            setTimes({
                de: fmt('Europe/Berlin'),
                kr: fmt('Asia/Seoul')
            });
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Weather Update (Every 30 minutes)
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Fetch both in parallel
                const [resDe, resKr] = await Promise.all([
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LOCATIONS.de.lat}&longitude=${LOCATIONS.de.lon}&current_weather=true`),
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LOCATIONS.kr.lat}&longitude=${LOCATIONS.kr.lon}&current_weather=true`)
                ]);

                if (resDe.ok && resKr.ok) {
                    const dataDe = await resDe.json();
                    const dataKr = await resKr.json();

                    setTemps({
                        de: Math.round(dataDe.current_weather.temperature),
                        kr: Math.round(dataKr.current_weather.temperature)
                    });
                }
            } catch (e) {
                console.error("Failed to fetch weather", e);
            }
        };

        fetchWeather(); // Initial fetch

        const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000); // 30 minutes
        return () => clearInterval(weatherTimer);
    }, []);

    // Prevent dehydration mismatch
    if (!times.de) return null;

    return (
        <div className={styles.clockContainer}>
            {/* Germany */}
            <div className={styles.clockGroup}>
                <span className={styles.flag}>🇩🇪</span>
                <span className={styles.time}>{times.de}</span>
                {temps.de !== null && (
                    <span className={styles.temp}>{temps.de}°C</span>
                )}
            </div>

            {/* Divider / Spacer */}
            {/* Spacer is handled by gap in CSS, can adjust there */}

            {/* Korea */}
            <div className={styles.clockGroup}>
                <span className={styles.flag}>🇰🇷</span>
                <span className={styles.time}>{times.kr}</span>
                {temps.kr !== null && (
                    <span className={styles.temp}>{temps.kr}°C</span>
                )}
            </div>
        </div>
    );
}
