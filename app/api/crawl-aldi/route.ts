
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST() {
    console.log('Starting Aldi Crawler via API...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // "new" is deprecated in newer versions, true is fine. Or "new" if older.
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Set a reasonable viewport
        await page.setViewport({ width: 1280, height: 1024 });

        // Navigating to the specific Wochenangebote page to match user expectation
        const url = 'https://www.aldi-sued.de/de/produkte/wochenangebote.html';
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Increased timeout

        // Handle Cookie Consent
        try {
            // Using a broader selector or the one from the script
            const cookieButton = await page.waitForSelector('button::-p-text(Alle bestätigen)', { timeout: 5000 });
            if (cookieButton) {
                console.log('Accepting cookies...');
                await cookieButton.click();
                // Wait for banner to disappear/reload
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.log('Cookie banner not found or click failed (might be already accepted or invisible).');
        }

        // Try to click "Alle anzeigen" to get full list
        try {
            console.log('Looking for "Alle anzeigen" link...');
            const showAllLink = await page.waitForSelector('a::-p-text(Alle anzeigen)', { timeout: 5000 });
            
            if (showAllLink) {
                console.log('Found "Alle anzeigen", navigating to full list...');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                    showAllLink.click()
                ]);
                console.log('Navigated to full offers page.');
            } else {
                console.log('"Alle anzeigen" link not found, staying on main page.');
            }
        } catch (e) {
            console.log('Could not navigate to full list:', e);
        }

        // Scroll to load lazy-loaded images
        console.log('Scrolling to load content...');
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) { 
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
                const getText = (selector: string) => {
                    const el = item.querySelector(selector) as HTMLElement;
                    return el ? el.innerText.trim() : null;
                };

                // Helper to get attribute safely
                const getAttr = (selector: string, attr: string) => {
                    const el = item.querySelector(selector);
                    return el ? el.getAttribute(attr) : null;
                };

                const pTags = item.querySelectorAll('p');
                const brand = pTags[0] ? (pTags[0] as HTMLElement).innerText.trim() : null;
                const title = pTags[1] ? (pTags[1] as HTMLElement).innerText.trim() : null;

                // Price analysis
                let price = getText('ins');
                if (!price) {
                    const allText = (item as HTMLElement).innerText;
                    const priceMatch = allText.match(/\d+,\d{2}\s*€/);
                    if (priceMatch) price = priceMatch[0];
                }
                
                // Original price in <del>
                const originalPrice = getText('del');

                // Image
                let imageUrl = getAttr('img', 'src');
                if (imageUrl && imageUrl.startsWith('data:')) { 
                    const dataSrc = getAttr('img', 'data-src') || getAttr('img', 'data-srcset');
                    if (dataSrc) {
                       imageUrl = dataSrc.split(' ')[0]; 
                    }
                }
                
                // Ensure absolute URL type logic not strictly needed in browser context if we just take what's there, 
                // but nice to have. `href` property on link returns absolute usually.
                
                // Link
                const linkEl = item as HTMLAnchorElement;
                const link = linkEl.href; 
                
                // Fix image absolute if needed
                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                     // Since we are inside evaluate, document.baseURI might help or just hardcode if known relative.
                     // But usually src is full.
                }

                return {
                    brand,
                    title,
                    price,
                    originalPrice,
                    imageUrl,
                    link
                };
            }).filter(p => p.title && p.price);
        });

        console.log(`Found ${products.length} products. Limiting to top 30.`);
        
        // Prioritize items with originalPrice (clear sales) if you want, 
        // but since this is /angebote, most are special offers.
        // We will just slice the first 30 as requested.
        const limitedProducts = products.slice(0, 30);

        await browser.close();

        return NextResponse.json({ success: true, count: limitedProducts.length, products: limitedProducts });

    } catch (error: any) {
        console.error('Crawl failed:', error);
        if (browser) await browser.close();
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
