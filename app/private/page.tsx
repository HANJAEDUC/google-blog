"use client";

import { useState } from 'react';
import styles from './private.module.css';
import DashboardClient from './DashboardClient';

export default function PrivatePage() {
    const [passcode, setPasscode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === '1147') {
            setIsAuthenticated(true);
            setError(false);
        } else {
            setError(true);
            setPasscode('');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.container}>
                <div className={styles.authBox}>
                    <h1 className={styles.title}>Private Access</h1>
                    <p className={styles.subtitle}>Please enter the passcode to view this page.</p>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            type="password"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="Enter passcode"
                            className={styles.input}
                            autoFocus
                        />
                        <button type="submit" className={styles.button}>
                            Enter
                        </button>
                    </form>
                    {error && <p className={styles.error}>Incorrect passcode</p>}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.contentContainer}>
            <DashboardClient />
        </div>
    );
}
