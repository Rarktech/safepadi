import puppeteer, { Browser, Page } from 'puppeteer';

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
    // NOTE: --single-process removed — it prevents Chrome from releasing RSS back to
    // the OS after GC, causing the "spike that never comes back down" memory pattern.
];

export async function closeBrowser() {
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
        try { browser.close(); } catch {}  // kill the orphaned Chrome process
        return getBrowser();
    }

    resetIdleTimer();
    return browser;
}

// Semaphore: cap concurrent open pages to avoid 200 MB+ burst spikes
const MAX_CONCURRENT_PAGES = 2;
let runningPages = 0;
const waitQueue: Array<() => void> = [];

function acquirePage(): Promise<void> {
    if (runningPages < MAX_CONCURRENT_PAGES) {
        runningPages++;
        return Promise.resolve();
    }
    return new Promise<void>(resolve => waitQueue.push(resolve));
}

function releasePage(): void {
    runningPages = Math.max(0, runningPages - 1);
    const next = waitQueue.shift();
    if (next) {
        runningPages++;
        next();
    }
}

// Preferred API for all callers: handles acquire/release and page close automatically
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    await acquirePage();
    let page: Page | null = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        return await fn(page);
    } finally {
        if (page) await page.close().catch(() => {});
        releasePage();
    }
}
