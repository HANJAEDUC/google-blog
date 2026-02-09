const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing Aldi Product Extraction...');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    const url = 'https://www.aldi-sued.de/produkte/wochenangebote.html';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle cookies
    try {
        const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 5000 });
        if (cookieButton) {
            await cookieButton.click();
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {}

    // Wait for products
    await page.waitForSelector('.product-tile', { timeout: 15000 });
    console.log('Product tiles found.');

    // Scroll
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

    // Extract products with detailed logging
    const pageProducts = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.product-tile'));
        console.log('Found tiles:', items.length);
        
        return items.slice(0, 3).map((item, idx) => {
            const brandEl = item.querySelector('.product-tile__brand p');
            const titleEl = item.querySelector('.product-tile__title p');
            const brand = brandEl ? brandEl.innerText.trim() : null;
            const title = titleEl ? titleEl.innerText.trim() : null;

            const priceIns = item.querySelector('.product-tile__price ins');
            const priceSpan = item.querySelector('.product-tile__price span');
            const price = priceIns ? priceIns.innerText.trim() : (priceSpan ? priceSpan.innerText.trim() : "");

            const originalPriceDel = item.querySelector('.product-tile__price del');
            const originalPrice = originalPriceDel ? originalPriceDel.innerText.trim() : null;

            const imgEl = item.querySelector('.product-tile__link img');
            let imageUrl = imgEl ? imgEl.src : null;
            
            if (imageUrl && imageUrl.startsWith('data:')) {
                imageUrl = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-srcset')?.split(' ')[0];
            }

            const linkEl = item.querySelector('a.product-tile__link');
            const link = linkEl ? linkEl.href : null;

            return { 
                index: idx,
                brand, 
                title, 
                price,
                priceEmpty: !price || price === "" || price === "0",
                titleEmpty: !title || title === "",
                originalPrice, 
                imageUrl: imageUrl ? imageUrl.substring(0, 100) : null,
                link: link ? link.substring(0, 80) : null
            };
        });
    });

    console.log('\nExtracted Products (first 3):');
    console.log(JSON.stringify(pageProducts, null, 2));
    
    await browser.close();
})();
