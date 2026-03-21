import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification } from '../services/notifications';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

const RegistrationSchema = z.object({
    safetag: z.string().min(3).max(20),
    email: z.string().email(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    primary_platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram']),
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
                referredById = referrerData.id;
                console.log(`✅ Referral code resolved to ID: ${referredById}`);
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

        // Link account
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

    const { data, error } = await supabase
        .from('linked_accounts')
        .select('profile:profiles!inner(*)')
        .eq('platform', platform)
        .eq('platform_id', id)
        .maybeSingle();

    if (error) {
        console.error(`❌ Lookup error for ${platform}:${id}:`, error);
        return res.status(500).json({ error: error.message });
    }

    if (!data) {
        console.warn(`⚠️ No linked account found for ${platform}:${id}`);
        return res.status(404).json({ error: 'Linked account not found' });
    }

    const profile = (data as any).profile;
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

        const { data: txns, error } = await supabase
            .from('transactions')
            .select('amount, currency, fee_amount, fee_allocation')
            .eq('seller_id', profile.id)
            .eq('status', 'FINALIZED');

        if (error) throw error;

        const balances: Record<string, number> = {};

        txns.forEach(t => {
            let credit = Number(t.amount);
            if (t.fee_allocation === 'seller') {
                credit -= Number(t.fee_amount);
            } else if (t.fee_allocation === 'split') {
                credit -= (Number(t.fee_amount) / 2);
            }

            balances[t.currency] = (balances[t.currency] || 0) + credit;
        });

        const formattedBalances = Object.entries(balances).map(([currency, amount]) => ({
            currency,
            amount: Number(amount.toFixed(2))
        }));

        res.json({ balances: formattedBalances });
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
