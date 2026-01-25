
const Papa = require('papaparse');
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/pub?gid=0&single=true&output=csv';

async function testFetch() {
  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();
    
    console.log('--- Raw Text Start ---');
    console.log(text.substring(0, 500));
    console.log('--- Raw Text End ---');

    Papa.parse(text, {
      header: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        console.log('--- Parsed Data [0] ---');
        console.log(JSON.stringify(results.data[0], null, 2));
        
        const firstRow = results.data[0];
        if (firstRow.pronunciation) {
            console.log('Pronunciation found:', firstRow.pronunciation);
            console.log('Pronunciation length:', firstRow.pronunciation.length);
            console.log('Char codes:', firstRow.pronunciation.split('').map(c => c.charCodeAt(0)));
        } else {
            console.log('Pronunciation field is MISSING or EMPTY');
            console.log('Keys:', Object.keys(firstRow));
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

testFetch();
