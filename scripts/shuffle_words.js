const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';
const OUTPUT_PATH = path.join(__dirname, 'shuffled_words.json');

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function fisherYatesShuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Fetch and parse CSV from Google Sheets
 * @returns {Promise<Array>} - Parsed words array
 */
async function fetchWords() {
    try {
        console.log('Fetching words from Google Sheets...');
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

        const words = [];
        let lastWord = null;

        parseResult.data.forEach((row) => {
            const german = row.german ? row.german.trim() : '';
            const example = row.example ? row.example.trim() : '';
            const exampleMeaning = row.exampleMeaning ? row.exampleMeaning.trim() : '';

            // Case 1: New Word
            if (german !== '') {
                const newWord = {
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

        console.log(`✓ Fetched ${words.length} words`);
        return words;

    } catch (error) {
        console.error('Error fetching words:', error);
        throw error;
    }
}

/**
 * Shuffle words while preserving the first word
 * @param {Array} words - Original words array
 * @returns {Array} - Shuffled words array
 */
function shuffleWords(words) {
    if (words.length === 0) {
        console.warn('No words to shuffle');
        return [];
    }

    // Preserve first word (die Liebe)
    const firstWord = words[0];
    console.log(`✓ Preserving first word: "${firstWord.german}"`);

    // Shuffle remaining words
    const remainingWords = words.slice(1);
    const shuffled = fisherYatesShuffle(remainingWords);

    // Combine: first word + shuffled rest
    const result = [firstWord, ...shuffled];

    console.log(`✓ Shuffled ${remainingWords.length} words (kept first word fixed)`);
    return result;
}

/**
 * Save shuffled words to JSON file
 * @param {Array} words - Shuffled words array
 */
function saveToFile(words) {
    try {
        const jsonData = JSON.stringify(words, null, 2);
        fs.writeFileSync(OUTPUT_PATH, jsonData, 'utf-8');
        console.log(`✓ Saved to ${OUTPUT_PATH}`);
        console.log(`✓ File size: ${(jsonData.length / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('=== German Words Shuffle Script ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    try {
        // Fetch words from Google Sheets
        const words = await fetchWords();

        if (words.length === 0) {
            throw new Error('No words fetched from Google Sheets');
        }

        // Shuffle words (preserving first word)
        const shuffled = shuffleWords(words);

        // Save to JSON file
        saveToFile(shuffled);

        console.log('');
        console.log('=== Shuffle Complete ===');
        console.log(`First word: ${shuffled[0].german}`);
        console.log(`Total words: ${shuffled.length}`);
        console.log(`Completed at: ${new Date().toISOString()}`);

    } catch (error) {
        console.error('');
        console.error('=== Shuffle Failed ===');
        console.error(error);
        process.exit(1);
    }
}

// Run the script
main();
