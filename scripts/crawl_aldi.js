const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting Aldi Crawler...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Useful for some environments
    });
    const page = await browser.newPage();

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 1024 });

    const url = 'https://www.aldi-sued.de/angebote';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle Cookie Consent
    try {
        const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 10000 });
        if (cookieButton) {
            console.log('Accepting cookies...');
            await cookieButton.click();
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.log('Cookie banner not found or already accepted.');
    }

    // Navigate to full list
    try {
        console.log('Looking for "Alle anzeigen" link...');
        const showAllLink = await page.waitForSelector('a[aria-label^="Alle anzeigen"], a.product-teaser-list__link-content', { timeout: 10000 });
        if (showAllLink) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                showAllLink.click()
            ]);
            console.log('Navigated to: ' + page.url());
        }
    } catch (e) {
        console.log('Using current page for offers.');
    }

    let allProducts = [];
    let hasNextPage = true;
    let currentPage = 1;

    while (hasNextPage) {
        console.log(`Processing Page ${currentPage}...`);

        // Scroll to load lazy-loaded images on current page
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 250;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 15000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(r => setTimeout(r, 2000));

        const pageProducts = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a.product-tile__link'));
            return items.map(item => {
                const brand = (item.querySelector('.product-tile__brandname p') || item.querySelector('[data-test="product-tile__brandname"] p') || item.querySelectorAll('p')[0])?.innerText.trim();
                const title = (item.querySelector('.product-tile__name p') || item.querySelector('[data-test="product-tile__name"] p') || item.querySelectorAll('p')[1])?.innerText.trim();

                const getPrice = () => {
                    const discounted = item.querySelector('.base-price__discounted')?.innerText.trim();
                    const regular = item.querySelector('.base-price__regular')?.innerText.trim();
                    const main = item.querySelector('.price__main')?.innerText.trim();
                    return discounted || main || regular || "";
                };

                const price = getPrice();
                const originalPrice = (item.querySelector('del') || item.querySelector('.base-price__regular:has(+ .base-price__discounted)'))?.innerText.trim();

                let imageUrl = item.querySelector('img')?.src;
                if (imageUrl && imageUrl.startsWith('data:')) {
                    imageUrl = item.querySelector('img')?.getAttribute('data-src') || item.querySelector('img')?.getAttribute('data-srcset')?.split(' ')[0];
                }
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = new URL(imageUrl, window.location.href).href;
                }

                const link = item.href;

                return { brand, title, price, originalPrice, imageUrl, link };
            }).filter(p => p.title && p.price && p.price !== "0" && p.price !== "");
        });

        allProducts = allProducts.concat(pageProducts);
        console.log(`Captured ${pageProducts.length} products from page ${currentPage}. Total: ${allProducts.length}`);

        // Try to go to next page
        try {
            const nextLinkText = (currentPage + 1).toString();
            // Look for pagination link with next number
            const nextLink = await page.evaluateHandle((text) => {
                const links = Array.from(document.querySelectorAll('.base-pagination a, .base-pagination button'));
                return links.find(l => l.innerText.trim() === text);
            }, nextLinkText);

            if (nextLink.asElement()) {
                console.log(`Moving to Page ${currentPage + 1}...`);
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                    nextLink.asElement().click()
                ]);
                currentPage++;
            } else {
                hasNextPage = false;
                console.log('No more pages found.');
            }
        } catch (err) {
            console.log('Pagination error or finished:', err.message);
            hasNextPage = false;
        }
    }

    // Extract Offer Period Date
    let offerPeriod = "";
    try {
        offerPeriod = await page.evaluate(() => {
            const text = document.body.innerText;
            const matches = text.match(/(Mo|Do|Sa)\.?\s+\d{2}\.\d{2}\.?\s*[–-]\s*(Sa|Mo)\.?\s+\d{2}\.\d{2}\.?/gi);
            return matches ? matches[0] : "";
        });
        console.log(`Found offer period: ${offerPeriod}`);
    } catch (e) {
        console.log('Could not find offer period.');
    }

    const products = allProducts;

    console.log(`Found ${products.length} products.`);

    // Save to file with metadata
    const outputPath = path.resolve(__dirname, 'aldi_offers.json');
    const outputData = {
        offerPeriod,
        lastUpdated: new Date().toISOString(),
        products
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`Data saved to ${outputPath}`);

    await browser.close();
})();
