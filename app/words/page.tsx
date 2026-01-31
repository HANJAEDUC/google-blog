import WordsClient, { Word } from './WordsClient';
import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';

// Cache for 1 hour (3600 seconds)
export const revalidate = 3600;

export default async function WordsPage() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    let csvText = await response.text();

    // Fix duplicate headers from Google Sheets (if present) to prevent overwriting valid data
    if (csvText.includes(',pronunciation,IPA,pronunciation,IPA')) {
      csvText = csvText.replace(',pronunciation,IPA,pronunciation,IPA', ',pronunciation,IPA,pronunciation_backup,IPA_backup');
    }

    // Parse CSV on the server
    const parseResult = Papa.parse(csvText, {
      header: true,
      transformHeader: (h) => h.trim(),
      skipEmptyLines: true,
    });

    const data = (parseResult.data as any[]).filter(row => row.german && row.german.trim() !== '').map(row => ({
      german: row.german,
      korean: row.korean,
      part: row.part,
      example: row.example,
      exampleMeaning: row.exampleMeaning,
      pronunciation: row.pronunciation,
      ipa: row['IPA'] || row['ipa']
    })) as Word[];

    return <WordsClient initialVocabulary={data} />;
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Failed to load vocabulary</h2>
        <p>Please try again later.</p>
      </div>
    );
  }
}
