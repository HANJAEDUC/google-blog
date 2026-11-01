import { NextRequest, NextResponse } from 'next/server';

interface NaverNewsItem {
    id?: string;
    officeId?: string;
    articleId?: string;
    officeName?: string;
    datetime?: string;
    title?: string;
    body?: string;
    mobileNewsUrl?: string;
}

interface NaverDisclosureItem {
    itemCode?: string;
    disclosureId?: number | string;
    title?: string;
    datetime?: string;
    author?: string;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim();
    const stockName = searchParams.get('name')?.trim() || '';

    if (!code || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: '유효한 6자리 종목코드를 입력해주세요.' }, { status: 400 });
    }

    const headers = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
    };

    // Calculate cutoff date: 30 days ago
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000);
    const cutoffYmd = `${cutoffDate.getFullYear()}${String(cutoffDate.getMonth() + 1).padStart(2, '0')}${String(
        cutoffDate.getDate()
    ).padStart(2, '0')}`;

    try {
        const [newsRes, discRes, basicRes] = await Promise.allSettled([
            fetch(`https://m.stock.naver.com/api/news/stock/${code}?pageSize=30&page=1`, {
                headers,
                next: { revalidate: 300 },
            }),
            fetch(`https://m.stock.naver.com/api/stock/${code}/disclosure?pageSize=20&page=1`, {
                headers,
                next: { revalidate: 300 },
            }),
            fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
                headers,
                next: { revalidate: 180 },
            }),
        ]);

        // 1. Basic Info
        let basicInfo = {
            stockName: stockName || code,
            closePrice: '-',
            compareToPreviousPrice: '-',
            fluctuationsRatio: '-',
            marketStatus: '',
        };

        if (basicRes.status === 'fulfilled' && basicRes.value.ok) {
            try {
                const bData = await basicRes.value.json();
                basicInfo = {
                    stockName: bData.stockName || stockName || code,
                    closePrice: bData.closePrice || '-',
                    compareToPreviousPrice: bData.compareToPreviousClosePrice || '-',
                    fluctuationsRatio: bData.fluctuationsRatio ? `${bData.fluctuationsRatio}%` : '-',
                    marketStatus: bData.marketStatus || '',
                };
            } catch {
                // ignore
            }
        }

        // 2. News Processing (Flatten groups & filter to last 30 days)
        const newsList: Array<{
            title: string;
            officeName: string;
            datetime: string;
            body: string;
            url: string;
            isMajor: boolean;
        }> = [];

        const majorOffices = [
            '한국경제',
            '매일경제',
            '서울경제',
            '머니투데이',
            '이데일리',
            '아시아경제',
            '연합뉴스',
            '연합인포맥스',
            '조선비즈',
            '뉴스1',
            '뉴시스',
        ];

        if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
            try {
                const nData = await newsRes.value.json();
                if (Array.isArray(nData)) {
                    for (const group of nData) {
                        const items = group.items || [];
                        for (const it of items as NaverNewsItem[]) {
                            const dtStr = it.datetime || '';
                            const ymd = dtStr.substring(0, 8);
                            if (ymd && ymd < cutoffYmd) continue;

                            const office = it.officeName || '언론사';
                            const title = it.title || '';
                            const cleanBody = (it.body || '')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&quot;/g, '"')
                                .replace(/<[^>]*>?/gm, '');

                            // Format readable datetime (YYYY-MM-DD HH:mm)
                            let formattedDt = dtStr;
                            if (dtStr.length >= 12) {
                                formattedDt = `${dtStr.substring(0, 4)}-${dtStr.substring(4, 6)}-${dtStr.substring(
                                    6,
                                    8
                                )} ${dtStr.substring(8, 10)}:${dtStr.substring(10, 12)}`;
                            }

                            const articleId = it.articleId;
                            const officeId = it.officeId;
                            const url =
                                it.mobileNewsUrl ||
                                (officeId && articleId
                                    ? `https://n.news.naver.com/mnews/article/${officeId}/${articleId}`
                                    : `https://finance.naver.com/item/main.naver?code=${code}`);

                            newsList.push({
                                title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
                                officeName: office,
                                datetime: formattedDt,
                                body: cleanBody.length > 140 ? `${cleanBody.substring(0, 140)}...` : cleanBody,
                                url,
                                isMajor: majorOffices.some((m) => office.includes(m)),
                            });
                        }
                    }
                }
            } catch {
                // ignore
            }
        }

        // 3. Disclosure Processing (Filter to last 30 days)
        const disclosureList: Array<{
            title: string;
            datetime: string;
            author: string;
            url: string;
        }> = [];

        if (discRes.status === 'fulfilled' && discRes.value.ok) {
            try {
                const dData = await discRes.value.json();
                if (Array.isArray(dData)) {
                    for (const it of dData as NaverDisclosureItem[]) {
                        const dt = it.datetime || '';
                        // format: 2026-10-29T06:52:29
                        const ymd = dt.replace(/-/g, '').substring(0, 8);
                        if (ymd && ymd < cutoffYmd) continue;

                        const title = it.title || '공시';
                        const author = it.author || '거래소';
                        const formattedDt = dt.replace('T', ' ').substring(0, 16);

                        disclosureList.push({
                            title,
                            datetime: formattedDt,
                            author,
                            url: `https://finance.naver.com/item/news_notice_read.naver?code=${code}&no=${
                                it.disclosureId || ''
                            }`,
                        });
                    }
                }
            } catch {
                // ignore
            }
        }

        // 4. Keyword Extraction from News and Disclosures
        const combinedText = [
            ...newsList.map((n) => n.title),
            ...disclosureList.map((d) => d.title),
        ].join(' ');

        const keywordThemes = [
            { tag: '실적 턴어라운드/호실적', regex: /실적|영업익|매출|흑자|사상 최대|어닝/ },
            { tag: '수주/공급 계약', regex: /공급|계약|수주|납품|체결/ },
            { tag: 'M&A/지분 취득', regex: /인수|지분|합병|자사주|공개매수/ },
            { tag: 'AI/반도체/신기술', regex: /HBM|AI|반도체|로봇|전고체|유리기판|자율주행/ },
            { tag: '바이오/임상/신약', regex: /임상|신약|FDA|허가|바이오|기술수출/ },
            { tag: '기관·외인 수급 유입', regex: /외인|외국인|기관|순매수|러브콜|쌍끌이/ },
            { tag: '신고가/급등 모멘텀', regex: /신고가|급등|돌파|랠리|강세|상한가/ },
        ];

        const detectedKeywords: string[] = [];
        for (const kt of keywordThemes) {
            if (kt.regex.test(combinedText)) {
                detectedKeywords.push(kt.tag);
            }
        }

        return NextResponse.json({
            success: true,
            code,
            stockName: basicInfo.stockName,
            price: basicInfo.closePrice,
            fluctuationRate: basicInfo.fluctuationsRatio,
            keywords: detectedKeywords.slice(0, 4),
            newsCount: newsList.length,
            disclosureCount: disclosureList.length,
            news: newsList.slice(0, 15),
            disclosures: disclosureList.slice(0, 10),
            naverUrl: `https://finance.naver.com/item/main.naver?code=${code}`,
            naverMobileUrl: `https://m.stock.naver.com/stock/${code}`,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `브리핑 데이터를 가져오는 중 오류가 발생했습니다: ${msg}` }, { status: 500 });
    }
}

