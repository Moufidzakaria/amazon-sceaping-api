import 'dotenv/config';
import { Actor } from 'apify';
import { chromium } from 'playwright-extra';

await Actor.main(async () => {

    const input = await Actor.getInput() || {};

    const categories = input.categories ?? [
        "gaming chair",
        "laptop",
        "headphones",
        "smartwatch",
        "monitor"
    ];

    const pagesPerCategory = input.pages ?? 10;
    const maxProducts = input.maxProducts ?? 5000;
    const deduplicate = input.deduplicate ?? true;

    const proxyConfiguration = await Actor.createProxyConfiguration();

    const browser = await chromium.launch({
        headless: true,
        proxy: proxyConfiguration
            ? await proxyConfiguration.getPlaywrightProxySettings()
            : undefined
    });

    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();

    // ⚡ Bloque ressources lourdes (perf boost)
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    const seen = new Set();
    const batch = [];
    let total = 0;

    async function gotoSafe(url) {
        for (let i = 0; i < 3; i++) {
            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                return true;
            } catch {
                await page.waitForTimeout(1500);
            }
        }
        return false;
    }

    async function saveBatch() {
        if (batch.length >= 300) {
            await Actor.pushData(batch.splice(0, batch.length));
            console.log(`💾 Saved batch`);
        }
    }

    console.log("🚀 SCRAPER START");

    for (const category of categories) {

        console.log(`🔎 CATEGORY: ${category}`);

        for (let pageNum = 1; pageNum <= pagesPerCategory; pageNum++) {

            if (total >= maxProducts) break;

            const url = `https://www.amazon.com/s?k=${encodeURIComponent(category)}&page=${pageNum}`;

            const ok = await gotoSafe(url);
            if (!ok) continue;

            await page.waitForTimeout(2000);

            const items = await page.evaluate((category) => {
                const cards = document.querySelectorAll("div[data-component-type='s-search-result']");

                return Array.from(cards).map(card => {

                    const title = card.querySelector("h2 span")?.textContent?.trim();
                    const asin = card.getAttribute("data-asin");

                    const link = card.querySelector("h2 a")?.href
                        || (asin ? `https://www.amazon.com/dp/${asin}` : null);

                    const price = card.querySelector(".a-price .a-offscreen")?.textContent || null;

                    const rating = card.querySelector(".a-icon-alt")?.textContent || null;

                    return {
                        category,
                        title,
                        asin,
                        link,
                        price,
                        rating: rating ? parseFloat(rating.split(" ")[0]) : null,
                        scrapedAt: new Date().toISOString()
                    };

                }).filter(p => p.title && p.link);

            }, category);

            if (!items.length) {
                console.log(`⚠️ Empty page ${pageNum}`);
                continue;
            }

            for (const item of items) {

                if (total >= maxProducts) break;

                const key = item.asin || item.link;

                if (deduplicate && seen.has(key)) continue;

                seen.add(key);
                batch.push(item);
                total++;
            }

            await saveBatch();

            console.log(`📦 ${category} page ${pageNum} -> ${items.length} | TOTAL: ${total}`);

            await page.waitForTimeout(1000);
        }
    }

    await browser.close();

    if (batch.length) {
        await Actor.pushData(batch);
    }

    await Actor.setValue("OUTPUT", {
        success: true,
        totalProducts: total,
        finishedAt: new Date().toISOString()
    });

    console.log(`🔥 DONE: ${total}`);
});