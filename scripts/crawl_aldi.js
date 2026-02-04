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
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Handle Cookie Consent
    try {
        const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 5000 });
        if (cookieButton) {
            console.log('Accepting cookies...');
            await cookieButton.click();
            await new Promise(r => setTimeout(r, 2000)); // Wait for banner to disappear
        }
    } catch (e) {
        console.log('Cookie banner not found or click failed.');
    }

    // Try to click "Alle anzeigen" to get full list
    try {
        console.log('Looking for "Alle anzeigen" link...');
        // Look for the link that points to weekly offers/Top-Deals. 
        // Based on analysis, it is often simply "Alle anzeigen" text.
        const showAllLink = await page.waitForSelector('a::-p-text(Alle anzeigen)', { timeout: 5000 });
        
        if (showAllLink) {
            console.log('Found "Alle anzeigen", navigating to full list...');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                showAllLink.click()
            ]);
            console.log('Navigated to full offers page.');
        } else {
            console.log('"Alle anzeigen" link not found, staying on main page.');
        }
    } catch (e) {
        console.log('Could not navigate to full list (link not found or timeout):', e.message);
    }

    // Scroll to load lazy-loaded images
    console.log('Scrolling to load content...');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) { // Limit scroll to avoid infinite loops if any
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // Wait a bit for final lazy loads
    await new Promise(r => setTimeout(r, 2000));

    console.log('Extracting product data...');
    const products = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('a.product-tile__link'));
        
        return items.map(item => {
            // Helper to get text safely
            const getText = (selector) => {
                const el = item.querySelector(selector);
                return el ? el.innerText.trim() : null;
            };

            // Helper to get attribute safely
            const getAttr = (selector, attr) => {
                const el = item.querySelector(selector);
                return el ? el.getAttribute(attr) : null;
            };

            // Structure analysis based on observation
            // Brand is usually the first p, Title the second p
            const pTags = item.querySelectorAll('p');
            const brand = pTags[0] ? pTags[0].innerText.trim() : null;
            const title = pTags[1] ? pTags[1].innerText.trim() : null;

            // Price analysis
            // Current price often in <ins> or just .price__main
            let price = getText('ins');
            if (!price) {
                // Try finding any element with price format like 1,99 €
                // Taking a broader text approach if struct isn't standard
                const allText = item.innerText;
                const priceMatch = allText.match(/\d+,\d{2}\s*€/);
                if (priceMatch) price = priceMatch[0];
            }
            
            // Original price in <del>
            const originalPrice = getText('del');

            // Image
            // Try src, then data-src
            let imageUrl = getAttr('img', 'src');
            if (imageUrl && imageUrl.startsWith('data:')) { // If it's a placeholder base64
                const dataSrc = getAttr('img', 'data-src') || getAttr('img', 'data-srcset');
                if (dataSrc) {
                   imageUrl = dataSrc.split(' ')[0]; // Take first if srcset
                }
            }
            
            // Ensure absolute URL for image
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, window.location.href).href;
            }

            // Link to product
            let link = item.getAttribute('href');
            if (link && !link.startsWith('http')) {
                link = new URL(link, window.location.href).href;
            }

            return {
                brand,
                title,
                price,
                originalPrice,
                imageUrl,
                link
            };
        }).filter(p => p.title && p.price); // Filter out empty or navigational tiles
    });

    console.log(`Found ${products.length} products.`);

    // Save to file
    const outputPath = path.resolve(__dirname, 'aldi_offers.json');
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
    console.log(`Data saved to ${outputPath}`);

    await browser.close();
})();
