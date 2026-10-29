"use client";

import { useEffect, useState, useMemo } from 'react';
import styles from './private.module.css';

export interface StockGemItem {
    시장: string;
    종목코드: string;
    종목명: string;
    종합점수: number;
    등급: string;
    포착알고리즘: string;
    '종가(원)': string;
    raw_price: number;
    '등락률(%)': string;
    raw_rate: number;
    '거래대금(억)': string;
    raw_val_eok: number;
    '20일거래량배수': string;
    raw_vol_ratio: number;
    '회전율(%)': string;
    raw_turnover: number;
    '20일이격도': string;
    MA5?: string;
    MA20?: string;
    MA60?: string;
    MA120?: string;
    당일외인순매수: string;
    당일기관순매수: string;
    '10일외인매수일': string;
    '10일기관매수일': string;
    '10일합산순매수': string;
    '시총대비매집(%)': string;
    외인보유율: string;
    '추세점수(25)': number;
    '거래량점수(25)': number;
    '수급강도(30)': number;
    '연속성점수(20)': number;
    algo1: boolean;
    algo1_note: string;
    algo2: boolean;
    algo2_note: string;
    algo3: boolean;
    algo3_note: string;
    algo4: boolean;
    algo4_note: string;
    algo_ma?: boolean;
    algo_ma_note?: string;
    AI_전략코멘트: string;
    종합순위: number;
}

export interface MidtermGemsPayload {
    target_date: string;
    krx_base_date: string;
    min_val_eok: number;
    updated_at: string;
    top30_overall: StockGemItem[];
    algo1_pullback: StockGemItem[];
    algo2_stealth: StockGemItem[];
    algo3_breakout: StockGemItem[];
    algo4_smart_money: StockGemItem[];
    algo_ma_aligned?: StockGemItem[];
    all_evaluated: StockGemItem[];
}

interface DateWarningState {
    type: 'FUTURE_DATE' | 'HOLIDAY_OR_NO_DATA' | 'INVALID_DATE';
    inputRaw: string;
    formattedInput: string;
    title: string;
    details: string[];
    latestDate: string;
    nearestPrevDate?: string;
    canRunScriptForDate?: boolean;
    cleanYmd?: string;
}

type TabKey = 'top30' | 'algo1' | 'algo2' | 'algo3' | 'algo4' | 'algo_ma' | 'all';
type MarketFilter = 'ALL' | 'KOSPI' | 'KOSDAQ';

const WEEKDAY_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const WEEKDAY_SHORT_KO = ['일', '월', '화', '수', '목', '금', '토'];

const TAB_CONFIG: Record<
    TabKey,
    {
        label: string;
        shortBadge: string;
        title: string;
        principle: string;
        noteKey?: keyof StockGemItem;
    }
> = {
    top30: {
        label: '🌟 Part 1: 종합 랭킹 Top 30',
        shortBadge: '알고리즘 5',
        title: '🌟 [Part 1: 알고리즘 5] 100점 만점 멀티팩터 중단기 종합 랭킹 Top 30',
        principle:
            '추세·이격도(25점) + 거래량·회전율 품질(25점) + 수급강도(30점) + 수급연속성·시너지(20점) = 100점 만점 종합 채점 상위 30선',
    },
    algo1: {
        label: '🎯 Part 2: #1 눌림목',
        shortBadge: '🎯#1눌림목',
        title: "🎯 [Part 2: 알고리즘 1] 대량거래 기준봉 후 '거래량 급감 눌림목 + 수급 홀딩' 종목",
        principle:
            '최근 15일 내 대량거래 양봉(기준봉) 발생 후, 거래량이 마르며 20일선을 지지하고 외인/기관 수급이 유지되는 스윙 타점',
        noteKey: 'algo1_note',
    },
    algo2: {
        label: '🕵️ Part 3: #2 연속매집',
        shortBadge: '🕵️#2연속매집',
        title: "🕵️ [Part 3: 알고리즘 2] 변동성 수축(VCP) + 외인/기관 '조용한 연속 매집' 종목",
        principle:
            '주가 과열 없이 안정된 이격도에서 최근 10거래일 중 6일 이상 외국인/기관이 꾸준히 지분을 매집한 종목',
        noteKey: 'algo2_note',
    },
    algo3: {
        label: '🚀 Part 4: #3 초입돌파',
        shortBadge: '🚀#3초입돌파',
        title: "🚀 [Part 4: 알고리즘 3] 과열 배제형(적정 회전율 0.8~22%) '초입 진성 거래량 돌파' 종목",
        principle:
            '20일 평균 거래량 대비 1.8배 이상 돌파하면서 회전율이 22% 이하로 건전하고 외인/기관 수급이 동반된 초입 돌파주',
        noteKey: 'algo3_note',
    },
    algo4: {
        label: '📈 Part 5: #4 외인지분↑',
        shortBadge: '📈#4외인지분↑',
        title: '📈 [Part 5: 알고리즘 4] 외인 지분율 추세 상승 + 최근 3일 기관 동반 유입 (Smart Money) 종목',
        principle:
            '최근 10~20일간 외국인 보유 지분율이 추세적으로 상승하고 최근 3일 기관 순매수까지 가세한 종목',
        noteKey: 'algo4_note',
    },
    algo_ma: {
        label: '📐 Part 6: 이평선 정배열 (5>20>60>120)',
        shortBadge: '📐5>20>60>120',
        title: '📐 [Part 6: 이동평균선 투자의 정석] 5일 > 20일 > 60일 > 120일 완전 정배열 (Stage 1) 종목',
        principle:
            '단기(5일) > 중기(20일) > 수급(60일) > 경기(120일) 이동평균선이 위에서부터 차례대로 정렬된 제1스테이지 완전 정배열 추세 종목',
        noteKey: 'algo_ma_note',
    },
    all: {
        label: '📋 전체 채점 종목',
        shortBadge: '전체 유니버스',
        title: '📋 전체 발굴 대상 채점 결과 리스트',
        principle:
            '최소 거래대금 기준을 통과한 코스피·코스닥 우량 보통주 전체의 멀티팩터 채점 및 포착 알고리즘 상세 내역',
        noteKey: 'AI_전략코멘트',
    },
};

function formatDateReadable(yyyymmdd?: string): string {
    if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '-';
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function formatDateWithDay(yyyymmdd?: string): string {
    if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '-';
    const y = parseInt(yyyymmdd.slice(0, 4), 10);
    const m = parseInt(yyyymmdd.slice(4, 6), 10);
    const d = parseInt(yyyymmdd.slice(6, 8), 10);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return formatDateReadable(yyyymmdd);
    return `${formatDateReadable(yyyymmdd)} (${WEEKDAY_SHORT_KO[dt.getDay()]})`;
}

function formatChipLabel(yyyymmdd: string, isLatest: boolean): string {
    if (yyyymmdd.length !== 8) return yyyymmdd;
    const mm = yyyymmdd.slice(4, 6);
    const dd = yyyymmdd.slice(6, 8);
    return isLatest ? `${mm}/${dd} (최신)` : `${mm}/${dd}`;
}

/**
 * YYYY-MM-DD 또는 YYYYMMDD 문자열을 검증하여 유효한 달력 날짜인지 판별
 */
function parseAndValidateYmd(rawInput: string): {
    valid: boolean;
    ymd: string;
    formatted: string;
    dateObj?: Date;
    weekdayKo?: string;
    isWeekend?: boolean;
} {
    const cleaned = rawInput.replace(/[-/.]/g, '').trim();
    if (!/^\d{8}$/.test(cleaned)) {
        return { valid: false, ymd: cleaned, formatted: rawInput };
    }
    const y = parseInt(cleaned.slice(0, 4), 10);
    const m = parseInt(cleaned.slice(4, 6), 10);
    const d = parseInt(cleaned.slice(6, 8), 10);

    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
        return { valid: false, ymd: cleaned, formatted: `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}` };
    }

    const dt = new Date(y, m - 1, d);
    // 실제 달력 날짜와 일치하는지 확인 (예: 2026-02-30 방지)
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
        return { valid: false, ymd: cleaned, formatted: `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}` };
    }

    const dayIdx = dt.getDay();
    return {
        valid: true,
        ymd: cleaned,
        formatted: `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`,
        dateObj: dt,
        weekdayKo: WEEKDAY_KO[dayIdx],
        isWeekend: dayIdx === 0 || dayIdx === 6,
    };
}

/**
 * 입력 날짜(ymd)보다 앞서 있는 가장 가까운 정상 거래일 계산
 * 1순위: availableDates 내 직전 거래일
 * 2순위: 주말(토/일)일 경우 직전 금요일 계산
 */
function computeNearestPrevTradingDate(ymd: string, availableDates: string[], latestDate: string): string {
    const sortedDesc = [...availableDates].sort().reverse();
    const fromAvailable = sortedDesc.find((d) => d < ymd);
    if (fromAvailable) {
        return fromAvailable;
    }

    const parsed = parseAndValidateYmd(ymd);
    if (parsed.valid && parsed.dateObj) {
        const cur = new Date(parsed.dateObj.getTime());
        cur.setDate(cur.getDate() - 1);
        while (cur.getDay() === 0 || cur.getDay() === 6) {
            cur.setDate(cur.getDate() - 1);
        }
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const candidate = `${y}${m}${d}`;
        if (candidate <= latestDate) {
            return candidate;
        }
    }

    return sortedDesc[sortedDesc.length - 1] || latestDate;
}

export default function DashboardClient() {
    const [payload, setPayload] = useState<MidtermGemsPayload | null>(null);
    const [availableDates, setAvailableDates] = useState<string[]>(['20261028']);
    const [latestDate, setLatestDate] = useState<string>('20261028');
    const [dateInputText, setDateInputText] = useState<string>('2026-10-28');
    const [dateWarning, setDateWarning] = useState<DateWarningState | null>(null);

    const [loading, setLoading] = useState<boolean>(true);
    const [runningScript, setRunningScript] = useState<boolean>(false);
    const [canRunLocalScript, setCanRunLocalScript] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<TabKey>('top30');
    const [marketFilter, setMarketFilter] = useState<MarketFilter>('ALL');
    const [gradeFilter, setGradeFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<string>('');

    // 초기 최신 데이터 및 날짜 인덱스 로드
    const loadInitialData = async () => {
        setLoading(true);
        setStatusMessage('');
        setDateWarning(null);
        try {
            // 1. 날짜 인덱스 확인 (/data/midterm_gems_dates.json)
            let idxAvail: string[] = [];
            let idxLatest = '';
            try {
                const idxRes = await fetch('/data/midterm_gems_dates.json', { cache: 'no-store' });
                if (idxRes.ok) {
                    const idxJson = await idxRes.json();
                    if (Array.isArray(idxJson.available_dates)) idxAvail = idxJson.available_dates;
                    if (idxJson.latest_date) idxLatest = idxJson.latest_date;
                }
            } catch {
                // ignore
            }

            // 2. API 라우트 조회
            const res = await fetch('/api/midterm-gems', { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json.ok && json.data) {
                    const mergedAvail = Array.from(
                        new Set([...(json.availableDates || []), ...idxAvail, json.data.target_date])
                    )
                        .filter(Boolean)
                        .sort()
                        .reverse();
                    const topLatest = mergedAvail[0] || json.latestDate || idxLatest || json.data.target_date;

                    setPayload(json.data);
                    setAvailableDates(mergedAvail);
                    setLatestDate(topLatest);
                    setDateInputText(formatDateReadable(json.data.target_date));
                    setCanRunLocalScript(Boolean(json.canRunLocalScript));
                    setLoading(false);
                    return;
                }
            }

            // 3. 정적 파일 폴백
            const fallbackRes = await fetch('/data/midterm_gems_latest.json', { cache: 'no-store' });
            if (fallbackRes.ok) {
                const fallbackData: MidtermGemsPayload = await fallbackRes.json();
                const mergedAvail = Array.from(new Set([...idxAvail, fallbackData.target_date]))
                    .filter(Boolean)
                    .sort()
                    .reverse();
                setPayload(fallbackData);
                setAvailableDates(mergedAvail);
                setLatestDate(mergedAvail[0] || fallbackData.target_date);
                setDateInputText(formatDateReadable(fallbackData.target_date));
            }
        } catch (err) {
            console.error('Failed to load midterm gems data:', err);
            setStatusMessage('데이터 로드 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * 특정 기준일(YYYYMMDD 또는 YYYY-MM-DD) 선택/조회 처리
     */
    const handleSelectDate = async (rawInput: string) => {
        setStatusMessage('');
        const parsed = parseAndValidateYmd(rawInput);

        // 케이스 ③ 잘못된 날짜 형식이나 달력에 없는 날짜
        if (!parsed.valid) {
            setDateWarning({
                type: 'INVALID_DATE',
                inputRaw: rawInput,
                formattedInput: parsed.formatted,
                title: `⚠️ [날짜 입력 오류] 입력하신 '${rawInput}'는 날짜 형식이 올바르지 않거나 달력에 존재하지 않는 날짜입니다.`,
                details: ['▶ 8자리 숫자(YYYYMMDD) 또는 달력(YYYY-MM-DD)에서 올바른 거래일을 선택해 주세요.'],
                latestDate,
            });
            return;
        }

        const targetYmd = parsed.ymd;

        // 케이스 ① 미래 날짜를 입력/선택한 경우 (targetDate > latestDate)
        if (targetYmd > latestDate) {
            setDateWarning({
                type: 'FUTURE_DATE',
                inputRaw: rawInput,
                formattedInput: parsed.formatted,
                title: `⚠️ [미래 날짜 경고] 입력하신 [${parsed.formatted}]는 아직 거래 데이터가 없는 미래 날짜입니다!`,
                details: [`▶ 현재 분석 가능한 가장 최신 거래일: [${formatDateReadable(latestDate)}]`],
                latestDate,
                cleanYmd: targetYmd,
            });
            return;
        }

        // 케이스 ②-A 주말(토·일)을 선택한 경우 즉시 경고 배너 표시
        if (parsed.isWeekend) {
            const nearestPrev = computeNearestPrevTradingDate(targetYmd, availableDates, latestDate);
            setDateWarning({
                type: 'HOLIDAY_OR_NO_DATA',
                inputRaw: rawInput,
                formattedInput: `${parsed.formatted} (${parsed.weekdayKo})`,
                title: `⚠️ [휴장일 / 데이터 없음 경고] 입력하신 [${parsed.formatted} (${parsed.weekdayKo})]은 주말(휴장일)이거나 분석 데이터를 판별할 수 없는 날짜입니다!`,
                details: [
                    `▶ 입력하신 날짜 직전의 가장 가까운 정상 거래일: [${formatDateWithDay(nearestPrev)}]`,
                ],
                latestDate,
                nearestPrevDate: nearestPrev,
                canRunScriptForDate: false,
                cleanYmd: targetYmd,
            });
            return;
        }

        // 정상 평일인 경우: 1) 정적 파일(/data/midterm_gems_ALL_{YYYYMMDD}.json) 먼저 조회
        setLoading(true);
        try {
            const staticRes = await fetch(`/data/midterm_gems_ALL_${targetYmd}.json`, { cache: 'no-store' });
            if (staticRes.ok) {
                const staticData: MidtermGemsPayload = await staticRes.json();
                setPayload(staticData);
                setDateInputText(formatDateReadable(targetYmd));
                setDateWarning(null);
                setLoading(false);
                return;
            }

            // 2) API 라우트(/api/midterm-gems?date=YYYYMMDD) 조회
            const apiRes = await fetch(`/api/midterm-gems?date=${targetYmd}`, { cache: 'no-store' });
            const apiJson = await apiRes.json().catch(() => ({}));
            if (apiRes.ok && apiJson.ok && apiJson.data) {
                setPayload(apiJson.data);
                if (Array.isArray(apiJson.availableDates)) {
                    setAvailableDates(apiJson.availableDates);
                }
                setDateInputText(formatDateReadable(targetYmd));
                setDateWarning(null);
                setLoading(false);
                return;
            }

            // 케이스 ②-B 평일이지만 공휴일(휴장일)이거나 아직 해당 날짜 JSON 데이터가 생성되지 않은 경우
            const nearestPrev =
                apiJson.nearestPrevDate || computeNearestPrevTradingDate(targetYmd, availableDates, latestDate);
            setDateWarning({
                type: 'HOLIDAY_OR_NO_DATA',
                inputRaw: rawInput,
                formattedInput: `${parsed.formatted} (${parsed.weekdayKo})`,
                title: `⚠️ [휴장일 / 데이터 없음 경고] 입력하신 [${parsed.formatted} (${parsed.weekdayKo})]은 공휴일(휴장일)이거나 분석 데이터를 판별할 수 없는 날짜입니다!`,
                details: [
                    `▶ 입력하신 날짜 직전의 가장 가까운 정상 거래일: [${formatDateWithDay(nearestPrev)}]`,
                ],
                latestDate,
                nearestPrevDate: nearestPrev,
                canRunScriptForDate: Boolean(apiJson.canRunLocalScript ?? canRunLocalScript),
                cleanYmd: targetYmd,
            });
        } catch (err) {
            console.error('Date fetch error:', err);
            const nearestPrev = computeNearestPrevTradingDate(targetYmd, availableDates, latestDate);
            setDateWarning({
                type: 'HOLIDAY_OR_NO_DATA',
                inputRaw: rawInput,
                formattedInput: `${parsed.formatted} (${parsed.weekdayKo})`,
                title: `⚠️ [휴장일 / 데이터 없음 경고] 입력하신 [${parsed.formatted} (${parsed.weekdayKo})]의 데이터를 불러올 수 없습니다.`,
                details: [`▶ 입력하신 날짜 직전의 가장 가까운 정상 거래일: [${formatDateWithDay(nearestPrev)}]`],
                latestDate,
                nearestPrevDate: nearestPrev,
                canRunScriptForDate: canRunLocalScript,
                cleanYmd: targetYmd,
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * 로컬/백엔드 파이썬 스크립트로 특정 기준일(또는 최신일) 실시간 분석 실행
     */
    const handleRunLocalAnalysis = async (specificDateYmd?: string) => {
        if (runningScript) return;
        const targetYmd = specificDateYmd || payload?.target_date || '';
        setRunningScript(true);
        setStatusMessage(
            `⏳ [${targetYmd ? formatDateReadable(targetYmd) : '최신 거래일'}] 기준 과거 60거래일 백데이터 + 20일 수급 재계산 중... (약 15~30초 소요)`
        );
        try {
            const res = await fetch('/api/midterm-gems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetDate: targetYmd }),
            });
            const json = await res.json();

            if (json.ok && json.data) {
                setPayload(json.data);
                if (Array.isArray(json.availableDates)) {
                    setAvailableDates(json.availableDates);
                }
                if (json.latestDate) {
                    setLatestDate(json.latestDate);
                }
                setDateInputText(formatDateReadable(json.data.target_date));
                setDateWarning(null);
                setStatusMessage(
                    `✅ [${formatDateReadable(json.data.target_date)}] 기준 60거래일 슬라이딩 재계산 및 동기화 완료!`
                );
            } else if (json.errorType) {
                const parsed = parseAndValidateYmd(targetYmd);
                setDateWarning({
                    type: json.errorType,
                    inputRaw: targetYmd,
                    formattedInput: parsed.formatted,
                    title:
                        json.scriptWarningTitle ||
                        `⚠️ [휴장일 / 데이터 없음 경고] 입력하신 [${parsed.formatted}]은 분석 데이터를 판별할 수 없는 날짜입니다!`,
                    details:
                        Array.isArray(json.scriptWarningDetails) && json.scriptWarningDetails.length > 0
                            ? json.scriptWarningDetails
                            : [
                                  `▶ 입력하신 날짜 직전의 가장 가까운 정상 거래일: [${formatDateReadable(
                                      json.nearestPrevDate || latestDate
                                  )}]`,
                              ],
                    latestDate: json.latestDate || latestDate,
                    nearestPrevDate: json.nearestPrevDate || latestDate,
                    canRunScriptForDate: false,
                    cleanYmd: targetYmd,
                });
                setStatusMessage('');
            } else {
                setStatusMessage(`⚠️ ${json.message || '실행 실패'}`);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatusMessage(`⚠️ 실행 오류: ${msg}`);
        } finally {
            setRunningScript(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // 현재 선택된 날짜의 availableDates 내 인덱스 (이전/다음 거래일 이동용)
    const currentActiveYmd = payload?.target_date || latestDate;
    const currentIdxInAvail = availableDates.indexOf(currentActiveYmd);
    // availableDates는 내림차순 정렬 (예: ['20261028', '20261027', '20261026', '20261023'])
    const prevTradingDate =
        currentIdxInAvail >= 0 && currentIdxInAvail + 1 < availableDates.length
            ? availableDates[currentIdxInAvail + 1]
            : null;
    const nextTradingDate =
        currentIdxInAvail > 0 ? availableDates[currentIdxInAvail - 1] : null;

    const summaryCounts = useMemo(() => {
        const all = payload?.all_evaluated || [];
        return {
            total: all.length,
            sGrade: all.filter((i) => i.등급?.includes('S등급')).length,
            aGrade: all.filter((i) => i.등급?.includes('A등급')).length,
            bGrade: all.filter((i) => i.등급?.includes('B등급')).length,
            algo1: payload?.algo1_pullback?.length || 0,
            algo2: payload?.algo2_stealth?.length || 0,
            algo3: payload?.algo3_breakout?.length || 0,
            algo4: payload?.algo4_smart_money?.length || 0,
            algoMa:
                payload?.algo_ma_aligned?.length ??
                all.filter((i) => i.algo_ma || i.포착알고리즘?.includes('5>20>60>120')).length,
        };
    }, [payload]);

    const currentList = useMemo(() => {
        if (!payload) return [];
        let list: StockGemItem[] = [];
        switch (activeTab) {
            case 'top30':
                list = payload.top30_overall || [];
                break;
            case 'algo1':
                list = payload.algo1_pullback || [];
                break;
            case 'algo2':
                list = payload.algo2_stealth || [];
                break;
            case 'algo3':
                list = payload.algo3_breakout || [];
                break;
            case 'algo4':
                list = payload.algo4_smart_money || [];
                break;
            case 'algo_ma':
                list =
                    payload.algo_ma_aligned ||
                    (payload.all_evaluated || []).filter(
                        (i) => i.algo_ma || i.포착알고리즘?.includes('5>20>60>120')
                    );
                break;
            case 'all':
                list = payload.all_evaluated || [];
                break;
        }

        return list.filter((item) => {
            if (marketFilter !== 'ALL' && item.시장 !== marketFilter) return false;
            if (gradeFilter !== 'ALL') {
                if (gradeFilter === 'S' && !item.등급?.includes('S등급')) return false;
                if (gradeFilter === 'A' && !item.등급?.includes('A등급')) return false;
                if (gradeFilter === 'B' && !item.등급?.includes('B등급')) return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const matchName = item.종목명?.toLowerCase().includes(q);
                const matchCode = item.종목코드?.toLowerCase().includes(q);
                const matchAlgo = item.포착알고리즘?.toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchAlgo) return false;
            }
            return true;
        });
    }, [payload, activeTab, marketFilter, gradeFilter, searchQuery]);

    const renderGradeBadge = (grade: string) => {
        if (!grade) return <span className={styles.gradeNormal}>-</span>;
        if (grade.includes('S등급')) {
            return <span className={`${styles.gradeBadge} ${styles.gradeS}`}>{grade}</span>;
        }
        if (grade.includes('A등급')) {
            return <span className={`${styles.gradeBadge} ${styles.gradeA}`}>{grade}</span>;
        }
        if (grade.includes('B등급')) {
            return <span className={`${styles.gradeBadge} ${styles.gradeB}`}>{grade}</span>;
        }
        return <span className={`${styles.gradeBadge} ${styles.gradeNormal}`}>{grade}</span>;
    };

    const renderAlgoBadges = (algoStr: string) => {
        if (!algoStr || algoStr === '-') {
            return <span className={styles.emptyDash}>-</span>;
        }
        const tags = algoStr.split(/\s+/).filter(Boolean);
        return (
            <div className={styles.algoTagList}>
                {tags.map((tag) => {
                    let tagClass = styles.algoTagDefault;
                    if (tag.includes('#1눌림목')) tagClass = styles.algoTag1;
                    else if (tag.includes('#2연속매집')) tagClass = styles.algoTag2;
                    else if (tag.includes('#3초입돌파')) tagClass = styles.algoTag3;
                    else if (tag.includes('#4외인지분')) tagClass = styles.algoTag4;
                    else if (tag.includes('5>20>60>120')) tagClass = styles.algoTagMa;
                    return (
                        <span key={tag} className={`${styles.algoBadge} ${tagClass}`}>
                            {tag}
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderMarketBadge = (market: string) => {
        const isKospi = market === 'KOSPI';
        return (
            <span className={`${styles.marketBadge} ${isKospi ? styles.marketKospi : styles.marketKosdaq}`}>
                {market}
            </span>
        );
    };

    const renderRateValue = (rateStr: string, rawRate?: number) => {
        const val = rawRate !== undefined ? rawRate : parseFloat(String(rateStr).replace('%', ''));
        const cls = val > 0 ? styles.rateUp : val < 0 ? styles.rateDown : styles.rateFlat;
        return <span className={cls}>{rateStr}</span>;
    };

    const renderStockLink = (item: StockGemItem) => {
        const rawCode = String(item.종목코드 || '').replace(/,/g, '').trim();
        const paddedCode = rawCode.padStart(6, '0');
        const naverUrl = `https://finance.naver.com/item/main.naver?code=${paddedCode}`;

        return (
            <div className={styles.stockCell}>
                <a
                    href={naverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.stockNameLink}
                    title={`${item.종목명} (${paddedCode}) 네이버 증권 새 탭 열기`}
                >
                    {item.종목명}
                </a>
                <a
                    href={naverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.stockCodeLink}
                    title={`종목코드 ${paddedCode} 네이버 증권 열기`}
                >
                    {paddedCode} ↗
                </a>
            </div>
        );
    };

    const activeConfig = TAB_CONFIG[activeTab];

    return (
        <div className={styles.dashboardContainer}>
            {/* 상단 헤더 */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div>
                        <div className={styles.eyebrow}>KRX 60일 백데이터 × 네이버 실시간 20일 외인·기관 수급 결합</div>
                        <h1>💎 중단기 5대 알고리즘 종목 발굴기</h1>
                        <p className={styles.subtitle}>
                            추세·이격도(25점) + 거래량·회전율 품질(25점) + 수급강도(30점) + 수급연속성·시너지(20점) = 100점 만점 멀티팩터 채점
                        </p>
                    </div>
                    <div className={styles.actionGroup}>
                        <button
                            type="button"
                            className={styles.btnRefresh}
                            onClick={loadInitialData}
                            disabled={loading || runningScript}
                        >
                            🔄 최신 데이터 새로고침
                        </button>
                        {canRunLocalScript && (
                            <button
                                type="button"
                                className={styles.btnRunScript}
                                onClick={() => handleRunLocalAnalysis(payload?.target_date)}
                                disabled={runningScript}
                            >
                                {runningScript ? '⏳ 분석 실행 중...' : '⚡ 현재 기준일 재분석'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 요약 메타데이터 3단 카드 바 */}
                <div className={styles.metaGrid}>
                    {/* 1. 업그레이드된 인터랙티브 [📅 분석 기준일] 선택 카드 */}
                    <div className={`${styles.metaCard} ${styles.metaCardDate}`}>
                        <div className={styles.dateCardHeader}>
                            <span className={styles.metaLabel}>📅 분석 기준일 (T) 선택 · 조회</span>
                            <div className={styles.navArrowGroup}>
                                <button
                                    type="button"
                                    className={styles.btnNavArrow}
                                    disabled={!prevTradingDate || loading}
                                    onClick={() => prevTradingDate && handleSelectDate(prevTradingDate)}
                                    title={
                                        prevTradingDate
                                            ? `이전 거래일 (${formatDateReadable(prevTradingDate)})`
                                            : '이전 거래일 데이터 없음'
                                    }
                                >
                                    ◀ 이전 거래일
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnNavArrow}
                                    disabled={!nextTradingDate || loading}
                                    onClick={() => nextTradingDate && handleSelectDate(nextTradingDate)}
                                    title={
                                        nextTradingDate
                                            ? `다음 거래일 (${formatDateReadable(nextTradingDate)})`
                                            : '가장 최신 거래일입니다'
                                    }
                                >
                                    다음 거래일 ▶
                                </button>
                            </div>
                        </div>

                        <div className={styles.currentDateDisplayRow}>
                            <strong className={styles.metaValue}>
                                {formatDateWithDay(payload?.target_date)}
                            </strong>
                            <span className={styles.metaSubBadge}>
                                KRX 60일 백데이터: {formatDateReadable(payload?.krx_base_date)}
                            </span>
                        </div>

                        {/* 달력 선택기 + 직접 입력 + 조회 버튼 */}
                        <form
                            className={styles.dateInputRow}
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSelectDate(dateInputText);
                            }}
                        >
                            <input
                                type="date"
                                className={styles.datePickerInput}
                                value={
                                    /^\d{4}-\d{2}-\d{2}$/.test(dateInputText)
                                        ? dateInputText
                                        : formatDateReadable(payload?.target_date)
                                }
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDateInputText(val);
                                    if (val) handleSelectDate(val);
                                }}
                                aria-label="분석 기준일 달력 선택"
                            />
                            <input
                                type="text"
                                className={styles.dateTextInput}
                                value={dateInputText}
                                onChange={(e) => setDateInputText(e.target.value)}
                                placeholder="YYYYMMDD 또는 YYYY-MM-DD"
                                aria-label="분석 기준일 직접 입력"
                            />
                            <button type="submit" className={styles.btnDateLookup} disabled={loading}>
                                조회
                            </button>
                        </form>

                        {/* 최근 거래일 빠른 선택 칩(Chip) */}
                        <div className={styles.dateChipRow}>
                            <span className={styles.chipRowLabel}>최근 거래일:</span>
                            {availableDates.slice(0, 7).map((d, idx) => {
                                const isActive = d === payload?.target_date;
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`${styles.dateChip} ${isActive ? styles.dateChipActive : ''}`}
                                        onClick={() => handleSelectDate(d)}
                                    >
                                        {formatChipLabel(d, idx === 0)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. 등급별 분포 카드 */}
                    <div className={styles.metaCard}>
                        <span className={styles.metaLabel}>🏆 등급별 분포 (최소 {payload?.min_val_eok ?? 10}억↑)</span>
                        <div className={styles.gradeSummaryRow}>
                            <span className={`${styles.gradeBadge} ${styles.gradeS}`}>🌟 S등급 {summaryCounts.sGrade}</span>
                            <span className={`${styles.gradeBadge} ${styles.gradeA}`}>🏆 A등급 {summaryCounts.aGrade}</span>
                            <span className={`${styles.gradeBadge} ${styles.gradeB}`}>✨ B등급 {summaryCounts.bGrade}</span>
                        </div>
                        <span className={styles.metaSub}>
                            [{formatDateReadable(payload?.target_date)}] 채점 유니버스: 총 {summaryCounts.total}종목
                        </span>
                    </div>

                    {/* 3. 특화 알고리즘 포착 수 카드 */}
                    <div className={styles.metaCard}>
                        <span className={styles.metaLabel}>🎯 특화 알고리즘 & 이평선 정배열 포착 수</span>
                        <div className={styles.algoCountRow}>
                            <span className={`${styles.algoBadge} ${styles.algoTag1}`}>🎯#1눌림목 {summaryCounts.algo1}</span>
                            <span className={`${styles.algoBadge} ${styles.algoTag2}`}>🕵️#2연속매집 {summaryCounts.algo2}</span>
                            <span className={`${styles.algoBadge} ${styles.algoTag3}`}>🚀#3초입돌파 {summaryCounts.algo3}</span>
                            <span className={`${styles.algoBadge} ${styles.algoTag4}`}>📈#4외인지분↑ {summaryCounts.algo4}</span>
                            <span className={`${styles.algoBadge} ${styles.algoTagMa}`}>📐5&gt;20&gt;60&gt;120 {summaryCounts.algoMa}</span>
                        </div>
                        <span className={styles.metaSub}>업데이트: {payload?.updated_at || '-'}</span>
                    </div>
                </div>

                {/* 슬라이딩 60거래일 기준 안내 배지 */}
                <div className={styles.slidingNoticeBar}>
                    💡 선택한 기준일(T)의 장마감 거래를 기준으로, <strong>그 날로부터 과거 60거래일 주가·거래량(이격도·회전율)</strong> 및{' '}
                    <strong>20거래일 외인·기관 수급</strong>을 재계산합니다. (미래 데이터 참조 없음 — 기준일마다 발굴 종목·점수·순위가 달라집니다)
                </div>

                {/* 날짜 유효성 검증 경고 배너 (미래 날짜 / 휴장일·데이터 없음 / 날짜 형식 오류) */}
                {dateWarning && (
                    <div className={styles.warningAlertBox} role="alert">
                        <div className={styles.warningHeader}>
                            <strong className={styles.warningTitle}>{dateWarning.title}</strong>
                            <button
                                type="button"
                                className={styles.btnWarningClose}
                                onClick={() => setDateWarning(null)}
                                aria-label="경고 닫기"
                            >
                                ✕
                            </button>
                        </div>
                        <ul className={styles.warningDetailList}>
                            {dateWarning.details.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                        <div className={styles.warningActionRow}>
                            {dateWarning.type === 'FUTURE_DATE' && (
                                <button
                                    type="button"
                                    className={styles.btnWarningPrimary}
                                    onClick={() => handleSelectDate(dateWarning.latestDate)}
                                >
                                    📅 최신 거래일({formatDateReadable(dateWarning.latestDate)}) 데이터 보기
                                </button>
                            )}

                            {dateWarning.type === 'HOLIDAY_OR_NO_DATA' && (
                                <>
                                    {dateWarning.nearestPrevDate && (
                                        <button
                                            type="button"
                                            className={styles.btnWarningPrimary}
                                            onClick={() =>
                                                dateWarning.nearestPrevDate &&
                                                handleSelectDate(dateWarning.nearestPrevDate)
                                            }
                                        >
                                            ◀ 직전 거래일({formatDateReadable(dateWarning.nearestPrevDate)})로 이동
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={styles.btnWarningSecondary}
                                        onClick={() => handleSelectDate(dateWarning.latestDate)}
                                    >
                                        최신 거래일({formatDateReadable(dateWarning.latestDate)}) 보기
                                    </button>
                                    {dateWarning.canRunScriptForDate && dateWarning.cleanYmd && (
                                        <button
                                            type="button"
                                            className={styles.btnWarningRun}
                                            disabled={runningScript}
                                            onClick={() =>
                                                dateWarning.cleanYmd && handleRunLocalAnalysis(dateWarning.cleanYmd)
                                            }
                                        >
                                            ⚡ 이 날짜({dateWarning.cleanYmd}) 실시간 분석 실행
                                        </button>
                                    )}
                                </>
                            )}

                            {dateWarning.type === 'INVALID_DATE' && (
                                <button
                                    type="button"
                                    className={styles.btnWarningPrimary}
                                    onClick={() => handleSelectDate(dateWarning.latestDate)}
                                >
                                    📅 최신 거래일({formatDateReadable(dateWarning.latestDate)}) 데이터 보기
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {statusMessage && <div className={styles.statusBanner}>{statusMessage}</div>}
            </header>

            {/* 5대 핵심 알고리즘 파트 탭 네비게이션 */}
            <nav className={styles.partTabs}>
                {(Object.keys(TAB_CONFIG) as TabKey[]).map((key) => {
                    const cfg = TAB_CONFIG[key];
                    let count = 0;
                    if (key === 'top30') count = payload?.top30_overall?.length || 0;
                    else if (key === 'algo1') count = payload?.algo1_pullback?.length || 0;
                    else if (key === 'algo2') count = payload?.algo2_stealth?.length || 0;
                    else if (key === 'algo3') count = payload?.algo3_breakout?.length || 0;
                    else if (key === 'algo4') count = payload?.algo4_smart_money?.length || 0;
                    else if (key === 'algo_ma') count = summaryCounts.algoMa;
                    else if (key === 'all') count = payload?.all_evaluated?.length || 0;

                    return (
                        <button
                            key={key}
                            type="button"
                            className={`${styles.partTabBtn} ${activeTab === key ? styles.partTabActive : ''}`}
                            onClick={() => setActiveTab(key)}
                        >
                            <span>{cfg.label}</span>
                            <span className={styles.tabCount}>{count}</span>
                        </button>
                    );
                })}
            </nav>

            {/* 메인 테이블 패널 */}
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2 className={styles.panelTitle}>
                            {activeConfig.title}{' '}
                            <span className={styles.titleDateBadge}>
                                기준일: {formatDateReadable(payload?.target_date)}
                            </span>
                        </h2>
                        <p className={styles.principleBox}>
                            💡 <strong>핵심 원리:</strong> {activeConfig.principle}
                        </p>
                    </div>

                    {/* 필터 및 검색 컨트롤 */}
                    <div className={styles.filterBar}>
                        <div className={styles.SegmentedGroup}>
                            {(['ALL', 'KOSPI', 'KOSDAQ'] as MarketFilter[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={`${styles.segBtn} ${marketFilter === m ? styles.segBtnActive : ''}`}
                                    onClick={() => setMarketFilter(m)}
                                >
                                    {m === 'ALL' ? '전체 시장' : m}
                                </button>
                            ))}
                        </div>

                        <select
                            className={styles.selectBox}
                            value={gradeFilter}
                            onChange={(e) => setGradeFilter(e.target.value)}
                            aria-label="등급 필터"
                        >
                            <option value="ALL">전체 등급</option>
                            <option value="S">🌟 S등급 (80점+)</option>
                            <option value="A">🏆 A등급 (65~79점)</option>
                            <option value="B">✨ B등급 (50~64점)</option>
                        </select>

                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="종목명 · 종목코드 · 태그 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* 데이터 테이블 */}
                <div className={styles.tableWrapper}>
                    {loading ? (
                        <div className={styles.emptyMsg}>데이터를 불러오는 중입니다...</div>
                    ) : currentList.length === 0 ? (
                        <div className={styles.emptyMsg}>조건에 해당하는 종목이 없습니다.</div>
                    ) : activeTab === 'top30' || activeTab === 'all' ? (
                        /* Part 1 (종합 랭킹 Top 30) 및 전체 채점 테이블 */
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>순위</th>
                                    <th>등급</th>
                                    <th>점수 (세부팩터)</th>
                                    <th>시장</th>
                                    <th className={styles.alignLeft}>종목명 (코드)</th>
                                    <th>종가(원)</th>
                                    <th>등락률</th>
                                    <th>거래대금</th>
                                    <th>20일이격</th>
                                    <th>회전율</th>
                                    <th>10일외인</th>
                                    <th>10일기관</th>
                                    <th>시총대비매집</th>
                                    <th>외인보유율</th>
                                    <th className={styles.alignLeft}>포착 알고리즘</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentList.map((row) => (
                                    <tr
                                        key={row.종목코드}
                                        className={row.등급?.includes('S등급') ? styles.rowSGrade : ''}
                                    >
                                        <td className={styles.rankCell}>#{row.종합순위}</td>
                                        <td>{renderGradeBadge(row.등급)}</td>
                                        <td>
                                            <div className={styles.scoreCell}>
                                                <strong className={styles.scoreMain}>{row.종합점수?.toFixed(1)}</strong>
                                                <span
                                                    className={styles.scoreSub}
                                                    title="추세(25) / 거래량(25) / 수급강도(30) / 연속성(20)"
                                                >
                                                    {row['추세점수(25)']}/{row['거래량점수(25)']}/{row['수급강도(30)']}/{row['연속성점수(20)']}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{renderMarketBadge(row.시장)}</td>
                                        <td className={styles.alignLeft}>{renderStockLink(row)}</td>
                                        <td className={styles.priceCell}>{row['종가(원)']}</td>
                                        <td>{renderRateValue(row['등락률(%)'], row.raw_rate)}</td>
                                        <td>{row['거래대금(억)']}</td>
                                        <td>{row['20일이격도']}</td>
                                        <td>{row['회전율(%)']}</td>
                                        <td>{row['10일외인매수일']}</td>
                                        <td>{row['10일기관매수일']}</td>
                                        <td
                                            className={
                                                String(row['시총대비매집(%)']).startsWith('+')
                                                    ? styles.rateUp
                                                    : String(row['시총대비매집(%)']).startsWith('-')
                                                    ? styles.rateDown
                                                    : ''
                                            }
                                        >
                                            {row['시총대비매집(%)']}
                                        </td>
                                        <td>{row.외인보유율}</td>
                                        <td className={styles.alignLeft}>{renderAlgoBadges(row.포착알고리즘)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'algo_ma' ? (
                        /* Part 6: 이동평균선 5 > 20 > 60 > 120 완전 정배열 특화 테이블 */
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>종합순위</th>
                                    <th>등급</th>
                                    <th>점수</th>
                                    <th>시장</th>
                                    <th className={styles.alignLeft}>종목명 (코드)</th>
                                    <th>종가(원)</th>
                                    <th>등락률</th>
                                    <th>거래대금</th>
                                    <th>5일선</th>
                                    <th>20일선</th>
                                    <th>60일선</th>
                                    <th>120일선</th>
                                    <th>외인보유율</th>
                                    <th className={styles.alignLeft}>포착 알고리즘</th>
                                    <th className={styles.alignLeft}>정배열(5&gt;20&gt;60&gt;120) 상세 상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentList.map((row) => {
                                    const noteText = row.algo_ma_note || row.AI_전략코멘트 || '-';
                                    return (
                                        <tr
                                            key={row.종목코드}
                                            className={row.등급?.includes('S등급') ? styles.rowSGrade : ''}
                                        >
                                            <td className={styles.rankCell}>#{row.종합순위}</td>
                                            <td>{renderGradeBadge(row.등급)}</td>
                                            <td>
                                                <strong className={styles.scoreMain}>{row.종합점수?.toFixed(1)}</strong>
                                            </td>
                                            <td>{renderMarketBadge(row.시장)}</td>
                                            <td className={styles.alignLeft}>{renderStockLink(row)}</td>
                                            <td className={styles.priceCell}>{row['종가(원)']}</td>
                                            <td>{renderRateValue(row['등락률(%)'], row.raw_rate)}</td>
                                            <td>{row['거래대금(억)']}</td>
                                            <td className={styles.ma5Cell}>{row.MA5 || '-'}</td>
                                            <td className={styles.ma20Cell}>{row.MA20 || '-'}</td>
                                            <td className={styles.ma60Cell}>{row.MA60 || '-'}</td>
                                            <td className={styles.ma120Cell}>{row.MA120 || '-'}</td>
                                            <td>{row.외인보유율}</td>
                                            <td className={styles.alignLeft}>{renderAlgoBadges(row.포착알고리즘)}</td>
                                            <td className={`${styles.alignLeft} ${styles.noteCell}`}>{noteText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        /* Part 2 ~ Part 5 (알고리즘 1~4 특화 테이블: 핵심 포착 사유 포함) */
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>종합순위</th>
                                    <th>등급</th>
                                    <th>점수</th>
                                    <th>시장</th>
                                    <th className={styles.alignLeft}>종목명 (코드)</th>
                                    <th>종가(원)</th>
                                    <th>등락률</th>
                                    <th>거래대금</th>
                                    <th>외인보유율</th>
                                    <th className={styles.alignLeft}>포착 알고리즘</th>
                                    <th className={styles.alignLeft}>핵심 포착 사유</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentList.map((row) => {
                                    const noteText = activeConfig.noteKey
                                        ? String(row[activeConfig.noteKey] || row.AI_전략코멘트 || '-')
                                        : row.AI_전략코멘트;

                                    return (
                                        <tr
                                            key={row.종목코드}
                                            className={row.등급?.includes('S등급') ? styles.rowSGrade : ''}
                                        >
                                            <td className={styles.rankCell}>#{row.종합순위}</td>
                                            <td>{renderGradeBadge(row.등급)}</td>
                                            <td>
                                                <strong className={styles.scoreMain}>{row.종합점수?.toFixed(1)}</strong>
                                            </td>
                                            <td>{renderMarketBadge(row.시장)}</td>
                                            <td className={styles.alignLeft}>{renderStockLink(row)}</td>
                                            <td className={styles.priceCell}>{row['종가(원)']}</td>
                                            <td>{renderRateValue(row['등락률(%)'], row.raw_rate)}</td>
                                            <td>{row['거래대금(억)']}</td>
                                            <td>{row.외인보유율}</td>
                                            <td className={styles.alignLeft}>{renderAlgoBadges(row.포착알고리즘)}</td>
                                            <td className={`${styles.alignLeft} ${styles.noteCell}`}>{noteText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* 하단 5대 알고리즘 상세 가이드 */}
            <section className={styles.guideSection}>
                <h3 className={styles.guideTitle}>📌 중단기 5대 알고리즘 채점 및 발굴 기준 요약</h3>
                <div className={styles.guideGrid}>
                    <div className={styles.guideCard}>
                        <h4>🌟 알고리즘 5 (100점 멀티팩터 종합)</h4>
                        <p>
                            추세·이격도(25점) + 거래량·회전율 품질(25점) + 수급강도(30점) + 수급연속성·시너지(20점)를 합산하여{' '}
                            <strong>80점↑ S등급</strong>, <strong>65점↑ A등급</strong>, <strong>50점↑ B등급</strong> 부여
                        </p>
                    </div>
                    <div className={styles.guideCard}>
                        <h4>🎯 알고리즘 1 (#1눌림목)</h4>
                        <p>
                            최근 15일 내 대량거래 기준봉 발생 후 거래량이 기준봉 대비 급감(매물 소화)하며 20일선 지지 및 외인·기관 수급이 유지되는 눌림목 타점
                        </p>
                    </div>
                    <div className={styles.guideCard}>
                        <h4>🕵️ 알고리즘 2 (#2연속매집)</h4>
                        <p>
                            변동성 수축(VCP) 및 안정적인 20일 이격도 구간에서 최근 10거래일 중 6일 이상 외국인 또는 기관이 조용히 연속 순매수한 종목
                        </p>
                    </div>
                    <div className={styles.guideCard}>
                        <h4>🚀 알고리즘 3 (#3초입돌파)</h4>
                        <p>
                            과열권(회전율 22% 초과)을 배제하고 적정 회전율(0.8~22%) 내에서 20일 평균 거래량 대비 1.8배 이상 돌파 + 메이저 수급이 유입된 초입 돌파주
                        </p>
                    </div>
                    <div className={styles.guideCard}>
                        <h4>📈 알고리즘 4 (#4외인지분↑)</h4>
                        <p>
                            최근 10~20일간 외국인 보유 지분율이 추세적으로 상승(+%p)하면서 최근 3거래일 동안 기관 순매수까지 동반 유입되는 Smart Money 종목
                        </p>
                    </div>
                    <div className={styles.guideCard}>
                        <h4>📐 이평선 완전 정배열 (5 &gt; 20 &gt; 60 &gt; 120)</h4>
                        <p>
                            「이동평균선 투자의 정석」 제1스테이지(Stage 1) 기준, 단기(5일) &gt; 중기(20일) &gt; 수급(60일) &gt; 경기(120일)선이 위에서부터 차례대로 정렬된 대세 상승 추세 종목
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
