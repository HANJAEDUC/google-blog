const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting Aldi Crawler (v2)...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    // Navigate directly to weekly offers
    const url = 'https://www.aldi-sued.de/produkte/wochenangebote.html';
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
        console.log('Cookie banner not found.');
    }

    let allProducts = [];
    let hasNextPage = true;
    let currentPage = 1;
    const maxPages = 5; // Limit to first 5 pages (~150 products) to get only top deals

    while (hasNextPage && currentPage <= maxPages) {
        console.log(`Processing Page ${currentPage}...`);

        // Wait for product tiles to load
        try {
            await page.waitForSelector('.product-tile', { timeout: 15000 });
        } catch (e) {
            console.log('No product tiles found.');
            break;
        }

        // Scroll to load lazy-loaded content
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 250;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 15000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(r => setTimeout(r, 3000));

        // Extract products with more flexible approach
        const pageProducts = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.product-tile'));
            
            return items.map(item => {
                // Try multiple ways to get brand and title
                const allPTags = item.querySelectorAll('p');
                let brand = null;
                let title = null;
                
                // Method 1: Try explicit selectors
                const brandEl1 = item.querySelector('.product-tile__brand p');
                const titleEl1 = item.querySelector('.product-tile__title p');
                
                if (brandEl1) brand = brandEl1.innerText.trim();
                if (titleEl1) title = titleEl1.innerText.trim();
                
                // Method 2: If not found, use first two p tags
                if (!brand && !title && allPTags.length >= 2) {
                    brand = allPTags[0]?.innerText.trim() || null;
                    title = allPTags[1]?.innerText.trim() || null;
                }
                
                // Method 3: Try link text as fallback
                if (!title) {
                    const linkEl = item.querySelector('a.product-tile__link');
                    if (linkEl) {
                        const ariaLabel = linkEl.getAttribute('aria-label');
                        if (ariaLabel) title = ariaLabel;
                    }
                }

                // Get price - prioritize discounted price, then regular price
                let price = "";
                
                // 1. Try to find discounted price (ins tag)
                const discountedPrice = item.querySelector('ins.base-price__discounted, ins');
                if (discountedPrice) {
                    price = discountedPrice.innerText.trim();
                } else {
                    // 2. Try to find regular price (span inside .base-price__regular)
                    const regularPrice = item.querySelector('.base-price__regular span, .product-tile__price span:not(.sr-only)');
                    if (regularPrice) {
                        price = regularPrice.innerText.trim();
                    } else {
                        // 3. Fallback to any price container
                        const priceContainer = item.querySelector('.product-tile__price, [class*="price"]');
                        if (priceContainer) {
                            price = priceContainer.innerText.trim().split('\n')[0];
                        }
                    }
                }

                // Get original price (strikethrough price when on sale)
                const originalPriceDel = item.querySelector('del, .base-price__was-price del');
                const originalPrice = originalPriceDel ? originalPriceDel.innerText.trim() : null;

                // Get image
                const imgEl = item.querySelector('img');
                let imageUrl = imgEl ? imgEl.src : null;
                
                if (imageUrl && imageUrl.startsWith('data:')) {
                    imageUrl = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-srcset')?.split(' ')[0] || null;
                }
                if (imageUrl && !imageUrl.startsWith('http')) {
                    try {
                        imageUrl = new URL(imageUrl, window.location.href).href;
                    } catch (e) {
                        imageUrl = null;
                    }
                }

                // Get product link
                const linkEl = item.querySelector('a');
               const link = linkEl ? linkEl.href : null;

                return { brand, title, price, originalPrice, imageUrl, link };
            }).filter(p => {
                // More lenient filter: accept if has title OR price
                return (p.title && p.title !== "") || (p.price && p.price !== "" && p.price !== "0");
            });
        });

        allProducts = allProducts.concat(pageProducts);
        console.log(`Captured ${pageProducts.length} products from page ${currentPage}. Total: ${allProducts.length}`);

        // Try to go to next page
        try {
            const nextLinkText = (currentPage + 1).toString();
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
            console.log('Pagination finished:', err.message);
            hasNextPage = false;
        }
    }

    // Calculate current week's offer period (Monday to Saturday)
    let offerPeriod = "";
    try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        // Calculate Monday of current week
        const monday = new Date(now);
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        monday.setDate(now.getDate() + daysToMonday);
        
        // Calculate Saturday of current week
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);
        
        // Format dates as "Mo. DD.MM. – Sa. DD.MM."
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}.${month}.`;
        };
        
        offerPeriod = `Mo. ${formatDate(monday)} – Sa. ${formatDate(saturday)}`;
        console.log(`Calculated offer period: ${offerPeriod}`);
    } catch (e) {
        console.log('Could not calculate offer period:', e.message);
    }

    console.log(`Total found: ${allProducts.length} products.`);

    // Save to file
    const outputPath = path.resolve(__dirname, 'aldi_offers.json');
    const outputData = {
        offerPeriod,
        lastUpdated: new Date().toISOString(),
        products: allProducts
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`Data saved to ${outputPath}`);

    await browser.close();
})();
