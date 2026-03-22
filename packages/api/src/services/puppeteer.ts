import puppeteer, { Browser } from 'puppeteer';
import path from 'path';

let browserPromise: Promise<Browser> | null = null;

export async function getBrowser() {
    if (!browserPromise) {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        
        const launchOptions: any = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none'
            ]
        };

        // On Render, we might need a specific executable path if it's not in the PATH
        if (isProduction) {
            // Puppeteer installed via postinstall into .cache/puppeteer
            // npx puppeteer browsers install chrome downloads to a specific nested path
            // But usually just 'chrome' works if installed via 'npx puppeteer browsers install'
            console.log('[Puppeteer] Launching in production mode...');
        }

        browserPromise = puppeteer.launch(launchOptions);
    }

    try {
        const browser = await browserPromise;
        if (!browser.isConnected()) {
            browserPromise = null;
            return getBrowser();
        }
        return browser;
    } catch (e) {
        browserPromise = null;
        console.error('[Puppeteer] Failed to launch browser:', e);
        throw e;
    }
}
