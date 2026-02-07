import WordsClient, { Word, WordExample } from './WordsClient';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';

// Cache for 5 minutes (300 seconds)
export const revalidate = 300;

export default async function WordsPage() {
  try {
    // Try to use shuffled words JSON first
    const shuffledPath = path.join(process.cwd(), 'scripts/shuffled_words.json');

    if (fs.existsSync(shuffledPath)) {
      try {
        const stats = fs.statSync(shuffledPath);
        const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

        // Use shuffled data if less than 1 hour old (hybrid strategy)
        if (ageHours < 1) {
          const shuffledData = JSON.parse(fs.readFileSync(shuffledPath, 'utf-8'));
          console.log(`Using shuffled words (${ageHours.toFixed(1)}h old, ${shuffledData.length} words)`);
          return <WordsClient initialVocabulary={shuffledData} />;
        } else {
          console.log(`JSON is ${ageHours.toFixed(1)}h old, fetching fresh data and re-shuffling...`);
        }
      } catch (error) {
        console.warn('Failed to read shuffled words, falling back to CSV:', error);
      }
    }

    // Fallback to CSV fetch (original implementation)
    console.log('Fetching words from Google Sheets CSV...');
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    let csvText = await response.text();

    // Fix duplicate headers from Google Sheets (if present)
    if (csvText.includes(',pronunciation,IPA,pronunciation,IPA')) {
      csvText = csvText.replace(',pronunciation,IPA,pronunciation,IPA', ',pronunciation,IPA,pronunciation_backup,IPA_backup');
    }

    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      transformHeader: (h) => h.trim(),
      skipEmptyLines: true,
    });

    const words: Word[] = [];
    let lastWord: Word | null = null;

    (parseResult.data as any[]).forEach((row) => {
      const german = row.german ? row.german.trim() : '';
      const example = row.example ? row.example.trim() : '';
      const exampleMeaning = row.exampleMeaning ? row.exampleMeaning.trim() : '';

      // Case 1: New Word
      if (german !== '') {
        const newWord: Word = {
          german: german,
          korean: row.korean,
          part: row.part,
          pronunciation: row.pronunciation,
          ipa: row['IPA'] || row['ipa'],
          examples: []
        };

        // Add initial example if present
        if (example) {
          newWord.examples.push({
            sentence: example,
            meaning: exampleMeaning
          });
        }

        words.push(newWord);
        lastWord = newWord;
      }
      // Case 2: Continuation of previous word (Empty German, but has Example)
      else if (example !== '' && lastWord) {
        lastWord.examples.push({
          sentence: example,
          meaning: exampleMeaning
        });
      }
    });

    // Shuffle words (preserve first word "die Liebe")
    if (words.length > 0) {
      const firstWord = words[0];
      const remainingWords = words.slice(1);

      // Fisher-Yates shuffle
      for (let i = remainingWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingWords[i], remainingWords[j]] = [remainingWords[j], remainingWords[i]];
      }

      const shuffledWords = [firstWord, ...remainingWords];

      // Save to JSON file for future use
      try {
        const shuffledPath = path.join(process.cwd(), 'scripts/shuffled_words.json');
        fs.writeFileSync(shuffledPath, JSON.stringify(shuffledWords, null, 2), 'utf-8');
        console.log(`✓ Auto-saved shuffled words to JSON (${shuffledWords.length} words)`);
      } catch (error) {
        console.warn('Failed to save shuffled words:', error);
      }

      return <WordsClient initialVocabulary={shuffledWords} />;
    }

    return <WordsClient initialVocabulary={words} />;
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
