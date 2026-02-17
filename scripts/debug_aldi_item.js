const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    const url = 'https://www.aldi-sued.de/produkte/wochenangebote.html';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Handle cookies
    try {
        const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 5000 });
        if (cookieButton) {
            console.log('Accepting cookies...');
            await cookieButton.click();
            await new Promise(r => setTimeout(r, 1000));
        }
    } catch (e) { console.log('No cookie banner'); }

    // Scroll a bit
    await page.evaluate(async () => {
        window.scrollBy(0, 5000);
    });
    await new Promise(r => setTimeout(r, 2000));

    // Find items
    const itemData = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('.product-tile'));
        
        const schoko = tiles.find(t => t.innerText.includes('Schoko Milch Riegel'));
        const aperol = tiles.find(t => t.innerText.includes('Aperol'));
        
        const getData = (target) => {
           if (!target) return null;
           const img = target.querySelector('img');
           return {
               title: target.querySelector('.product-tile__title')?.innerText || 'Unknown',
               imgSrc: img ? img.src : null,
               imgDataSrc: img ? img.getAttribute('data-src') : null,
           };
        };

        return {
            schoko: getData(schoko),
            aperol: getData(aperol)
        };
    });

    console.log('Item Data:', JSON.stringify(itemData, null, 2));

    await browser.close();
})();
