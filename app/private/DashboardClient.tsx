import { useEffect, useState, useRef } from 'react';
import styles from './private.module.css';

interface DashboardResponse {
    ok: boolean;
    data: {
        last_updated: string;
        price_gc_kospi: any[];
        price_gc_kosdaq: any[];
        vol_gc_kospi: any[];
        vol_gc_kosdaq: any[];
        pullback_kospi: any[];
        pullback_kosdaq: any[];
    }
}

export default function DashboardClient() {
    const [activeTabPrice, setActiveTabPrice] = useState('gc-kospi');
    const [activeTabVol, setActiveTabVol] = useState('vol-kospi');
    const [activeTabPb, setActiveTabPb] = useState('pb-kospi');

    const [dateStr, setDateStr] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [topN, setTopN] = useState('0');

    const [scanState, setScanState] = useState<Record<string, { is_running: boolean; progress: number; message: string; signals_found: number }>>({});

    const [tablesData, setTablesData] = useState<any>({
        price_gc_kospi: [],
        price_gc_kosdaq: [],
        vol_gc_kospi: [],
        vol_gc_kosdaq: [],
        pullback_kospi: [],
        pullback_kosdaq: [],
    });

    const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

    useEffect(() => {
        // fetchSignals(); // Removed automatic loading on mount to start with a clear dashboard

        // Set initial date
        const d = new Date();
        if (d.getHours() < 15) d.setDate(d.getDate() - 1);
        while (d.getDay() === 0 || d.getDay() === 6) {
            d.setDate(d.getDate() - 1);
        }
        setTargetDate(d.toISOString().split('T')[0]);

        return () => {
            // clear intervals
            Object.values(intervalsRef.current).forEach(clearInterval);
        };
    }, []);

    const fetchSignals = async () => {
        try {
            const res = await fetch('/api/signals');
            const json = await res.json();
            if (json.ok) {
                setDateStr(json.data.last_updated);
                setTablesData({
                    price_gc_kospi: json.data.price_gc_kospi || [],
                    price_gc_kosdaq: json.data.price_gc_kosdaq || [],
                    vol_gc_kospi: json.data.vol_gc_kospi || [],
                    vol_gc_kosdaq: json.data.vol_gc_kosdaq || [],
                    pullback_kospi: json.data.pullback_kospi || [],
                    pullback_kosdaq: json.data.pullback_kosdaq || [],
                });
            }
        } catch (e) {
            console.error('Signal fetch error:', e);
        }
    };

    const startScan = async (target: string) => {

        // Clear corresponding tables
        setTablesData((prev: any) => {
            if (target === 'price_gc') return { ...prev, price_gc_kospi: [], price_gc_kosdaq: [] };
            if (target === 'vol_gc') return { ...prev, vol_gc_kospi: [], vol_gc_kosdaq: [] };
            if (target === 'pullback') return { ...prev, pullback_kospi: [], pullback_kosdaq: [] };
            return prev;
        });

        try {
            const res = await fetch('/api/scan/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target, target_date: targetDate, top_n: parseInt(topN) })
            });
            const json = await res.json();

            if (json.ok) {
                monitorScan(target);
            } else {
                alert(json.message);
            }
        } catch (e) { alert("서버 통신 오류"); }
    };

    const stopScan = async (target: string) => {
        try {
            const res = await fetch('/api/scan/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target })
            });
            const json = await res.json();
            if (!json.ok) {
                alert(json.message);
            } else {
                fetchSignals();
            }
        } catch (e) { alert("서버 통신 오류"); }
    };

    const monitorScan = (target: string) => {
        if (intervalsRef.current[target]) clearInterval(intervalsRef.current[target]);

        intervalsRef.current[target] = setInterval(async () => {
            try {
                const res = await fetch(`/api/scan/status?target=${target}`);
                const json = await res.json();

                if (json.ok) {
                    const state = json.data;
                    setScanState(prev => ({ ...prev, [target]: state }));

                    if (state.found_items && state.found_items.length > 0) {
                        const kospiItems = state.found_items.filter((i: any) => i.market === 'KOSPI').map((i: any, idx: number) => ({ '순위': idx + 1, ...i.item }));
                        const kosdaqItems = state.found_items.filter((i: any) => i.market === 'KOSDAQ').map((i: any, idx: number) => ({ '순위': idx + 1, ...i.item }));

                        setTablesData((prev: any) => {
                            if (target === 'price_gc') return { ...prev, price_gc_kospi: kospiItems, price_gc_kosdaq: kosdaqItems };
                            if (target === 'vol_gc') return { ...prev, vol_gc_kospi: kospiItems, vol_gc_kosdaq: kosdaqItems };
                            if (target === 'pullback') return { ...prev, pullback_kospi: kospiItems, pullback_kosdaq: kosdaqItems };
                            return prev;
                        });
                    }

                    if (!state.is_running) {
                        clearInterval(intervalsRef.current[target]);
                        if (state.progress >= 100) {
                            setScanState(prev => ({ ...prev, [target]: { ...state, message: '✅ 스캔 및 업데이트 완료!' } }));
                            fetchSignals();
                        }
                    }
                }
            } catch (e) { }
        }, 500);
    };

    const renderTable = (dataArray: any[], columns: string[]) => {
        if (!dataArray || dataArray.length === 0) {
            return (
                <tr>
                    <td colSpan={columns.length} className={styles.emptyMsg}>데이터가 없습니다.</td>
                </tr>
            );
        }
        return dataArray.map((row, idx) => (
            <tr key={idx} className={row['신호유형']?.includes('오늘 신호') ? styles.rowHighlight : ''}>
                {columns.map(col => {
                    let val = row[col] !== undefined ? row[col] : '-';

                    if (col === '종목명' && row['종목코드']) {
                        return (
                            <td key={col}>
                                {val} <span style={{ color: '#aaa', fontSize: '0.85em', marginLeft: '4px' }}>({row['종목코드']})</span>
                            </td>
                        );
                    }

                    if (col === '신호유형' && typeof val === 'string' && val.includes('오늘 신호')) {
                        return <td key={col}><span className={styles.signalBadge}>{val}</span></td>;
                    }
                    return <td key={col}>{val}</td>;
                })}
            </tr>
        ));
    };

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>📊 주식 스크리닝 대시보드</h1>
                <p className={styles.subtitle}>KOSPI & KOSDAQ 전략</p>
                <div className={styles.statusBar}>
                    <span>기준일 선택: <input type="date" className={styles.datePicker} value={targetDate} onChange={e => setTargetDate(e.target.value)} /></span>
                    <span>업데이트: <strong>{dateStr || '-'}</strong></span>
                </div>
            </header>

            <main className={styles.gridContainer}>
                {/* Row 1: 가격 골든크로스 */}
                <section className={`${styles.panel} ${styles.panelPrice}`}>
                    <h2 className={styles.panelTitle}>
                        <span>📈 가격 골든크로스 <span className={styles.badge}>MA20 &gt; MA200</span></span>
                        <div className={styles.scannerPanel}>
                            {!scanState['price_gc']?.is_running ? (
                                <button className={styles.btnPrimary} onClick={() => startScan('price_gc')}>🚀 스캔 실행</button>
                            ) : null}
                            {scanState['price_gc'] && scanState['price_gc'].is_running && (
                                <div className={styles.progContainer}>
                                    <span className={styles.progMessage}>{scanState['price_gc'].message} (발견: {scanState['price_gc'].signals_found})</span>
                                    <button className={styles.btnDanger} onClick={() => stopScan('price_gc')}>🛑중지</button>
                                </div>
                            )}
                            {scanState['price_gc'] && !scanState['price_gc'].is_running && scanState['price_gc'].progress >= 100 && (
                                <div className={styles.progContainer}>
                                    <span className={styles.progMessage}>{scanState['price_gc'].message}</span>
                                </div>
                            )}
                        </div>
                    </h2>
                    <div className={styles.tabs}>
                        <button className={`${styles.tabBtn} ${activeTabPrice === 'gc-kospi' ? styles.active : ''}`} onClick={() => setActiveTabPrice('gc-kospi')}>KOSPI</button>
                        <button className={`${styles.tabBtn} ${activeTabPrice === 'gc-kosdaq' ? styles.active : ''}`} onClick={() => setActiveTabPrice('gc-kosdaq')}>KOSDAQ</button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    {['순위', '종목명', '시가총액(억)', '종가', 'MA20', 'MA200', '갭(%)', '크로스일'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTabPrice === 'gc-kospi'
                                    ? renderTable(tablesData.price_gc_kospi, ['순위', '종목명', '시가총액(억원)', '종가', 'MA20', 'MA200', 'MA20_MA200갭(%)', '골든크로스일'])
                                    : renderTable(tablesData.price_gc_kosdaq, ['순위', '종목명', '시가총액(억원)', '종가', 'MA20', 'MA200', 'MA20_MA200갭(%)', '골든크로스일'])
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Row 2: 거래량 급증 */}
                <section className={`${styles.panel} ${styles.panelVolume}`}>
                    <h2 className={styles.panelTitle}>
                        <span>📊 거래량 급증 <span className={styles.badge}>V_MA5 &gt; V_MA20</span></span>
                        <div className={styles.scannerPanel}>
                            {!scanState['vol_gc']?.is_running ? (
                                <button className={styles.btnPrimary} onClick={() => startScan('vol_gc')}>🚀 스캔 실행</button>
                            ) : null}
                            {scanState['vol_gc'] && scanState['vol_gc'].is_running && (
                                <div className={styles.progContainer}>
                                    <span className={styles.progMessage}>{scanState['vol_gc'].message} (발견: {scanState['vol_gc'].signals_found})</span>
                                    <button className={styles.btnDanger} onClick={() => stopScan('vol_gc')}>🛑중지</button>
                                </div>
                            )}
                            {scanState['vol_gc'] && !scanState['vol_gc'].is_running && scanState['vol_gc'].progress >= 100 && (
                                <div className={styles.progContainer}>
                                    <span className={styles.progMessage}>{scanState['vol_gc'].message}</span>
                                </div>
                            )}
                        </div>
                    </h2>
                    <div className={styles.tabs}>
                        <button className={`${styles.tabBtn} ${activeTabVol === 'vol-kospi' ? styles.active : ''}`} onClick={() => setActiveTabVol('vol-kospi')}>KOSPI</button>
                        <button className={`${styles.tabBtn} ${activeTabVol === 'vol-kosdaq' ? styles.active : ''}`} onClick={() => setActiveTabVol('vol-kosdaq')}>KOSDAQ</button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    {['순위', '종목명', '시가총액(억)', '종가', 'V_MA5', 'V_MA20', '비율(배)'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTabVol === 'vol-kospi'
                                    ? renderTable(tablesData.vol_gc_kospi, ['순위', '종목명', '시가총액(억원)', '종가', 'V_MA5', 'V_MA20', 'Volume_Ratio(배)'])
                                    : renderTable(tablesData.vol_gc_kosdaq, ['순위', '종목명', '시가총액(억원)', '종가', 'V_MA5', 'V_MA20', 'Volume_Ratio(배)'])
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Row 3: 눌림 매수 */}
                <section className={`${styles.panel} ${styles.highlightPanel}`}>
                    <h2 className={styles.panelTitle}>
                        <span>🔥 눌림 매수 신호</span>
                        <div className={styles.scannerPanel}>
                            {!scanState['pullback']?.is_running ? (
                                <button className={styles.btnPrimary} onClick={() => startScan('pullback')}>🚀 스캔 실행</button>
                            ) : null}
                            {scanState['pullback'] && scanState['pullback'].is_running && (
                                <div className={styles.progContainer}>
                                    <span className={styles.progMessage}>{scanState['pullback'].message} (발견: {scanState['pullback'].signals_found})</span>
                                    <button className={styles.btnDanger} onClick={() => stopScan('pullback')}>🛑중지</button>
                                </div>
                            )}
                            {scanState['pullback'] && !scanState['pullback'].is_running && scanState['pullback'].progress >= 100 && (
                                <div className={styles.progContainer}>
                                    <span className={styles.progMessage}>{scanState['pullback'].message}</span>
                                </div>
                            )}
                        </div>
                    </h2>
                    <div className={styles.tabs}>
                        <button className={`${styles.tabBtn} ${activeTabPb === 'pb-kospi' ? styles.active : ''}`} onClick={() => setActiveTabPb('pb-kospi')}>KOSPI</button>
                        <button className={`${styles.tabBtn} ${activeTabPb === 'pb-kosdaq' ? styles.active : ''}`} onClick={() => setActiveTabPb('pb-kosdaq')}>KOSDAQ</button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    {['순위', '종목명', '시가총액', '종가', 'GC발생', '눌림일', '신호유형'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTabPb === 'pb-kospi'
                                    ? renderTable(tablesData.pullback_kospi, ['순위', '종목명', '시가총액(억원)', '종가', 'GC발생일', '눌림일', '신호유형'])
                                    : renderTable(tablesData.pullback_kosdaq, ['순위', '종목명', '시가총액(억원)', '종가', 'GC발생일', '눌림일', '신호유형'])
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 가이드 */}
                <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>💡 투자 전략 가이드</h2>
                    <div className={styles.guideContent}>
                        <h3 className={styles.guideH3}>매수 타점 분석</h3>
                        <ul className={styles.guideUl}>
                            <li><strong>1단계:</strong> '가격/거래량 골든크로스' 패널에서 MA20이 MA200을 상향 돌파하며 장기 상승 추세 진입 종목 확인</li>
                            <li><strong>2단계:</strong> 크로스 발생 직후 3~10일 내 저점을 다지며 MA20에 안착한 종목 대기</li>
                            <li><strong>3단계:</strong> '눌림 매수 신호' 패널에서 당일 양봉 전환 및 전일 고가를 돌파(<span className={styles.signalBadge}>🔔오늘 신호</span>) 시 적극 매수 고려</li>
                        </ul>
                    </div>
                </section>

            </main>
        </div>
    );
}
