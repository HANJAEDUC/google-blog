import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const KRX_OUTPUT_JSON = path.resolve(process.cwd(), '..', '..', 'KRXAPI', 'output', 'midterm_gems_latest.json');
const KRX_SCRIPT_PATH = path.resolve(process.cwd(), '..', '..', 'KRXAPI', 'find_midterm_gems.py');
const PUBLIC_DATA_JSON = path.join(process.cwd(), 'public', 'data', 'midterm_gems_latest.json');

export async function GET() {
    try {
        // 1. 로컬 개발 환경에서 KRXAPI/output/midterm_gems_latest.json이 존재하면 최신본 우선 로드 및 동기화
        if (fs.existsSync(KRX_OUTPUT_JSON)) {
            const raw = fs.readFileSync(KRX_OUTPUT_JSON, 'utf-8');
            const data = JSON.parse(raw);

            try {
                const publicDir = path.dirname(PUBLIC_DATA_JSON);
                if (!fs.existsSync(publicDir)) {
                    fs.mkdirSync(publicDir, { recursive: true });
                }
                fs.writeFileSync(PUBLIC_DATA_JSON, raw, 'utf-8');
            } catch {
                // 읽기 전용 환경 등에서는 무시
            }

            return NextResponse.json({
                ok: true,
                source: 'krx_local',
                canRunLocalScript: fs.existsSync(KRX_SCRIPT_PATH),
                data,
            });
        }

        // 2. 배포 환경(Vercel 등): public/data/midterm_gems_latest.json 로드
        if (fs.existsSync(PUBLIC_DATA_JSON)) {
            const raw = fs.readFileSync(PUBLIC_DATA_JSON, 'utf-8');
            const data = JSON.parse(raw);
            return NextResponse.json({
                ok: true,
                source: 'public_static',
                canRunLocalScript: false,
                data,
            });
        }

        return NextResponse.json(
            { ok: false, message: 'midterm_gems_latest.json 파일을 찾을 수 없습니다.' },
            { status: 404 }
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, message: msg }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        if (!fs.existsSync(KRX_SCRIPT_PATH)) {
            return NextResponse.json(
                {
                    ok: false,
                    message: '서버리스(Vercel) 배포 환경에서는 로컬 파이썬 스크립트를 직접 실행할 수 없습니다. 로컬에서 find_midterm_gems.py 실행 후 git push로 배포해 주세요.',
                },
                { status: 400 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const args = [KRX_SCRIPT_PATH];
        if (body.targetDate) {
            args.push(String(body.targetDate).replace(/-/g, ''));
        }
        if (body.minValEok) {
            args.push(String(body.minValEok));
        }

        await execFileAsync('python', args, {
            cwd: path.dirname(KRX_SCRIPT_PATH),
            timeout: 180000,
        });

        if (fs.existsSync(KRX_OUTPUT_JSON)) {
            const raw = fs.readFileSync(KRX_OUTPUT_JSON, 'utf-8');
            fs.writeFileSync(PUBLIC_DATA_JSON, raw, 'utf-8');
            const data = JSON.parse(raw);
            return NextResponse.json({
                ok: true,
                message: '5대 알고리즘 최신 분석 및 동기화가 완료되었습니다.',
                data,
            });
        }

        return NextResponse.json({ ok: false, message: '분석 결과 파일을 찾을 수 없습니다.' }, { status: 500 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, message: '스크립트 실행 오류: ' + msg }, { status: 500 });
    }
}

