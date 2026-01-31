"use client";

import { useEffect, useState } from 'react';
import styles from './DualClock.module.css';

// Coordinates
const LOCATIONS = {
    de: { lat: 50.25, lon: 8.63 }, // Friedrichsdorf
    kr: { lat: 37.56, lon: 126.97 }, // Seoul
    jp: { lat: 35.68, lon: 139.69 } // Tokyo
};

export default function DualClock() {
    const [times, setTimes] = useState({ de: '', kr: '', jp: '' });
    const [temps, setTemps] = useState<{ de: number | null, kr: number | null, jp: number | null }>({ de: null, kr: null, jp: null });

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
                kr: fmt('Asia/Seoul'),
                jp: fmt('Asia/Tokyo')
            });
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Weather Update (Every 10 minutes)
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Fetch all in parallel
                const [resDe, resKr, resJp] = await Promise.all([
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LOCATIONS.de.lat}&longitude=${LOCATIONS.de.lon}&current_weather=true`),
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LOCATIONS.kr.lat}&longitude=${LOCATIONS.kr.lon}&current_weather=true`),
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LOCATIONS.jp.lat}&longitude=${LOCATIONS.jp.lon}&current_weather=true`)
                ]);

                if (resDe.ok && resKr.ok && resJp.ok) {
                    const dataDe = await resDe.json();
                    const dataKr = await resKr.json();
                    const dataJp = await resJp.json();

                    setTemps({
                        de: Math.round(dataDe.current_weather.temperature),
                        kr: Math.round(dataKr.current_weather.temperature),
                        jp: Math.round(dataJp.current_weather.temperature)
                    });
                }
            } catch (e) {
                console.error("Failed to fetch weather", e);
            }
        };

        fetchWeather(); // Initial fetch

        const weatherTimer = setInterval(fetchWeather, 10 * 60 * 1000); // 10 minutes
        return () => clearInterval(weatherTimer);
    }, []);

    // Prevent dehydration mismatch
    if (!times.de) return null;

    return (
        <div className={styles.clockContainer}>
            {/* Korea (First) */}
            <div className={styles.clockGroup}>
                <span className={styles.flag}>🇰🇷</span>
                <span className={styles.time}>{times.kr}</span>
                {temps.kr !== null && (
                    <span className={styles.temp}>{temps.kr}°C</span>
                )}
            </div>

            {/* Germany (Second) */}
            <div className={styles.clockGroup}>
                <span className={styles.flag}>🇩🇪</span>
                <span className={styles.time}>{times.de}</span>
                {temps.de !== null && (
                    <span className={styles.temp}>{temps.de}°C</span>
                )}
            </div>

            {/* Japan (Third) */}
            <div className={styles.clockGroup}>
                <span className={styles.flag}>🇯🇵</span>
                <span className={styles.time}>{times.jp}</span>
                {temps.jp !== null && (
                    <span className={styles.temp}>{temps.jp}°C</span>
                )}
            </div>
        </div>
    );
}
