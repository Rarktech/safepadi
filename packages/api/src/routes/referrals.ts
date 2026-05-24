import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { Browser } from 'puppeteer';
import { getBrowser } from '../services/puppeteer';
import { generateReferralTemplate } from '../templates/referralTemplate';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const router = Router();
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

// Browser instance manager removed - handled by service

// Public endpoint: returns current referral commission rates (no auth required)
router.get('/rates', async (req, res) => {
    try {
        const { data } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['referral_tier1_percent', 'referral_tier2_percent']);

        const result: Record<string, number> = {
            referral_tier1_percent: 0.10,
            referral_tier2_percent: 0.05,
        };
        (data || []).forEach((row: any) => {
            result[row.key] = parseFloat(row.value);
        });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:safetag/stats', async (req, res) => {
    try {
        const { safetag } = req.params;
        const normalizedSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        // 1. Get profile ID
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('safetag', normalizedSafetag)
            .single();

        if (profileErr || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const profileId = profile.id;

        // 2. Counts
        // Tier 1 users
        const { count: tier1Count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('referred_by_id', profileId);

        // Tier 2 users
        let tier2Count = 0;
        const { data: tier1Profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('referred_by_id', profileId);

        if (tier1Profiles && tier1Profiles.length > 0) {
            const t1Ids = tier1Profiles.map(p => p.id);
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .in('referred_by_id', t1Ids);
            tier2Count = count || 0;
        }

        // 3. Commissions data
        const { data: commissions, error: commErr } = await supabase
            .from('referral_commissions')
            .select(`
                id,
                amount,
                currency,
                tier,
                status,
                created_at,
                txn_id,
                transactions ( txn_code, product_name ),
                referred_id,
                profiles!referral_commissions_referred_id_fkey ( safetag, first_name, email )
            `)
            .eq('referrer_id', profileId)
            .order('created_at', { ascending: false });

        if (commErr) throw commErr;

        const earningsByCurrencyMap: Record<string, number> = {};
        const recentActivity: any[] = [];
        const leaderboardMap = new Map();

        if (commissions) {
            commissions.forEach((c: any) => {
                if (c.status === 'COMPLETED') {
                    earningsByCurrencyMap[c.currency] = (earningsByCurrencyMap[c.currency] || 0) + Number(c.amount);
                }

                // Push to recent activity
                recentActivity.push({
                    id: c.id,
                    type: c.tier === 1 ? 'tier1' : 'tier2',
                    amount: Number(c.amount),
                    currency: c.currency,
                    user: c.profiles?.safetag || 'Unknown',
                    email: c.profiles?.email || '',
                    product: c.transactions?.product_name || 'N/A',
                    txn_code: c.transactions?.txn_code || 'N/A',
                    date: c.created_at,
                    status: c.status
                });

                // Leaderboard grouping
                const refId = c.referred_id;
                const earnedFromThisRef = c.status === 'COMPLETED' ? Number(c.amount) : 0;

                if (!leaderboardMap.has(refId)) {
                    leaderboardMap.set(refId, {
                        user: c.profiles?.safetag || 'Unknown',
                        name: c.profiles?.first_name || 'User',
                        totalEarned: earnedFromThisRef,
                        tier: c.tier
                    });
                } else {
                    const existing = leaderboardMap.get(refId);
                    existing.totalEarned += earnedFromThisRef;
                }
            });
        }

        const earningsByCurrency = Object.entries(earningsByCurrencyMap).map(([currency, totalEarned]) => ({
            currency,
            totalEarned: Number(totalEarned.toFixed(8))
        }));

        // Process Leaderboard: sort by highest earnings
        const leaderboard = Array.from(leaderboardMap.values())
            .sort((a, b) => b.totalEarned - a.totalEarned)
            .slice(0, 10); // Top 10

        res.json({
            earningsByCurrency,
            tier1Count: tier1Count || 0,
            tier2Count,
            recentActivity,
            leaderboard
        });

    } catch (err: any) {
        console.error('Referral Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:safetag/card', async (req, res) => {
    try {
        const { safetag } = req.params;
        const cleanSafetag = safetag.replace(/^@/, '');

        // Supabase Storage (persistent CDN-backed cache)
        const sKey = `referral_${cleanSafetag}.png`;
        const { data: stored } = await supabase.storage.from('receipts').download(sKey);
        if (stored) {
            const buf = Buffer.from(await stored.arrayBuffer());
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buf);
        }

        // Layer 3: Puppeteer (first render only)
        const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        const referralLink = `${reviewsUrl}/@${cleanSafetag}`;

        const htmlContent = generateReferralTemplate({
            safetag: cleanSafetag,
            referralLink
        });

        const browser = await getBrowser();
        const page = await browser.newPage();

        try {
            await page.setViewport({ width: 1000, height: 1150 });
            await page.setContent(htmlContent, { waitUntil: 'networkidle2', timeout: 50000 });

            // Allow time for Google Fonts and QRCode script to execute
            await new Promise(r => setTimeout(r, 3000));

            const element = await page.$('.canvas');
            if (!element) {
                throw new Error("Failed to find canvas element in the template");
            }

            const screenshot = await element.screenshot({ type: 'png' }) as Buffer;
            await page.close();

            // Persist to Supabase Storage (fire-and-forget)
            supabase.storage.from('receipts').upload(sKey, screenshot, { contentType: 'image/png', upsert: true })
                .catch(e => console.error('[Referral Card] Storage upload error:', e));

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(screenshot);
        } catch (err) {
            await page.close().catch(() => {});
            throw err;
        }

    } catch (err: any) {
        console.error('Failed to generate referral card:', err);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
