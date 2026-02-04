
const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting Aldi Category Analyzer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    const url = 'https://www.aldi-sued.de/angebote';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Cookie handling
    try {
        const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 5000 });
        if (cookieButton) {
            await cookieButton.click();
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch(e) {}

    // Analyze specific sections
    const categories = await page.evaluate(() => {
        const results = [];
        
        // Helper to find link near header
        const findLink = (headerText) => {
            const headers = Array.from(document.querySelectorAll('h2, h3'));
            const header = headers.find(h => h.innerText.includes(headerText));
            if (!header) return null;
            
            // Traverse up to find container, then search for "Alle anzeigen" or relevant link
            let container = header.parentElement;
            let link = null;
            for(let i=0; i<5; i++) { // Go up 5 levels max
                if(!container) break;
                link = container.querySelector('a[href*="angebote/"]');
                if(link) break;
                container = container.parentElement;
            }
            return link ? link.href : null;
        }

        return [
            { name: "Top-Deals", url: findLink("TOP-DEALS") },
            { name: "Wochenangebote", url: findLink("WOCHENANGEBOTE") },
            { name: "Aktuelle Angebote", url: findLink("AKTUELLE ANGEBOTE") } // General fallback
        ];
    });

    console.log('Categories found:', categories);

    for (const cat of categories) {
        if (cat.url && cat.url !== url) { /* Avoid self-loop if same page */
            console.log(`\nNavigating to ${cat.name}: ${cat.url}...`);
            try {
                await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 30000 });
                // Scroll
                 await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 200;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 50);
                    });
                });
                await new Promise(r => setTimeout(r, 2000));
                
                const count = await page.evaluate(() => document.querySelectorAll('a.product-tile__link').length);
                cat.count = count;
                console.log(`-> Found ${count} products in ${cat.name}`);
            } catch(e) {
                console.error(`Failed to crawl ${cat.name}:`, e.message);
            }
        } else {
             console.log(`No specific URL found for ${cat.name} (or it is the main page)`);
        }
    }

    console.log('\nFinal Summary:');
    console.log(JSON.stringify(categories, null, 2));

    // Take a screenshot to visualize structure if needed (saved to artifact)
    // But for now just logs.

    await browser.close();
})();
