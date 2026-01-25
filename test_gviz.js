
const fs = require('fs');

async function testGviz() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L3a9lSp_MK1Gdmkl3PJK0lugAMmOYVnmqMuCmDdTGjLky0k_EFUFLJ-2TR9hIxKHpjWer_98r1wk/gviz/tq?tqx=out:csv';
  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('GViz Response status:', response.status);
    console.log('--- GViz Start ---');
    console.log(text.substring(0, 500));
    console.log('--- GViz End ---');
  } catch(e) {
    console.error(e);
  }
}

testGviz();
