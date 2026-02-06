import Papa from 'papaparse';

/* Constants */
const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_3 = '1585444258';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID_SHEET_3}&single=true&output=csv`;

/* Types */
export interface SignItem {
    title: string;           // 제목
    germanSign: string;      // GermanSign
    description: string;     // 설명
    descImage?: string;      // 설명사진
    logo?: string;           // 로고추가
    logoSite?: string;       // 로고사이트
}

/* Helper Functions */
function formatImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('drive.google.com')) {
        const idMatch = trimmed.match(/\/d\/(.+?)(\/|$|\?)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
        }
    }
    return trimmed;
}

function getSafeValue(row: any, ...keys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '' && row[key] !== null) return row[key];
        const found = rowKeys.find(k => k.trim() === key);
        if (found && row[found]) return row[found];
    }
    return '';
}

/* Data Fetching Functions */
export async function getSignsFromSheet(): Promise<SignItem[]> {
    try {
        const response = await fetch(CSV_URL, { next: { revalidate: 300 } }); // Cache for 5 minutes
        if (!response.ok) return [];

        const csvText = await response.text();
        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        const items = (parseResult.data as any[]).map(row => {
            return {
                title: getSafeValue(row, '제목', 'title'),
                germanSign: getSafeValue(row, 'GermanSign', 'sign'),
                description: getSafeValue(row, '설명', 'description'),
                descImage: formatImageUrl(getSafeValue(row, '설명사진', 'descImage', 'image')),
                logo: formatImageUrl(getSafeValue(row, '로고추가', 'logo', 'link')),
                logoSite: getSafeValue(row, '로고사이트', 'logoSite', 'site') || undefined,
            };
        }).filter(i => {
            return i.title && i.title.trim() !== '';
        });

        return items;
    } catch (error) {
        console.error("Failed to fetch signs CSV", error);
        return [];
    }
}
