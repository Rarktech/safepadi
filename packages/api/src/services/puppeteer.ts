import puppeteer, { Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

// Close Chrome 60 seconds after last use — saves ~300 MB of idle RAM
const IDLE_CLOSE_MS = 60_000;

const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
    '--single-process',
];

async function closeBrowser() {
    if (!browserPromise) return;
    const p = browserPromise;
    browserPromise = null;
    try { await (await p).close(); } catch { /* already gone */ }
}

function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(closeBrowser, IDLE_CLOSE_MS);
}

export async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        if (process.env.NODE_ENV === 'production') console.log('[Puppeteer] Launching browser...');
        browserPromise = puppeteer.launch({ headless: true, args: LAUNCH_ARGS });
    }

    let browser: Browser;
    try {
        browser = await browserPromise;
    } catch (e) {
        browserPromise = null;
        console.error('[Puppeteer] Launch failed:', e);
        throw e;
    }

    if (!browser.isConnected()) {
        browserPromise = null;
        return getBrowser();
    }

    resetIdleTimer();
    return browser;
}
