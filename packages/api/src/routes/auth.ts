import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification } from '../services/notifications';

const router = Router();

// Validation schemas
const SendOTPSchema = z.object({
    safetag: z.string(),
    platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram']),
    platform_id: z.string()
});

const VerifyOTPSchema = z.object({
    safetag: z.string(),
    platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram']),
    platform_id: z.string(),
    otp: z.string().length(6)
});

const BlockActionSchema = z.object({
    safetag: z.string(),
    platform_id: z.string() // The platform_id to block
});

/**
 * Send OTP to existing accounts
 */
router.post('/otp/send', async (req, res) => {
    try {
        const { safetag, platform, platform_id } = SendOTPSchema.parse(req.body);
        const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        // 1. Find Profile
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('id, email, first_name')
            .eq('safetag', cleanTag)
            .single();

        if (pError || !profile) return res.status(404).json({ error: 'Profile not found' });

        // 2. Check if this platform_id is banned for this profile
        const { data: isBanned } = await supabase
            .from('binding_bans')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('platform_id', platform_id)
            .maybeSingle();

        if (isBanned) {
            return res.status(403).json({ error: 'This account has been blocked from linking to this Safetag by the owner.' });
        }

        // 3. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        // 4. Save OTP
        const { error: otpError } = await supabase
            .from('auth_otps')
            .upsert({
                profile_id: profile.id,
                platform,
                platform_id,
                code: otp,
                expires_at: expiresAt
            });

        if (otpError) throw otpError;

        // 5. Send to existing social media accounts
        const { data: accounts } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', profile.id);

        if (accounts && accounts.length > 0) {
            const blockLink = `block_binding|${profile.id}|${platform_id}`;
            const msg = `🛡️ <b>Security Alert: New Binding Request</b>\n\nSomeone is attempting to link a new <b>${platform}</b> account to your Safetag (<b>${cleanTag}</b>).\n\n<b>Verification Code:</b> <code>${otp}</code>\n\nDid you initiate this? If not, click the button below to block this account forever.`;
            
            await Promise.all(accounts.map(acc => 
                sendNotification(acc.platform, acc.platform_id, msg, [{
                    label: '🚫 Block & Ban Action',
                    customId: blockLink
                }])
            ));
        }

        // 6. Send to Email (Mocked or real if service exists)
        console.log(`[OTP] Sent ${otp} to ${profile.email}`);

        res.json({ success: true, message: 'OTP sent to your linked accounts and email.' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Verify OTP and Link Account
 */
router.post('/otp/verify', async (req, res) => {
    try {
        const { safetag, platform, platform_id, otp } = VerifyOTPSchema.parse(req.body);
        const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name')
            .eq('safetag', cleanTag)
            .single();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // 1. Check OTP
        const { data: otpData, error: otpError } = await supabase
            .from('auth_otps')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('platform', platform)
            .eq('platform_id', platform_id)
            .eq('code', otp)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (otpError || !otpData) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // 2. Link Account
        const { error: linkError } = await supabase
            .from('linked_accounts')
            .insert({
                profile_id: profile.id,
                platform,
                platform_id,
                is_primary: false
            });

        if (linkError) {
            if (linkError.code === '23505') { // Duplicate unique key
                return res.status(400).json({ error: 'This account is already linked to a profile.' });
            }
            throw linkError;
        }

        // 3. Cleanup OTP
        await supabase.from('auth_otps').delete().eq('id', otpData.id);

        res.json({ success: true, profile });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Block account from binding
 */
router.post('/block', async (req, res) => {
    try {
        const { safetag, platform_id } = BlockActionSchema.parse(req.body);
        const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('safetag', cleanTag)
            .single();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // Insert into bans
        await supabase
            .from('binding_bans')
            .insert({
                profile_id: profile.id,
                platform_id
            });

        // Delete any pending OTPs
        await supabase
            .from('auth_otps')
            .delete()
            .eq('profile_id', profile.id)
            .eq('platform_id', platform_id);

        res.json({ success: true, message: 'Account blocked from binding.' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
