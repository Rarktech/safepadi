import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { getBrowser } from '../services/puppeteer';
import { generateReceiptTemplate } from '../templates/receiptTemplate';

const router = Router();

const receiptCache = new Map<string, Buffer>();

function storageKey(txnCode: string, type: string, role: string) {
    return `${txnCode}_${type || 'default'}_${role || 'none'}.png`;
}

router.get('/:txnCode.png', async (req, res) => {
    try {
        const { txnCode } = req.params;
        const type = (req.query.type as string) || '';
        const role = (req.query.role as string) || '';
        console.log(`[Receipt Service] Request for: ${txnCode}.png`);

        // Layer 1: in-memory cache
        const cacheKey = `${txnCode}:${type}:${role}`;
        if (receiptCache.has(cacheKey)) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.send(receiptCache.get(cacheKey));
        }

        // Layer 2: Supabase Storage (persists across restarts)
        const sKey = storageKey(txnCode, type, role);
        const { data: stored } = await supabase.storage.from('receipts').download(sKey);
        if (stored) {
            const buf = Buffer.from(await stored.arrayBuffer());
            receiptCache.set(cacheKey, buf);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.send(buf);
        }

        // Fetch transaction details
        const { data: txn, error } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*)')
            .eq('txn_code', txnCode)
            .single();

        if (error || !txn) {
            return res.status(404).send('Transaction not found');
        }

        // Format Date (e.g., 10 Jun 2026 10:23:37)
        const dateObj = new Date(txn.created_at);
        const dateString = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Determine platform info
        const { data: sellerLinked } = await supabase
            .from('linked_accounts')
            .select('platform')
            .eq('profile_id', txn.seller_id)
            .eq('is_primary', true)
            .single();

        const platformName = sellerLinked?.platform
            ? sellerLinked.platform.charAt(0).toUpperCase() + sellerLinked.platform.slice(1)
            : 'Escrow';

        const isCompleted = type === 'completed';
        const isMarketing = role === 'buyer' || req.query.isMarketing === 'true' || isCompleted;
        const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        let referralLink = reviewsUrl;

        if (isMarketing) {
            const user = req.query.role === 'buyer' ? txn.buyer : txn.seller;
            if (user?.safetag) {
                const cleanTag = user.safetag.startsWith('@') ? user.safetag : `@${user.safetag}`;
                referralLink = `${reviewsUrl}/${encodeURIComponent(cleanTag)}`;
            }
        }

        // Prepare template data
        const templateData = {
            reference: txn.txn_code,
            date: dateString,
            buyerName: txn.buyer?.safetag || 'Buyer',
            sellerName: txn.seller?.username || 'Seller',
            productName: txn.product_name || 'Goods/Services',
            platform: platformName,
            amount: txn.total_amount,
            currency: txn.currency || 'USD',
            isCompleted,
            isMarketing,
            isBuyer: role === 'buyer',
            referralLink
        };

        const htmlContent = generateReceiptTemplate(templateData as any);

        // Render HTML to PNG using Puppeteer
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        try {
            await page.setViewport({ width: 600, height: 800 });
            await page.setContent(htmlContent, { waitUntil: 'load', timeout: 20000 });

            const element = await page.$('body');
            if (!element) {
                throw new Error("Failed to find body element in the template");
            }

            const screenshot = await element.screenshot({ type: 'png' }) as Buffer;
            await page.close();

            // Populate both cache layers (fire-and-forget the storage upload)
            receiptCache.set(cacheKey, screenshot);
            supabase.storage.from('receipts').upload(sKey, screenshot, { contentType: 'image/png', upsert: true })
                .catch(e => console.error('[Receipt Service] Storage upload error:', e));

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.send(screenshot);
        } catch (err) {
            await page.close().catch(() => {});
            throw err;
        }

    } catch (err: any) {
        console.error('Failed to generate receipt:', err);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
