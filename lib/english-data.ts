import Papa from 'papaparse';

export interface SentenceItem {
  id: string;
  index: number;
  content: string;
}

const SHEET_ID = 'e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk';
const GID_SHEET_4 = '204579350';

// Fallback initial entries
const INITIAL_FALLBACK_CELLS: string[] = [
  `어차피 이것 다 나중에 필요해.

자연스러운 영어:
We'll need all of this later anyway.

조금 더 구어체:
We're going to need all this later anyway.

뉘앙스:
anyway = "어차피"
all of this / all this = "이것 다"
later = "나중에"`,

  `공사중이라 돌아가야 해
We have to take a detour because of the roadworks.

We have to go around because of the construction.`
];

export async function getEnglishSentences(gid?: string): Promise<SentenceItem[]> {
  const targetGid = gid || GID_SHEET_4;
  // Append timestamp to bypass fetch caching
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${targetGid}&single=true&output=csv&t=${Date.now()}`;

  try {
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (response.ok) {
      const csvText = await response.text();

      // If response is HTML login page, throw to fallback
      if (csvText.includes('<!DOCTYPE html>') || csvText.includes('google-logo')) {
        throw new Error('Sheet4 is not published to web yet');
      }

      const parseResult = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
      });

      const rowItems: SentenceItem[] = [];
      let itemCounter = 1;

      (parseResult.data as string[][]).forEach((row) => {
        const colAContent = row[0] ? row[0].trim() : '';
        if (colAContent.length > 0) {
          rowItems.push({
            id: `row-${itemCounter}`,
            index: itemCounter,
            content: colAContent,
          });
          itemCounter++;
        }
      });

      if (rowItems.length > 0) {
        return rowItems;
      }
    }
  } catch (error) {
    console.warn("Sheet4 fetch notice:", error);
  }

  // Return fallback row entries
  return INITIAL_FALLBACK_CELLS.map((cellText, idx) => ({
    id: `row-${idx + 1}`,
    index: idx + 1,
    content: cellText,
  }));
}
