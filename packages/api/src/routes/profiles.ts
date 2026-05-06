import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification } from '../services/notifications';
import { sendEmail } from '../services/email';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

const RegistrationSchema = z.object({
    safetag: z.string().min(3).max(20),
    email: z.string().email(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    primary_platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram', 'apple']),
    platform_id: z.string(),
    referral_code: z.string().optional()
});

const DeactivateSchema = z.object({
    reason: z.string().optional()
});

// Register or link profile
router.post('/register', async (req, res) => {
    console.log('📝 Received registration request:', req.body);
    try {
        const data = RegistrationSchema.parse(req.body);
        console.log('✅ Validation successful for:', data.safetag);

        // Check if safetag exists
        console.log('🔍 Checking if safetag exists...');
        const { data: existingTag, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('safetag', data.safetag)
            .maybeSingle();

        if (checkError) {
            console.error('❌ Error checking safetag:', checkError);
            throw checkError;
        }

        if (existingTag) {
            console.warn('⚠️ Safetag already taken:', data.safetag);
            return res.status(400).json({ error: 'Safetag already taken' });
        }

        // Resolve referral code to profile ID
        let referredById = null;
        if (data.referral_code) {
            console.log(`🔍 Resolving referral code: ${data.referral_code}...`);
            const { data: referrerData } = await supabase
                .from('profiles')
                .select('id')
                .eq('safetag', data.referral_code)
                .single();

            if (referrerData) {
                const normalizedCode = (data.referral_code.startsWith('@') ? data.referral_code : `@${data.referral_code}`).toLowerCase();
                const normalizedNew = (data.safetag.startsWith('@') ? data.safetag : `@${data.safetag}`).toLowerCase();
                if (normalizedCode === normalizedNew) {
                    console.warn(`⚠️ Self-referral attempt blocked for safetag: ${data.safetag}`);
                } else {
                    referredById = referrerData.id;
                    console.log(`✅ Referral code resolved to ID: ${referredById}`);
                }
            } else {
                console.warn(`⚠️ Referral code not found: ${data.referral_code}. Proceeding without attribution.`);
            }
        }

        // Create profile
        console.log('🔨 Creating profile in Supabase...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                safetag: data.safetag,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                primary_platform: data.primary_platform,
                referred_by_id: referredById
            })
            .select()
            .single();

        if (profileError) {
            console.error('❌ Profile creation error:', profileError);
            throw profileError;
        }

        console.log('✨ Profile created successfully:', profile.id);

        console.log('🔗 Linking account...');
        const { error: linkError } = await supabase
            .from('linked_accounts')
            .insert({
                profile_id: profile.id,
                platform: data.primary_platform,
                platform_id: data.platform_id,
                is_primary: true
            });

        if (linkError) {
            console.error('❌ Account link error:', linkError);
            throw linkError;
        }

        // --- EARLY BIRD BADGE ---
        try {
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            if (count !== null && count <= 100) {
                await supabase.from('profile_badges').insert({
                    profile_id: profile.id,
                    badge_key: 'early_bird'
                });
                console.log(`🏆 Awarded Early Bird badge to ${profile.id} (Total users: ${count})`);
            }
        } catch (badgeErr) {
            console.error('Failed to award Early Bird badge:', badgeErr);
        }

        // Welcome email (non-blocking)
        const reviewsUrl = process.env.REVIEWS_URL || 'https://safeeely.com';
        sendEmail({
            to: profile.email,
            subject: `Welcome to Safeeely, ${profile.first_name || profile.safetag}!`,
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #0f172a;">Welcome to Safeeely! 🎉</h2>
                    <p style="color: #475569;">Hi <b>${profile.first_name || profile.safetag}</b>, your account is ready.</p>
                    <p style="color: #475569;"><b>Your Safetag:</b> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${profile.safetag}</code></p>
                    <p style="color: #475569;">You can use your Safetag on any of our supported platforms — Telegram, Discord, WhatsApp, and more.</p>
                    <a href="${reviewsUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0284c7;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Visit Safeeely</a>
                    <p style="font-size: 13px; color: #94a3b8; margin-top: 40px;">If you did not create this account, please contact support@safeeely.com immediately.</p>
                </div>
            `
        }).catch(e => console.error('Welcome email failed:', e.message));

        console.log('✅ Registration complete for:', data.safetag);
        return res.status(201).json(profile);
    } catch (err: any) {
        console.error('❌ Catch-all registration error:', err.message || err);
        return res.status(400).json({ error: err.message || 'Internal Server Error' });
    }
});

// Get profile by platform and ID
router.get('/by_platform/:platform/:id', async (req, res) => {
    const { platform, id } = req.params;
    console.log(`🔍 Lookup profile by platform: ${platform}, id: ${id}`);

    const { data: linkedAcc, error: linkedError } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('platform_id', id)
        .maybeSingle();

    if (linkedError) {
        console.error(`❌ Linked account error for ${platform}:${id}:`, linkedError);
        return res.status(500).json({ error: linkedError.message });
    }

    if (!linkedAcc) {
        console.warn(`⚠️ No linked account found for ${platform}:${id}`);
        return res.status(404).json({ error: 'Linked account not found' });
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', linkedAcc.profile_id)
        .maybeSingle();

    if (profileError) {
        console.error(`❌ Profile error for ${platform}:${id}:`, profileError);
        return res.status(500).json({ error: profileError.message });
    }
    console.log(`✅ Found profile for ${platform}:${id}:`, profile?.safetag);
    res.json(profile);
});

// Get profile by safetag
router.get('/by_safetag/:safetag', async (req, res) => {
    const { safetag } = req.params;
    const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
    const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
        .maybeSingle();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    if (!data) {
        return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(data);
});

// Search profile by name or safetag
router.get('/search', async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`safetag.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Get balance for a profile
router.get('/:safetag/balance', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: txns, error: txnError } = await supabase
            .from('transactions')
            .select('id, amount, currency, fee_amount, fee_allocation, transaction_type, status, milestones:transaction_milestones(*)')
            .eq('seller_id', profile.id)
            .or('status.eq.FINALIZED,transaction_type.eq.MILESTONE');

        if (txnError) throw txnError;

        const { data: withdrawals, error: withdrawalError } = await supabase
            .from('withdrawals')
            .select('amount, currency, status')
            .eq('profile_id', profile.id)
            .neq('status', 'REJECTED');

        if (withdrawalError) throw withdrawalError;

        const balances: Record<string, number> = {};

        txns.forEach(t => {
            let amountToCredit = 0;
            
            if (t.transaction_type === 'ONE_TIME' && t.status === 'FINALIZED') {
                amountToCredit = Number(t.amount);
                // Subtract fee if applicable
                if (t.fee_allocation === 'seller') {
                    amountToCredit -= Number(t.fee_amount);
                } else if (t.fee_allocation === 'split') {
                    amountToCredit -= (Number(t.fee_amount) / 2);
                }
            } else if (t.transaction_type === 'MILESTONE') {
                const releasedMilestones = t.milestones?.filter((m: any) => m.status === 'RELEASED') || [];
                const releasedTotal = releasedMilestones.reduce((sum: number, m: any) => sum + Number(m.amount), 0);
                
                if (releasedTotal > 0) {
                    amountToCredit = releasedTotal;
                    
                    // Handle fee deduction for milestones
                    // If the transaction is FINALIZED, we deduct the full fee.
                    // If it's still ongoing but some milestones are released, we deduct the fee proportionally?
                    // To keep it simple and safe for the platform, we'll deduct the FULL fee from the first release(s) 
                    // or just deduct it proportionally. Proportionally is fairer.
                    const totalProjectAmount = Number(t.amount);
                    const totalFee = Number(t.fee_amount);
                    const feeToDeduct = t.fee_allocation === 'seller' ? totalFee : (t.fee_allocation === 'split' ? totalFee / 2 : 0);
                    
                    if (feeToDeduct > 0 && totalProjectAmount > 0) {
                        const proportion = releasedTotal / totalProjectAmount;
                        amountToCredit -= (feeToDeduct * proportion);
                    }
                }
            }

            if (amountToCredit > 0) {
                balances[t.currency] = (balances[t.currency] || 0) + amountToCredit;
            }
        });

        // Add referral commission earnings
        const { data: referralCommissions } = await supabase
            .from('referral_commissions')
            .select('amount, currency')
            .eq('referrer_id', profile.id)
            .eq('status', 'COMPLETED');

        referralCommissions?.forEach((rc: any) => {
            balances[rc.currency] = (balances[rc.currency] || 0) + Number(rc.amount);
        });

        // Subtract withdrawals
        withdrawals?.forEach(w => {
            if (balances[w.currency] !== undefined) {
                balances[w.currency] -= Number(w.amount);
            }
        });

        const formattedBalances = Object.entries(balances).map(([currency, amount]) => ({
            currency,
            amount: Number(Math.max(0, amount).toFixed(2)) // Ensure balance doesn't go below 0 due to rounding
        }));

        res.json({ balances: formattedBalances });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get badges for a profile
router.get('/:safetag/badges', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: badges, error } = await supabase
            .from('profile_badges')
            .select('*')
            .eq('profile_id', profile.id);

        if (error) throw error;

        const BADGE_CONFIG: Record<string, { label: string, emoji: string }> = {
            'early_bird': { label: 'Early Bird', emoji: '🐣' },
            'whale_buyer': { label: 'Whale Buyer', emoji: '🐋' },
            'trusted_seller': { label: 'Trusted Seller', emoji: '🛡️' },
            'zero_drama': { label: 'Zero Drama', emoji: '🕊️' },
            'verified_kyc': { label: 'KYC Verified', emoji: '✅' }
        };

        const result = (badges || []).map(b => ({
            key: b.badge_key,
            label: BADGE_CONFIG[b.badge_key]?.label || b.badge_key,
            emoji: BADGE_CONFIG[b.badge_key]?.emoji || '🏅',
            awarded_at: b.created_at
        }));

        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get payout methods for a profile
router.get('/:safetag/payout-methods', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        console.log(`🔍 Payout GET - Safetag: ${safetag}, Found:`, !!profile);

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: methods, error } = await supabase
            .from('payout_methods')
            .select('*')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(methods || []);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Save a new payout method
router.post('/:safetag/payout-methods', async (req, res) => {
    try {
        const { safetag } = req.params;
        const { type, details, is_default = false } = req.body;

        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        console.log(`🔍 Payout POST - Safetag: ${safetag}, Found Profile ID:`, profile.id);
        console.log(`📦 Payout Details:`, JSON.stringify(details));

        const { data, error } = await supabase
            .from('payout_methods')
            .insert({
                profile_id: profile.id,
                type,
                details: typeof details === 'string' ? JSON.parse(details) : details,
                is_default
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase Payout Insert Error:', error);
            throw error;
        }

        console.log('✨ Payout Method Created:', data.id);
        res.status(201).json(data);
    } catch (err: any) {
        console.error('❌ Payout Save Catch Error:', err.message || err);
        res.status(400).json({ error: err.message || 'Error saving payout method' });
    }
});

// Delete a payout method
router.delete('/:safetag/payout-methods/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('payout_methods')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(204).send();
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Deactivate account (Meta policy compliance)
router.post('/:safetag/deactivate', async (req, res) => {
    try {
        const { safetag } = req.params;
        const { reason } = DeactivateSchema.parse(req.body);

        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        // 1. Find profile
        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('*')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (findError) throw findError;
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        if (profile.is_deactivated) {
            return res.status(400).json({ error: 'Account already deactivated' });
        }

        console.log(`👤 Deactivating account for ${profile.safetag} (${profile.id})`);

        // 2. Anonymize Profile
        const anonymizedEmail = `deleted_${profile.id.substring(0, 8)}@safeeely.com`;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                first_name: 'Deleted',
                last_name: 'User',
                email: anonymizedEmail,
                is_deactivated: true,
                deactivation_reason: reason || 'No reason provided',
                deactivated_at: new Date().toISOString()
            })
            .eq('id', profile.id);

        if (updateError) throw updateError;

        // 3. Remove Linked Accounts
        const { error: linkDeleteError } = await supabase
            .from('linked_accounts')
            .delete()
            .eq('profile_id', profile.id);

        if (linkDeleteError) throw linkDeleteError;

        // 4. Remove Payout Methods
        const { error: payoutDeleteError } = await supabase
            .from('payout_methods')
            .delete()
            .eq('profile_id', profile.id);

        if (payoutDeleteError) throw payoutDeleteError;

        console.log(`✅ Account ${profile.safetag} deactivated successfully.`);
        res.json({ message: 'Account deactivated and personal data removed successfully.' });
    } catch (err: any) {
        console.error('❌ Deactivation Error:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

import axios from 'axios';

// Submit KYC Verification
// --- KYC Upload Helper (v1) ---
router.post('/kyc/upload', upload.single('file'), async (req: any, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        
        const file = req.file;
        const filename = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        
        // Use shared supabase client
        // Ensure 'kyc-documents' bucket exists or create it in dashboard
        const { data, error: storageErr } = await supabase.storage
            .from('kyc-documents')
            .upload(filename, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (storageErr) {
            console.error('Storage Error:', storageErr);
            return res.status(500).json({ error: 'Failed to upload to storage. ' + storageErr.message });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(filename);

        res.json({ url: publicUrl });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:safetag/kyc/submit', async (req, res) => {
    try {
        const { safetag } = req.params;
        const { firstName, lastName, phone, address, city, state, country, dob, documentCountry, nin, frontUrl, backUrl } = req.body;

        // 0. Enforce DOB
        if (!dob || dob.trim() === "") {
            return res.status(400).json({ error: 'Date of Birth is required' });
        }
        
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        // 1. Find profile and primary linked account
        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('id, safetag')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (findError || !profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', profile.id)
            .eq('is_primary', true)
            .maybeSingle();

        // 2. Insert into kyc_submissions table
        const { data: kycEntry, error: kycError } = await supabase
            .from('kyc_submissions')
            .insert({
                profile_id: profile.id,
                first_name: firstName,
                last_name: lastName,
                dob: dob || null,
                phone: phone,
                address: address,
                city: city,
                state: state,
                country: country,
                document_country: documentCountry,
                nin: nin,
                front_url: frontUrl,
                back_url: backUrl,
                status: 'PENDING'
            })
            .select()
            .single();

        if (kycError) {
            console.error('KYC Table Insert Error:', kycError);
            return res.status(400).json({ error: kycError.message });
        }

        // 3. Update profile status
        await supabase
            .from('profiles')
            .update({ kyc_status: 'PENDING' })
            .eq('id', profile.id);

        // 4. Insert into admin notifications
        try {
            await supabase.from('admin_notifications').insert({
                title: 'New KYC Submission',
                message: `User ${profile.safetag} has submitted KYC documents for review.`,
                type: 'kyc_review',
                related_id: kycEntry.id,
                status: 'unread'
            });
        } catch (e) {
            console.error('Admin notification failed:', e);
        }

        // 5. Send Social Notification to User
        if (linked) {
            const msg = `🛡️ **KYC Processing**\n\nHello @${profile.safetag}, your Know Your Customer (KYC) details have been successfully submitted and are currently being reviewed by our compliance team. ✅\n\nYou will be notified here as soon as it is approved.`;
            await sendNotification(linked.platform, linked.platform_id, msg);
        }

        console.log(`✅ KYC Submitted & Saved for ${profile.safetag}`);
        res.json({ message: 'KYC submitted successfully. Awaiting review.' });
    } catch (err: any) {
        console.error('❌ KYC Submit Error:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

export default router;
