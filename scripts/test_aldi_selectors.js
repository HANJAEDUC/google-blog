const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing Aldi Selectors...');
    const browser = await puppeteer.launch({ headless: false }); // Visual mode
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    const url = 'https://www.aldi-sued.de/produkte/wochenangebote.html';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle cookies
    try {
        const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 5000 });
        if (cookieButton) {
            console.log('Clicking cookie button...');
            await cookieButton.click();
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.log('No cookie banner.');
    }

    // Scroll to load content
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 250;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= 2000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    await new Promise(r => setTimeout(r, 3000));

    // Test selectors
    const results = await page.evaluate(() => {
        return {
            productTiles: document.querySelectorAll('.product-tile').length,
            productLinks: document.querySelectorAll('a.product-tile__link').length,
            productCards: document.querySelectorAll('[class*="product"]').length,
            articles: document.querySelectorAll('article').length,
            links: document.querySelectorAll('a[href*="produkt"]').length,
            allClasses: Array.from(new Set(
                Array.from(document.querySelectorAll('*'))
                    .map(el => el.className)
                    .filter(c => typeof c === 'string' && c.includes('product'))
            )).slice(0, 20),
            firstHTML: document.querySelector('.product-tile, article, [class*="product"]')?.outerHTML?.substring(0, 500) || 'NONE'
        };
    });

    console.log('Results:', JSON.stringify(results, null, 2));

    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await new Promise(r => setTimeout(r, 30000));
    
    await browser.close();
})();
