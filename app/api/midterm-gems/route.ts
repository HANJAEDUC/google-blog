import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const KRX_OUTPUT_DIR = path.resolve(process.cwd(), '..', '..', 'KRXAPI', 'output');
const KRX_SCRIPT_PATH = path.resolve(process.cwd(), '..', '..', 'KRXAPI', 'find_midterm_gems.py');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

function getAvailableDates(): { latestDate: string; availableDates: string[] } {
    const dateSet = new Set<string>();

    for (const dir of [KRX_OUTPUT_DIR, PUBLIC_DATA_DIR]) {
        if (fs.existsSync(dir)) {
            try {
                const files = fs.readdirSync(dir);
                for (const f of files) {
                    const m = f.match(/^midterm_gems_ALL_(\d{8})\.json$/);
                    if (m) {
                        dateSet.add(m[1]);
                    }
                }
            } catch {
                // ignore
            }
        }
    }

    // midterm_gems_dates.json 확인
    for (const dir of [KRX_OUTPUT_DIR, PUBLIC_DATA_DIR]) {
        const idxPath = path.join(dir, 'midterm_gems_dates.json');
        if (fs.existsSync(idxPath)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(idxPath, 'utf-8'));
                if (Array.isArray(parsed.available_dates)) {
                    parsed.available_dates.forEach((d: string) => {
                        if (/^\d{8}$/.test(d)) dateSet.add(d);
                    });
                }
            } catch {
                // ignore
            }
        }
    }

    // midterm_gems_latest.json 확인
    for (const dir of [KRX_OUTPUT_DIR, PUBLIC_DATA_DIR]) {
        const latestPath = path.join(dir, 'midterm_gems_latest.json');
        if (fs.existsSync(latestPath)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
                if (parsed.target_date && /^\d{8}$/.test(parsed.target_date)) {
                    dateSet.add(parsed.target_date);
                }
            } catch {
                // ignore
            }
        }
    }

    const availableDates = Array.from(dateSet).sort().reverse();
    const latestDate = availableDates[0] || '20261028';
    return { latestDate, availableDates };
}

function readDateJson(dateStr?: string): any | null {
    const filenames = dateStr
        ? [`midterm_gems_ALL_${dateStr}.json`]
        : ['midterm_gems_latest.json'];

    for (const fname of filenames) {
        const krxFile = path.join(KRX_OUTPUT_DIR, fname);
        const pubFile = path.join(PUBLIC_DATA_DIR, fname);

        if (fs.existsSync(krxFile)) {
            const raw = fs.readFileSync(krxFile, 'utf-8');
            const parsed = JSON.parse(raw);
            // public/data 동기화 시도
            try {
                if (!fs.existsSync(PUBLIC_DATA_DIR)) {
                    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
                }
                fs.writeFileSync(pubFile, raw, 'utf-8');
            } catch {
                // ignore read-only fs on serverless
            }
            return parsed;
        }

        if (fs.existsSync(pubFile)) {
            const raw = fs.readFileSync(pubFile, 'utf-8');
            return JSON.parse(raw);
        }
    }

    // 만약 특정 날짜 파일이 없는데 latest.json의 target_date가 해당 날짜와 일치하면 반환
    if (dateStr) {
        for (const dir of [KRX_OUTPUT_DIR, PUBLIC_DATA_DIR]) {
            const latestFile = path.join(dir, 'midterm_gems_latest.json');
            if (fs.existsSync(latestFile)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
                    if (parsed.target_date === dateStr) {
                        return parsed;
                    }
                } catch {
                    // ignore
                }
            }
        }
    }

    return null;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawDate = searchParams.get('date')?.trim() || '';
        const { latestDate, availableDates } = getAvailableDates();
        const canRunLocalScript = fs.existsSync(KRX_SCRIPT_PATH);

        if (!rawDate) {
            const data = readDateJson();
            if (!data) {
                return NextResponse.json(
                    { ok: false, message: 'midterm_gems_latest.json 파일을 찾을 수 없습니다.' },
                    { status: 404 }
                );
            }
            return NextResponse.json({
                ok: true,
                canRunLocalScript,
                latestDate,
                availableDates,
                data,
            });
        }

        const cleanDate = rawDate.replace(/-/g, '').replace(/\//g, '');
        const data = readDateJson(cleanDate);

        if (data) {
            return NextResponse.json({
                ok: true,
                canRunLocalScript,
                latestDate,
                availableDates,
                data,
            });
        }

        const nearestPrevDate =
            availableDates.find((d) => d < cleanDate) || availableDates[availableDates.length - 1] || latestDate;

        return NextResponse.json(
            {
                ok: false,
                errorType: cleanDate > latestDate ? 'FUTURE_DATE' : 'HOLIDAY_OR_NO_DATA',
                requestedDate: cleanDate,
                latestDate,
                nearestPrevDate,
                availableDates,
                canRunLocalScript,
                message: `요청하신 [${cleanDate}] 날짜의 사전 생성된 리포트가 없습니다.`,
            },
            { status: 404 }
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, message: msg }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { latestDate, availableDates } = getAvailableDates();

        if (!fs.existsSync(KRX_SCRIPT_PATH)) {
            return NextResponse.json(
                {
                    ok: false,
                    message:
                        '클라우드(Vercel) 배포 환경에서는 서버에서 실시간 파이썬 스크립트를 직접 구동할 수 없습니다. 상단의 생성된 최근 거래일 칩을 선택하거나 로컬에서 실행 후 배포해 주세요.',
                    latestDate,
                    availableDates,
                },
                { status: 400 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const targetDate = body.targetDate ? String(body.targetDate).replace(/-/g, '').replace(/\//g, '').trim() : '';
        const args = [KRX_SCRIPT_PATH];
        if (targetDate) {
            args.push(targetDate);
        }
        if (body.minValEok) {
            args.push(String(body.minValEok));
        }

        const { stdout } = await execFileAsync('python', args, {
            cwd: path.dirname(KRX_SCRIPT_PATH),
            timeout: 180000,
        });

        // stdout 경고 메시지 파싱 (⚠️ [미래 날짜 경고], ⚠️ [휴장일/데이터 없음 경고], ⚠️ [날짜 입력 오류])
        if (
            stdout.includes('⚠️ [미래 날짜 경고]') ||
            stdout.includes('⚠️ [휴장일/데이터 없음 경고]') ||
            stdout.includes('⚠️ [날짜 입력 오류]')
        ) {
            const lines = stdout
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith('==='));

            const warnIdx = lines.findIndex((l) => l.startsWith('⚠️'));
            const warnLines = warnIdx >= 0 ? lines.slice(warnIdx, warnIdx + 4) : lines;

            let errorType = 'HOLIDAY_OR_NO_DATA';
            if (stdout.includes('⚠️ [미래 날짜 경고]')) errorType = 'FUTURE_DATE';
            else if (stdout.includes('⚠️ [날짜 입력 오류]')) errorType = 'INVALID_DATE';

            const prevMatch = stdout.match(/직전의 가장 가까운 정상 거래일:\s*\[(\d{8})\]/);
            const latestMatch = stdout.match(/현재 분석 가능한 가장 최신 거래일:\s*\[(\d{8})\]/);

            const updatedAvail = getAvailableDates();
            return NextResponse.json({
                ok: false,
                errorType,
                requestedDate: targetDate,
                latestDate: latestMatch?.[1] || updatedAvail.latestDate,
                nearestPrevDate:
                    prevMatch?.[1] ||
                    updatedAvail.availableDates.find((d) => d < targetDate) ||
                    updatedAvail.latestDate,
                availableDates: updatedAvail.availableDates,
                scriptWarningTitle: warnLines[0] || '⚠️ 날짜 검증 경고',
                scriptWarningDetails: warnLines.slice(1),
                message: warnLines.join('\n'),
            });
        }

        const updated = getAvailableDates();
        const resultData = readDateJson(targetDate || updated.latestDate);

        if (resultData) {
            return NextResponse.json({
                ok: true,
                message: `✅ [${resultData.target_date}] 기준 60거래일 백데이터 + 20일 수급 5대 알고리즘 분석 및 동기화 완료!`,
                latestDate: updated.latestDate,
                availableDates: updated.availableDates,
                data: resultData,
            });
        }

        return NextResponse.json(
            { ok: false, message: '분석 결과 파일을 찾을 수 없습니다.', stdout },
            { status: 500 }
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, message: '스크립트 실행 오류: ' + msg }, { status: 500 });
    }
}
