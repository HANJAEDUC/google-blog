
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
            console.log('Cookie banner not found or click failed.');
        }

        // Try to click "Alle anzeigen" for Top-Deals
        try {
            console.log('Looking for "Alle anzeigen" link...');
            const showAllLink = await page.waitForSelector('a[aria-label^="Alle anzeigen"], a.product-teaser-list__link-content', { timeout: 10000 });

            if (showAllLink) {
                console.log('Found "Alle anzeigen", navigating to full list...');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                    showAllLink.click()
                ]);
                console.log('Navigated to: ' + page.url());
            }
        } catch (e) {
            console.log('Could not navigate to full list (using current page):', e);
        }

        // Scroll to load lazy-loaded images
        console.log('Scrolling to load content...');
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 200;
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

        await new Promise(r => setTimeout(r, 3000));

        console.log('Extracting product data...');
        const products = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a.product-tile__link'));

            return items.map(item => {
                const getPrice = () => {
                    const discEl = item.querySelector('.base-price__discounted, .price__main') as HTMLElement;
                    const regEl = item.querySelector('.base-price__regular') as HTMLElement;
                    return (discEl?.innerText || regEl?.innerText || "").trim();
                };

                const pTags = Array.from(item.querySelectorAll('p'));
                const brand = (item.querySelector('[data-test="product-tile__brandname"] p') as HTMLElement || pTags[0] as HTMLElement)?.innerText.trim();
                const title = (item.querySelector('[data-test="product-tile__name"] p') as HTMLElement || pTags[1] as HTMLElement)?.innerText.trim();

                let price = getPrice();
                if (!price) {
                    const match = (item as HTMLElement).innerText.match(/\d+,\d{2}\s*€/);
                    if (match) price = match[0];
                }

                const originalPrice = (item.querySelector('del') as HTMLElement || item.querySelector('.base-price__regular:has(+ .base-price__discounted)') as HTMLElement)?.innerText.trim();

                let imageUrl = (item.querySelector('img') as HTMLImageElement)?.src || "";
                if (imageUrl && imageUrl.startsWith('data:')) {
                    imageUrl = item.querySelector('img')?.getAttribute('data-src') || item.querySelector('img')?.getAttribute('data-srcset')?.split(' ')[0] || "";
                }

                const linkEl = item as HTMLAnchorElement;
                const link = linkEl.href;

                return {
                    brand,
                    title,
                    price,
                    originalPrice,
                    imageUrl,
                    link
                };
            }).filter(p => p.title && p.price && p.price !== "0");
        });

        console.log(`Found ${products.length} products.`);

        // Save to file as well if triggered via API
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.resolve(process.cwd(), 'scripts', 'aldi_offers.json');
        fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));

        await browser.close();

        return NextResponse.json({ success: true, count: products.length, products: products });

    } catch (error: any) {
        console.error('Crawl failed:', error);
        if (browser) await browser.close();
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
