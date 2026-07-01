import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { sendNotification, routeNotification, recordNotification } from '../services/notifications';
import { sendEmail, sendAdminCaseAssignmentEmail } from '../services/email';
import { disburseFunds } from '../services/payout';
import { buildInternalMagicLink } from '../services/magicLinkInternal';
import { routeDispute } from '../services/disputeRouter';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();
// --- ADMIN AUTHENTICATION ---

router.post('/auth/login', async (req, res) => {
    try {
        console.log("🔐 Login attempt received for:", req.body.email);
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const sanitizedEmail = email.trim().toLowerCase();

        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', sanitizedEmail)
            .single();

        console.log("📦 Supabase DB response:", { found: !!admin, error: error?.message, adminEmail: admin?.email });

        if (error || !admin) return res.status(401).json({ error: 'Invalid credentials (DB Error or Not Found)' });
        if (admin.status !== 'ACTIVE') return res.status(403).json({ error: 'Account is disabled' });

        const isValid = await bcrypt.compare(password, admin.password_hash);
        console.log("🔑 Password validation:", isValid ? "SUCCESS" : "FAILED");
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials (Password Mismatch)' });

        const token = jwt.sign(
            { id: admin.id, role: admin.role, email: admin.email, typ: 'admin' },
            process.env.JWT_SECRET!,
            { expiresIn: '24h', algorithm: 'HS256' }
        );

        res.cookie('sf_admin', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });
        res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
    } catch (err: any) {
        console.error("❌ Login exception:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/auth/me', (req: any, res: any) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.sf_admin;
    if (!token) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as any;
        if (decoded.typ !== 'admin') return res.status(403).json({ error: 'ADMIN_REQUIRED' });
        res.json({ email: decoded.email, role: decoded.role, id: decoded.id });
    } catch {
        res.status(401).json({ error: 'INVALID_TOKEN' });
    }
});

router.post('/auth/logout', (req: any, res: any) => {
    res.clearCookie('sf_admin', { path: '/' });
    res.json({ success: true });
});

export const adminAuthMiddleware = (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.sf_admin;
        if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
        if ((decoded as any).typ !== 'admin') throw new Error('Invalid token type');
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

router.use(adminAuthMiddleware);

router.get('/stats', async (req, res) => {
    try {
        // 1. Transactions Data
        console.log('📊 Fetching admin stats...');
        const { data: txns, error: txError } = await supabase
            .from('transactions')
            .select('total_amount, fee_amount, currency, status, created_at')
            .neq('status', 'CANCELLED');
        
        if (txError) {
            console.error('❌ Error fetching transactions:', txError);
            throw txError;
        }
        console.log(`✅ Found ${txns?.length || 0} transactions.`);

        // Aggregations
        const volumeByCurrency: Record<string, number> = {};
        const profitByCurrency: Record<string, number> = {};
        const chartMap: Record<string, number> = {};

        txns?.forEach(tx => {
            const currency = tx.currency || 'USDT';
            
            // Volume (All non-cancelled)
            volumeByCurrency[currency] = (volumeByCurrency[currency] || 0) + Number(tx.total_amount);
            
            // Profit (Only finalized)
            if (tx.status === 'FINALIZED') {
                profitByCurrency[currency] = (profitByCurrency[currency] || 0) + Number(tx.fee_amount);
            }

            // Chart Data (Volume over time - grouped by month)
            const date = new Date(tx.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            chartMap[month] = (chartMap[month] || 0) + Number(tx.total_amount);
        });

        // 2. Customers Data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: newCustomersToday } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        const { data: profileData, error: pError } = await supabase
            .from('profiles')
            .select('primary_platform');
        
        if (pError) throw pError;

        const totalCustomers = profileData?.length || 0;
        const platformStats: Record<string, number> = {};
        const validPlatforms = ['telegram', 'discord', 'whatsapp', 'instagram'];
        
        profileData?.forEach(p => {
            if (p.primary_platform && validPlatforms.includes(p.primary_platform.toLowerCase())) {
                const pName = p.primary_platform.toLowerCase();
                platformStats[pName] = (platformStats[pName] || 0) + 1;
            }
        });

        // 3. Historical Chart Formatting (Past 12 months)
        const formattedChartData = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleString('default', { month: 'short' });
            formattedChartData.push({
                name: label,
                value: Math.round((chartMap[label] || 0) * 100) / 100
            });
        }

        // 4. Recent Transactions
        const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(safetag), seller:seller_id(safetag)')
            .order('created_at', { ascending: false })
            .limit(10);

        // 5. Pending action counts + 7-day stats
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [
            { count: pendingKycCount },
            { count: openDisputesCount },
            { count: pendingPayoutsCount },
            { count: last7dNewUsers },
            { count: last7dTransactions },
            { count: last7dDisputes },
        ] = await Promise.all([
            supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
            supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'OPEN').eq('is_ai_paused', true),
            supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
            supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
            supabase.from('disputes').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        ]);

        res.json({
            volume_by_currency: volumeByCurrency,
            profit_by_currency: profitByCurrency,
            total_transactions: txns?.length || 0,
            new_customers_today: newCustomersToday || 0,
            total_customers: totalCustomers,
            platform_stats: platformStats,
            chart_data: formattedChartData,
            recent_transactions: recentTransactions || [],
            pending_kyc_count: pendingKycCount || 0,
            open_disputes_count: openDisputesCount || 0,
            pending_payouts_count: pendingPayoutsCount || 0,
            last_7d_new_users: last7dNewUsers || 0,
            last_7d_transactions: last7dTransactions || 0,
            last_7d_disputes: last7dDisputes || 0,
        });
    } catch (err: any) {
        console.error('❌ Admin Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS MANAGEMENT ---

/**
 * List all transactions with aggregate stats for Admin Ledger
 */
router.get('/transactions', async (req, res) => {
    try {
        const { status, currency, search } = req.query;

        // 1. Aggregate stats (always over all non-cancelled txns)
        const { data: allTxns, error: allErr } = await supabase
            .from('transactions')
            .select('id, total_amount, fee_amount, currency, status, created_at')
            .neq('status', 'CANCELLED');
        if (allErr) throw allErr;

        const volumeByCurrency: Record<string, number> = {};
        const feesByCurrency: Record<string, number> = {};
        let totalCount = 0, activeCount = 0, completedCount = 0, disputedCount = 0;

        const activeStatuses = ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'];

        allTxns?.forEach(tx => {
            totalCount++;
            const cur = tx.currency || 'USDT';
            volumeByCurrency[cur] = (volumeByCurrency[cur] || 0) + Number(tx.total_amount);
            if (tx.status === 'FINALIZED') {
                feesByCurrency[cur] = (feesByCurrency[cur] || 0) + Number(tx.fee_amount);
                completedCount++;
            }
            if (activeStatuses.includes(tx.status)) activeCount++;
            if (tx.status === 'DISPUTED') disputedCount++;
        });

        // 2. Full list with filters
        let query = supabase
            .from('transactions')
            .select('id, txn_code, product_name, amount, total_amount, fee_amount, currency, status, fee_allocation, created_at, updated_at, buyer:buyer_id(safetag, first_name, last_name), seller:seller_id(safetag, first_name, last_name)')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            if (status === 'ongoing') {
                query = query.in('status', activeStatuses);
            } else if (status === 'completed') {
                query = query.eq('status', 'FINALIZED');
            } else if (status === 'disputed') {
                query = query.eq('status', 'DISPUTED');
            } else if (status === 'cancelled') {
                query = query.eq('status', 'CANCELLED');
            } else {
                query = query.eq('status', status as string);
            }
        }

        if (currency && currency !== 'all') {
            query = query.eq('currency', (currency as string).toUpperCase());
        }

        const { data: txns, error: listErr } = await query;
        if (listErr) throw listErr;

        // Filter by search (txn_code, product name, buyer/seller safetag)
        let filteredTxns = txns || [];
        if (search) {
            const s = (search as string).toLowerCase();
            filteredTxns = filteredTxns.filter((t: any) =>
                t.txn_code?.toLowerCase().includes(s) ||
                t.product_name?.toLowerCase().includes(s) ||
                t.buyer?.safetag?.toLowerCase().includes(s) ||
                t.seller?.safetag?.toLowerCase().includes(s)
            );
        }

        res.json({
            stats: {
                total_transactions: totalCount,
                active_transactions: activeCount,
                completed_transactions: completedCount,
                disputed_transactions: disputedCount,
                volume_by_currency: volumeByCurrency,
                fees_by_currency: feesByCurrency,
            },
            transactions: filteredTxns,
        });
    } catch (err: any) {
        console.error('❌ Admin Transactions Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get full transaction details for Admin Ledger
 */
router.get('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Get Transaction & Profiles
        const { data: transaction, error: tError } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*)')
            .eq('id', id)
            .single();

        if (tError || !transaction) {
            console.error('🔍 Transaction Fetch Error:', tError || 'No transaction returned', 'ID provided:', id);
            return res.status(404).json({ error: 'Transaction not found', details: tError });
        }

        // 2. Get Proofs/Evidence
        const { data: proofs } = await supabase
            .from('transaction_proofs')
            .select('*')
            .eq('transaction_id', id);

        // 3. Get Dispute ID if disputed
        let dispute_id = null;
        if (transaction.status === 'DISPUTED') {
            const { data: dispute } = await supabase
                .from('disputes')
                .select('id')
                .eq('transaction_id', id)
                .maybeSingle();
            if (dispute) dispute_id = dispute.id;
        }

        res.json({
            ...transaction,
            transaction_proofs: proofs || [],
            dispute_id
        });
    } catch (err: any) {
        console.error('❌ Error fetching transaction details:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- DISPUTE MANAGEMENT ---

/**
 * List all disputes for Admin Resolution Center
 */
router.get('/disputes', async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('disputes')
            .select(`
                *,
                transaction:transaction_id (
                    id, 
                    txn_code, 
                    product_name, 
                    total_amount, 
                    currency, 
                    status,
                    buyer:buyer_id(safetag),
                    seller:seller_id(safetag)
                )
            `)
            .order('created_at', { ascending: false });

        if (status === 'ESCALATED') {
            query = query.eq('status', 'OPEN').eq('is_ai_paused', true);
        } else if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data || []);
    } catch (err: any) {
        console.error('❌ Error listing disputes:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get full dispute details for the Resolution Center
 */
router.get('/disputes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Get Dispute & Transaction & Profiles
        const { data: dispute, error: dError } = await supabase
            .from('disputes')
            .select(`
                *,
                transaction:transaction_id (
                    *,
                    buyer:buyer_id(*),
                    seller:seller_id(*),
                    milestones:transaction_milestones(*)
                )
            `)
            .eq('id', id)
            .single();

        if (dError || !dispute) {
            return res.status(404).json({ error: 'Dispute not found' });
        }

        // 2. Get Conversation History
        const { data: messages } = await supabase
            .from('dispute_messages')
            .select('*')
            .eq('dispute_id', id)
            .order('created_at', { ascending: true });

        // 3. Get Proofs/Evidence
        const { data: proofs } = await supabase
            .from('transaction_proofs')
            .select('*')
            .eq('transaction_id', dispute.transaction_id);

        res.json({
            ...dispute,
            messages: messages || [],
            transaction_proofs: proofs || []
        });
    } catch (err: any) {
        console.error('❌ Error fetching dispute details:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * List all customers with aggregate stats for Admin CRM
 */
router.get('/customers', async (req, res) => {
    try {
        // 1. Fetch all profiles
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select(`
                *,
                linked_accounts(id, platform, platform_id)
            `)
            .order('created_at', { ascending: false });

        if (pError) throw pError;

        // 2. Fetch all transactions for aggregates (cached for efficiency in real world, but okay for MVP)
        const { data: txns, error: txError } = await supabase
            .from('transactions')
            .select('amount, total_amount, buyer_id, seller_id, status, created_at')
            .neq('status', 'CANCELLED');

        if (txError) throw txError;

        // 3. Process aggregates
        const totalCustomers = profiles.length;
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const newCustomersCount = profiles.filter(p => new Date(p.created_at) > twentyFourHoursAgo).length;

        let totalValue = 0;
        txns.forEach(tx => {
            totalValue += Number(tx.amount);
        });
        const avgTransactionValue = txns.length > 0 ? totalValue / txns.length : 0;

        // 4. Map profiles to detailed list
        const customersList = profiles.map(p => {
            const userTxns = txns.filter(tx => tx.buyer_id === p.id || tx.seller_id === p.id);
            const userSpent = txns
                .filter(tx => tx.buyer_id === p.id && tx.status === 'FINALIZED')
                .reduce((sum, tx) => sum + Number(tx.amount), 0);
            
            // Find primary social account (usually the one they signed up with)
            const primaryLinked = p.linked_accounts?.find((l: any) => l.platform === p.primary_platform) || p.linked_accounts?.[0];

            return {
                ...p,
                primary_account_id: primaryLinked?.platform_id || 'N/A',
                linked_platforms: p.linked_accounts || [],
                total_orders: userTxns.length,
                total_spent: userSpent,
                status: p.is_blocked ? 'Blocked' : 'Active'
            };
        });

        res.json({
            stats: {
                total_customers: totalCustomers,
                new_customers_count: newCustomersCount,
                avg_transaction_value: Math.round(avgTransactionValue * 100) / 100,
                customer_satisfaction: 4.8 // Dummy data as requested
            },
            customers: customersList
        });
    } catch (err: any) {
        console.error('❌ Admin Customers Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── INDIVIDUAL CUSTOMER ACTIONS ─────────────────────────────────────────────

/**
 * View full customer profile with aggregate stats
 */
router.get('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*, linked_accounts(id, platform, platform_id)')
            .eq('id', id)
            .single();
        if (error || !profile) return res.status(404).json({ error: 'User not found' });

        // Aggregate transaction stats for this user
        const { data: txns } = await supabase
            .from('transactions')
            .select('id, amount, total_amount, fee_amount, fee_allocation, currency, status, buyer_id, seller_id, created_at')
            .or(`buyer_id.eq.${id},seller_id.eq.${id}`)
            .neq('status', 'CANCELLED');

        const totalTxns = txns?.length || 0;
        const totalSpent = txns?.filter(t => t.buyer_id === id && t.status === 'FINALIZED').reduce((s, t) => s + Number(t.total_amount), 0) || 0;
        const totalEarned = txns?.filter(t => t.seller_id === id && t.status === 'FINALIZED').reduce((s, t) => s + Number(t.amount), 0) || 0;
        const disputedCount = txns?.filter(t => t.status === 'DISPUTED').length || 0;
        const completedCount = txns?.filter(t => t.status === 'FINALIZED').length || 0;

        // Fetch Referrals
        const { count: referralCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by_id', id);
        
        // Fetch Referral Commissions
        const { data: commissions } = await supabase.from('referral_commissions').select('amount').eq('referrer_id', id).eq('status', 'COMPLETED');
        const referralEarned = commissions?.reduce((s, c) => s + Number(c.amount), 0) || 0;

        // Fetch Withdrawals for Balance Calculation
        const { data: withdrawals } = await supabase.from('withdrawals').select('amount, currency, status').eq('profile_id', id).neq('status', 'REJECTED');

        // Calculate Balances
        const balances: Record<string, number> = {};
        
        // 1. Add Credits from finalized sales
        txns?.filter(t => t.seller_id === id && t.status === 'FINALIZED').forEach(t => {
            let credit = Number(t.amount);
            if (t.fee_allocation === 'seller') credit -= Number(t.fee_amount);
            else if (t.fee_allocation === 'split') credit -= (Number(t.fee_amount) / 2);
            balances[t.currency] = (balances[t.currency] || 0) + credit;
        });

        // 2. Subtract Withdrawals
        withdrawals?.forEach(w => {
            const currency = w.currency || 'USD'; // Safe fallback
            balances[currency] = (balances[currency] || 0) - Number(w.amount);
        });

        res.json({
            ...profile,
            stats: { 
                total_transactions: totalTxns, 
                total_spent: totalSpent, 
                total_earned: totalEarned, 
                disputed: disputedCount, 
                completed: completedCount,
                referral_count: referralCount || 0,
                referral_earned: referralEarned,
                balances: Object.entries(balances).map(([currency, amount]) => ({ currency, amount: Math.max(0, amount) }))
            },
            status: profile.is_blocked ? 'Blocked' : 'Active',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get all transactions for a specific customer (for the Transactions tab)
 */
router.get('/customers/:id/transactions', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: txns, error } = await supabase
            .from('transactions')
            .select('id, txn_code, product_name, amount, total_amount, fee_amount, currency, status, fee_allocation, created_at, buyer_id, buyer:buyer_id(safetag, first_name, last_name), seller:seller_id(safetag, first_name, last_name)')
            .or(`buyer_id.eq.${id},seller_id.eq.${id}`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(txns || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get all withdrawals for a specific customer (for the Withdrawals tab)
 */
router.get('/customers/:id/withdrawals', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: withdrawals, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('profile_id', id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(withdrawals || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Create a new customer (Admin)
 */
router.post('/customers', async (req, res) => {
    try {
        const { safetag, email, first_name, last_name, primary_platform, platform_id } = req.body;
        if (!safetag || !email || !primary_platform || !platform_id) {
            return res.status(400).json({ error: 'safetag, email, primary_platform, and platform_id are required' });
        }

        // Check safetag uniqueness
        const { data: existing } = await supabase.from('profiles').select('id').eq('safetag', safetag).maybeSingle();
        if (existing) return res.status(400).json({ error: 'Safetag already taken' });

        // Insert profile
        const { data: profile, error: pErr } = await supabase
            .from('profiles')
            .insert({ safetag, email, first_name, last_name, primary_platform })
            .select()
            .single();
        if (pErr) throw pErr;

        // Link platform account
        await supabase.from('linked_accounts').insert({ profile_id: profile.id, platform: primary_platform, platform_id });

        res.status(201).json({ success: true, profile });
    } catch (err: any) {
        console.error('❌ Admin Create Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Delete a customer account
 */
router.delete('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err: any) {
        console.error('❌ Admin Delete Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Block a customer account — updates DB, sends DM + email
 */
router.post('/customers/:id/block', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch user
        const { data: user, error: fetchErr } = await supabase
            .from('profiles')
            .select('id, safetag, email, primary_platform, linked_accounts(platform, platform_id)')
            .eq('id', id)
            .single();
        if (fetchErr || !user) return res.status(404).json({ error: 'User not found' });

        // Update DB
        const { error: updateErr } = await supabase
            .from('profiles')
            .update({ is_blocked: true })
            .eq('id', id);
        if (updateErr) throw updateErr;

        const safetag = user.safetag;
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@safeeely.com';

        const dmMessage = `🚫 <b>Your Safeeely Account Has Been Blocked</b>\n\nYour account <b>@${safetag}</b> has been suspended by the platform administrators.\n\nIf you believe this is a mistake, please contact our support team at <b>${supportEmail}</b>.`;

        const emailHtml = `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
                <div style="background:#fef2f2;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
                    <span style="font-size:36px">🚫</span>
                    <h2 style="color:#dc2626;margin:8px 0 0">Account Suspended</h2>
                </div>
                <p style="color:#374151;font-size:15px">Hi <b>@${safetag}</b>,</p>
                <p style="color:#374151;font-size:15px">Your Safeeely account has been <b>suspended</b> by our platform administrators.</p>
                <p style="color:#374151;font-size:15px">If you believe this is a mistake or would like to appeal, please reach out to our support team at <a href="mailto:${supportEmail}" style="color:#059669">${supportEmail}</a>.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
                <p style="color:#9ca3af;font-size:12px;text-align:center">© Safeeely Platform · <a href="mailto:${supportEmail}" style="color:#9ca3af">${supportEmail}</a></p>
            </div>
        `;

        await routeNotification(user.id, dmMessage);
        recordNotification(user.id, 'system', '🚫 Account Suspended', 'Your Safeeely account has been suspended. Contact support to appeal.', { link_url: `/withdraw/${encodeURIComponent(safetag)}` }).catch(() => {});

        if (user.email) {
            await sendEmail({ to: user.email, subject: '🚫 Your Safeeely Account Has Been Suspended', html: emailHtml });
        }

        console.log(`🚫 Admin blocked user: @${safetag}`);
        res.json({ success: true, message: `@${safetag} has been blocked` });
    } catch (err: any) {
        console.error('❌ Admin Block Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Unblock a customer account — updates DB, sends DM + email
 */
router.post('/customers/:id/unblock', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch user
        const { data: user, error: fetchErr } = await supabase
            .from('profiles')
            .select('id, safetag, email, primary_platform, linked_accounts(platform, platform_id)')
            .eq('id', id)
            .single();
        if (fetchErr || !user) return res.status(404).json({ error: 'User not found' });

        // Update DB
        const { error: updateErr } = await supabase
            .from('profiles')
            .update({ is_blocked: false })
            .eq('id', id);
        if (updateErr) throw updateErr;

        const safetag = user.safetag;

        const dmMessage = `✅ <b>Your Safeeely Account Has Been Reinstated</b>\n\nGreat news! Your account <b>@${safetag}</b> has been unblocked by our platform administrators.\n\nYou can now carry out transactions on the platform again. Welcome back! 🎉`;

        const emailHtml = `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
                <div style="background:#f0fdf4;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
                    <span style="font-size:36px">✅</span>
                    <h2 style="color:#059669;margin:8px 0 0">Account Reinstated</h2>
                </div>
                <p style="color:#374151;font-size:15px">Hi <b>@${safetag}</b>,</p>
                <p style="color:#374151;font-size:15px">Great news! Your Safeeely account has been <b>reinstated</b>. You can now carry out transactions on the platform again.</p>
                <p style="color:#374151;font-size:15px">Welcome back! If you have any questions, feel free to reach out to our support team.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
                <p style="color:#9ca3af;font-size:12px;text-align:center">© Safeeely Platform</p>
            </div>
        `;

        await routeNotification(user.id, dmMessage);
        recordNotification(user.id, 'system', '✅ Account Reinstated', 'Your Safeeely account has been reinstated. Welcome back!', { link_url: `/withdraw/${encodeURIComponent(safetag)}` }).catch(() => {});

        if (user.email) {
            await sendEmail({ to: user.email, subject: '✅ Your Safeeely Account Has Been Reinstated', html: emailHtml });
        }

        console.log(`✅ Admin unblocked user: @${safetag}`);
        res.json({ success: true, message: `@${safetag} has been unblocked` });
    } catch (err: any) {
        console.error('❌ Admin Unblock Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Broadcast marketing messages to all active users on specified platforms
 */
router.post('/broadcast', upload.single('attachment'), async (req, res) => {
    try {
        const { message } = req.body;
        let platforms = req.body.platforms;
        let attachment_url = req.body.attachment_url;

        if (typeof platforms === 'string') {
            try {
                platforms = JSON.parse(platforms);
            } catch (e) {
                platforms = platforms.split(',');
            }
        }

        if (!message || !platforms || !Array.isArray(platforms)) {
            return res.status(400).json({ error: 'message and platforms array are required' });
        }

        if (req.file) {
            const ext = req.file.originalname.split('.').pop() || 'png';
            const fileName = `broadcasts/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('dispute-evidence')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });
            if (uploadError) throw new Error("Failed to upload file to storage: " + uploadError.message);
            const { data } = supabase.storage.from('dispute-evidence').getPublicUrl(fileName);
            attachment_url = data.publicUrl;
        }

        let query = supabase.from('linked_accounts').select('platform, platform_id, profile:profiles!inner(is_blocked, is_deactivated)');

        if (!platforms.includes('all')) {
            query = query.in('platform', platforms);
        }

        const { data: accounts, error } = await query;
        if (error) throw error;

        // Filter active users
        const activeAccounts = accounts?.filter((acc: any) => !acc.profile?.is_blocked && !acc.profile?.is_deactivated) || [];

        console.log(`📡 Initiating broadcast to ${activeAccounts.length} targeted accounts on platforms: ${platforms.join(',')}`);

        // Process asynchronously without blocking the admin dashboard response
        const processBroadcast = async () => {
            const accounts = [...activeAccounts];
            let successCount = 0;
            let failCount = 0;
            while (accounts.length) {
                const chunk = accounts.splice(0, 100);
                for (const acc of chunk) {
                    try {
                        await sendNotification(acc.platform, acc.platform_id, message, undefined, attachment_url);
                        successCount++;
                    } catch {
                        failCount++;
                    }
                    // Delay to respect platform rate limiting (e.g., Telegram is 30 msg/sec)
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            console.log(`📢 Broadcast Finished. Success: ${successCount}, Failed: ${failCount}`);
        };

        processBroadcast();

        res.json({
            success: true,
            message: `Broadcast successfully queued for ${activeAccounts.length} integrated accounts`
        });
    } catch (err: any) {
        console.error('❌ Broadcast Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// --- ADMIN MANAGEMENT ROUTES (SUPABASE DB) ---

router.get('/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('id, name, email, role, status, created_at, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform')
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/users', async (req, res) => {
    try {
        const { name, email, role, password, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform } = req.body;
        if (!name || !email || !role || !password)
            return res.status(400).json({ error: 'Missing required profile fields or password.' });

        const password_hash = await bcrypt.hash(password, 10);

        const { data, error } = await supabase.from('admin_users').insert([{
            name, email, role, password_hash, status: 'ACTIVE',
            specialist_title: specialist_title || null,
            specialist_bio: specialist_bio || null,
            specialties: specialties || [],
            cases_resolved: cases_resolved || 0,
            years_on_platform: years_on_platform || 0,
        }]).select('id, name, email, role, status, created_at, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform').single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
            throw error;
        }
        res.status(201).json({ message: 'Admin created successfully', data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const { role, status, password } = req.body;
        const id = req.params.id;

        const { data: current, error: fetchErr } = await supabase.from('admin_users').select('*').eq('id', id).single();
        if (fetchErr || !current) return res.status(404).json({ error: 'Admin not found.' });
        
        // Prevent disabling or altering the final Super Admin
        if (current.role === 'SUPER_ADMIN') {
            const { count } = await supabase
                .from('admin_users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'SUPER_ADMIN')
                .neq('id', id);
                
            if (count === 0 && (role !== 'SUPER_ADMIN' || status === 'INACTIVE' || status === 'DELETED')) {
                return res.status(403).json({ error: 'Cannot modify or disable the last remaining Super Admin.' });
            }
        }

        const updates: any = {};
        if (role) updates.role = role;
        if (status) updates.status = status;
        if (password) updates.password_hash = await bcrypt.hash(password, 10);
        if ('specialist_title' in req.body) updates.specialist_title = req.body.specialist_title;
        if ('specialist_bio' in req.body) updates.specialist_bio = req.body.specialist_bio;
        if ('specialties' in req.body) updates.specialties = req.body.specialties;
        if ('cases_resolved' in req.body) updates.cases_resolved = req.body.cases_resolved;
        if ('years_on_platform' in req.body) updates.years_on_platform = req.body.years_on_platform;

        const { data, error } = await supabase
            .from('admin_users')
            .update(updates)
            .eq('id', id)
            .select('id, name, email, role, status, created_at, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform')
            .single();
            
        if (error) throw error;
        res.json({ message: 'Admin updated successfully', data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { data: current, error: fetchErr } = await supabase.from('admin_users').select('*').eq('id', id).single();
        if (fetchErr || !current) return res.status(404).json({ error: 'Admin not found.' });

        if (current.role === 'SUPER_ADMIN') {
            const { count } = await supabase
                .from('admin_users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'SUPER_ADMIN')
                .neq('id', id);
                
            if (count === 0) {
                return res.status(403).json({ error: 'Cannot delete the last remaining Super Admin.' });
            }
        }

        const { error } = await supabase.from('admin_users').delete().eq('id', id);
        if (error) throw error;
        
        res.json({ success: true, message: 'Admin deleted successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


// ─── KYC MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * List all KYC submissions with high-level stats
 */
router.get('/kyc', async (req, res) => {
    try {
        const { status } = req.query;

        // 1. Stats
        const { data: allKyc, error: kycErr } = await supabase
            .from('kyc_submissions')
            .select('status');
        
        if (kycErr) throw kycErr;

        const stats = {
            total: allKyc.length,
            pending: allKyc.filter(k => k.status === 'PENDING').length,
            approved: allKyc.filter(k => k.status === 'APPROVED').length,
            rejected: allKyc.filter(k => k.status === 'REJECTED').length,
        };

        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: verifiedUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'VERIFIED');

        // 2. Main List
        let query = supabase
            .from('kyc_submissions')
            .select('*, profile:profile_id(safetag, first_name, last_name, email)')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: submissions, error: listErr } = await query;
        if (listErr) throw listErr;

        res.json({
            stats: {
                ...stats,
                total_users: totalUsers || 0,
                verified_users: verifiedUsers || 0,
                unverified_users: (totalUsers || 0) - (verifiedUsers || 0)
            },
            submissions: submissions || []
        });
    } catch (err: any) {
        console.error('❌ Admin KYC List Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get detailed KYC submission
 */
router.get('/kyc/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('kyc_submissions')
            .select('*, profile:profile_id(*, linked_accounts(*))')
            .eq('id', id)
            .single();

        if (error || !data) return res.status(404).json({ error: 'KYC submission not found' });

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Approve KYC
 */
router.post('/kyc/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch submission and linked accounts
        const { data: kyc, error: fErr } = await supabase
            .from('kyc_submissions')
            .select('*, profile:profile_id(id, safetag, primary_platform, linked_accounts(*))')
            .eq('id', id)
            .single();

        if (fErr || !kyc) return res.status(404).json({ error: 'KYC not found' });

        // 2. Update status
        await supabase.from('kyc_submissions').update({ status: 'APPROVED', updated_at: new Date().toISOString() }).eq('id', id);
        await supabase.from('profiles').update({ kyc_status: 'VERIFIED' }).eq('id', kyc.profile_id);

        // 3. Notify User
        const linked: any = kyc.profile?.linked_accounts?.find((l: any) => l.platform === kyc.profile?.primary_platform) || kyc.profile?.linked_accounts?.[0];
        
        if (linked) {
            const msg = `🎉 **KYC Verified Successfully!**\n\nCongratulations @${kyc.profile.safetag}! 🥳 Your identity has been verified. You can now carry out your transactions smoothly and securely—the **Safeeely** way! 🛡️✨\n\nThank you for being part of our secure community! 🤝🌍`;
            await sendNotification(linked.platform, linked.platform_id, msg);
        }
        recordNotification(kyc.profile_id, 'kyc', '🎉 KYC Verified!', 'Your identity has been verified — your account is now fully unlocked', { link_url: `/withdraw/${encodeURIComponent(kyc.profile.safetag)}` }).catch(() => {});

        res.json({ success: true, message: 'KYC approved' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Reject KYC
 */
router.post('/kyc/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

        // 1. Fetch submission
        const { data: kyc, error: fErr } = await supabase
            .from('kyc_submissions')
            .select('*, profile:profile_id(id, safetag, primary_platform, linked_accounts(*))')
            .eq('id', id)
            .single();

        if (fErr || !kyc) return res.status(404).json({ error: 'KYC not found' });

        // 2. Update status
        await supabase.from('kyc_submissions').update({ 
            status: 'REJECTED', 
            rejection_reason: reason,
            updated_at: new Date().toISOString() 
        }).eq('id', id);
        
        await supabase.from('profiles').update({ kyc_status: 'REJECTED' }).eq('id', kyc.profile_id);

        // 3. Notify User
        const linked: any = kyc.profile?.linked_accounts?.find((l: any) => l.platform === kyc.profile?.primary_platform) || kyc.profile?.linked_accounts?.[0];
        
        if (linked) {
            const frontendUrl = process.env.REVIEWS_URL || 'https://safeeely.com';
            const kycRetryUrl = await buildInternalMagicLink({ profileId: kyc.profile_id, safetag: kyc.profile.safetag, platform: linked.platform, platformId: linked.platform_id, scope: 'kyc' });
            const msg = `⚠️ **KYC Verification Issue**\n\nHello @${kyc.profile.safetag}, unfortunately your recent KYC submission was not approved for the following reason:\n\n📝 **Reason:** ${reason}\n\nNo worries! You can quickly correct this and retry. Click the button below to update your details. 🔄`;

            await sendNotification(linked.platform, linked.platform_id, msg, [
                { label: "Retry KYC Verification 🔎", url: kycRetryUrl }
            ]);
        }
        recordNotification(kyc.profile_id, 'kyc', '⚠️ KYC Rejected', `KYC submission rejected: ${reason}`, { link_url: '/kyc', reason }).catch(() => {});
        if (kyc.profile?.email) {
            const frontendUrl = process.env.REVIEWS_URL || 'https://safeeely.com';
            sendEmail({
                to: kyc.profile.email,
                subject: '⚠️ KYC Submission Rejected — Please Resubmit',
                html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0"><h2 style="color:#dc2626">KYC Rejected</h2><p>Hi <b>@${kyc.profile.safetag}</b>,</p><p>Your KYC submission was not approved.</p><p><b>Reason:</b> ${reason}</p><p>Please resubmit your documents via the Safeeely app to complete verification.</p></div>`
            }).catch(() => {});
        }

        res.json({ success: true, message: 'KYC rejected' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- PLATFORM SETTINGS ---

router.get('/settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('key, value');
        if (error) throw error;

        const settings: Record<string, any> = {};
        (data || []).forEach((row: any) => {
            const raw = row.value;
            if (raw === 'true') settings[row.key] = true;
            else if (raw === 'false') settings[row.key] = false;
            else {
                const n = parseFloat(raw);
                settings[row.key] = isNaN(n) ? raw : n;
            }
        });
        res.json(settings);
    } catch (err: any) {
        console.error('GET /admin/settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.patch('/settings', async (req, res) => {
    try {
        const adminReq = req as any;
        if (adminReq.admin?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can modify platform settings' });
        }

        const allowed = [
            // legacy
            'platform_fee_rate',
            'referral_tier1_percent',
            'referral_tier2_percent',
            'community_free_revenue_share',
            'community_pro_revenue_share',
            'community_enterprise_revenue_share',
            'community_pro_price',
            'community_enterprise_price',
            'community_pro_duration_days',
            'community_enterprise_duration_days',
            // fees
            'platform_fee_percent_ngn',
            'platform_fee_percent_usd',
            'platform_fee_percent_usdt',
            'default_fee_allocation',
            'transaction_minimum_ngn',
            'transaction_minimum_usd',
            // payouts
            'auto_disburse_enabled',
            'auto_disburse_threshold_ngn',
            'auto_disburse_threshold_usd',
            'auto_disburse_threshold_gbp',
            'max_pending_withdrawals_per_24h',
            'crypto_payouts_enabled',
            // referral
            'referral_programme_enabled',
            // kyc
            'kyc_required_for_transactions',
            'kyc_auto_approve',
            'kyc_threshold_ngn',
            'kyc_threshold_usd',
            'kyc_doc_nin',
            'kyc_doc_passport',
            'kyc_doc_drivers_license',
            // disputes
            'dispute_ai_mediator_enabled',
            'dispute_auto_routing_enabled',
            'dispute_resolution_window_hours',
            'dispute_specialist_auto_assign',
            'dispute_escalation_threshold_hours',
            // platform features
            'marketplace_enabled',
            'milestone_transactions_enabled',
            'magic_link_auth_enabled',
            'new_registrations_enabled',
            'maintenance_mode',
            // security
            'admin_session_timeout_hours',
            'admin_2fa_required',
            'admin_ip_whitelist',
        ];
        const updates = req.body as Record<string, any>;

        const unknownKeys = Object.keys(updates).filter(k => !allowed.includes(k));
        if (unknownKeys.length > 0) {
            return res.status(400).json({ error: `Unknown settings keys: ${unknownKeys.join(', ')}` });
        }

        // Validate legacy decimal fields
        const feeRate = updates.platform_fee_rate ?? null;
        const t1 = updates.referral_tier1_percent ?? null;
        const t2 = updates.referral_tier2_percent ?? null;

        if (feeRate !== null && (feeRate < 0 || feeRate > 0.50)) {
            return res.status(400).json({ error: 'platform_fee_rate must be between 0 and 0.50 (0–50%)' });
        }
        if (t1 !== null && (t1 < 0 || t1 > 1)) {
            return res.status(400).json({ error: 'referral_tier1_percent must be between 0 and 1 (0–100%)' });
        }
        if (t2 !== null && (t2 < 0 || t2 > 1)) {
            return res.status(400).json({ error: 'referral_tier2_percent must be between 0 and 1 (0–100%)' });
        }

        if (t1 !== null || t2 !== null) {
            const { data: current } = await supabase
                .from('platform_settings')
                .select('key, value')
                .in('key', ['referral_tier1_percent', 'referral_tier2_percent']);

            const currentMap: Record<string, number> = {};
            (current || []).forEach((r: any) => { currentMap[r.key] = parseFloat(r.value); });

            const effectiveTier1 = t1 !== null ? t1 : (currentMap['referral_tier1_percent'] ?? 0.10);
            const effectiveTier2 = t2 !== null ? t2 : (currentMap['referral_tier2_percent'] ?? 0.05);

            if (effectiveTier1 + effectiveTier2 > 1.0) {
                return res.status(400).json({
                    error: `Tier 1 (${(effectiveTier1 * 100).toFixed(2)}%) + Tier 2 (${(effectiveTier2 * 100).toFixed(2)}%) cannot exceed 100% of the platform fee`
                });
            }
        }

        for (const [key, value] of Object.entries(updates)) {
            const { error } = await supabase
                .from('platform_settings')
                .upsert({ key, value: String(value), updated_at: new Date().toISOString() });
            if (error) throw error;
        }

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err: any) {
        console.error('PATCH /admin/settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * List all withdrawals for admin dashboard (paginated, filterable by status)
 */
router.get('/payouts', async (req, res) => {
    try {
        const { status, page = '1', limit = '50' } = req.query as Record<string, string>;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        let query = supabase
            .from('withdrawals')
            .select(`
                id, amount, currency, status, reference, requires_approval,
                provider_order_no, failure_reason, created_at, attempted_at, settled_at,
                details,
                profile:profile_id(id, safetag, email),
                payout_method:payout_method_id(id, type, details)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limitNum - 1);

        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ data: data || [], total: count ?? 0, page: pageNum, limit: limitNum });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Approve a withdrawal — triggers automated disbursement for PENDING_APPROVAL rows
 */
router.post('/payouts/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: withdrawal, error } = await supabase
            .from('withdrawals')
            .select('*, profile:profile_id(id, safetag, email, primary_platform, linked_accounts(platform, platform_id, is_primary))')
            .eq('id', id)
            .single();

        if (error || !withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

        // If PENDING_APPROVAL, set to PROCESSING and trigger disbursement
        if (withdrawal.status === 'PENDING_APPROVAL') {
            await supabase.from('withdrawals').update({ status: 'PROCESSING' }).eq('id', id);
            setImmediate(() => {
                disburseFunds(id).catch(e => console.error(`[Admin Approve] disburseFunds failed for ${id}:`, e.message));
            });
            return res.json({ success: true, message: 'Disbursement initiated' });
        }

        // Legacy: manual admin approval path (for rows without auto-disburse)
        await supabase.from('withdrawals').update({ status: 'PAID', settled_at: new Date().toISOString() }).eq('id', id);

        const profile = withdrawal.profile as any;
        const linked = (profile?.linked_accounts || []).find((l: any) => l.is_primary) || profile?.linked_accounts?.[0];

        const msg = `✅ <b>Withdrawal Successful!</b>\n\n<b>${withdrawal.amount} ${withdrawal.currency}</b> has been sent to your payout method.\n\n📋 Reference: <b>${withdrawal.reference}</b>`;
        if (linked) {
            sendNotification(linked.platform, linked.platform_id, msg).catch(() => {});
        }
        recordNotification(profile.id, 'withdrawal', '✅ Withdrawal Successful', `${withdrawal.amount} ${withdrawal.currency} sent to your payout method`, { withdrawal_id: id, amount: withdrawal.amount, currency: withdrawal.currency, reference: withdrawal.reference, link_url: `/withdraw/${encodeURIComponent(profile.safetag)}?view=withdraw` }).catch(() => {});

        if (profile?.email) {
            sendEmail({
                to: profile.email,
                subject: `✅ Withdrawal Successful — ${withdrawal.amount} ${withdrawal.currency}`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0"><h2 style="color:#059669">Withdrawal Successful</h2><p>Hi <b>@${profile.safetag}</b>,</p><p>Your withdrawal of <b>${withdrawal.amount} ${withdrawal.currency}</b> has been processed and sent to your payout method.</p><p><b>Reference:</b> ${withdrawal.reference}</p></div>`
            }).catch(() => {});
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Reject a withdrawal (mark REJECTED, notify user)
 */
router.post('/payouts/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data: withdrawal, error } = await supabase
            .from('withdrawals')
            .select('*, profile:profile_id(id, safetag, email, primary_platform, linked_accounts(platform, platform_id, is_primary))')
            .eq('id', id)
            .single();

        if (error || !withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

        await supabase.from('withdrawals').update({ status: 'REJECTED', details: { ...(withdrawal.details || {}), rejection_reason: reason } }).eq('id', id);

        const profile = withdrawal.profile as any;
        const linked = (profile?.linked_accounts || []).find((l: any) => l.is_primary) || profile?.linked_accounts?.[0];

        const msg = `❌ <b>Withdrawal Failed</b>\n\nYour withdrawal of <b>${withdrawal.amount} ${withdrawal.currency}</b> could not be processed.\n\n📝 <b>Reason:</b> ${reason || 'No reason provided'}\n\nPlease contact support or retry.`;
        if (linked) {
            sendNotification(linked.platform, linked.platform_id, msg).catch(() => {});
        }
        recordNotification(profile.id, 'withdrawal', '❌ Withdrawal Failed', `${withdrawal.amount} ${withdrawal.currency} — ${reason || 'contact support'}`, { withdrawal_id: id, amount: withdrawal.amount, currency: withdrawal.currency, reason, link_url: `/withdraw/${encodeURIComponent(profile.safetag)}?view=withdraw` }).catch(() => {});

        if (profile?.email) {
            sendEmail({
                to: profile.email,
                subject: `❌ Withdrawal Request Rejected`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0"><h2 style="color:#dc2626">Withdrawal Failed</h2><p>Hi <b>@${profile.safetag}</b>,</p><p>Your withdrawal of <b>${withdrawal.amount} ${withdrawal.currency}</b> was rejected.</p><p><b>Reason:</b> ${reason || 'No reason provided'}</p><p>Please contact support if you have questions.</p></div>`
            }).catch(() => {});
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// DISPUTE MANAGEMENT — SPECIALIST ROUTING & ASSIGNMENT
// ============================================================

/**
 * Unassigned escalated disputes — is_ai_paused = true AND no admin assigned
 */
router.get('/disputes/unassigned', async (req: any, res) => {
    try {
        const { data, error } = await supabase
            .from('disputes')
            .select(`
                id, dispute_type, pipeline_tier, created_at, status,
                transaction:transaction_id(amount, currency, product_name,
                    buyer:buyer_id(safetag), seller:seller_id(safetag))
            `)
            .eq('is_ai_paused', true)
            .eq('status', 'OPEN')
            .is('assigned_admin_id', null)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const now = Date.now();
        const enriched = (data || []).map((d: any) => ({
            ...d,
            age_hours: Math.floor((now - new Date(d.created_at).getTime()) / 3600000),
        }));

        res.json({ disputes: enriched, count: enriched.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * My open cases — disputes assigned to the current admin
 */
router.get('/disputes/my-cases', async (req: any, res) => {
    try {
        const adminId = req.admin?.id;
        if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('disputes')
            .select(`
                id, dispute_type, pipeline_tier, created_at, status,
                transaction:transaction_id(amount, currency, product_name,
                    buyer:buyer_id(safetag), seller:seller_id(safetag))
            `)
            .eq('assigned_admin_id', adminId)
            .eq('status', 'OPEN')
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ disputes: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Assign or reassign a dispute to a specific admin
 */
router.patch('/disputes/:id/assign', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { admin_id, reason } = req.body;
        const assignedBy = req.admin?.id;

        if (!admin_id) return res.status(400).json({ error: 'admin_id is required' });

        const { data: targetAdmin, error: adminErr } = await supabase
            .from('admin_users')
            .select('id, name, email, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform')
            .eq('id', admin_id)
            .eq('status', 'ACTIVE')
            .single();

        if (adminErr || !targetAdmin) return res.status(404).json({ error: 'Admin not found or inactive' });

        const { data: dispute } = await supabase
            .from('disputes')
            .select('metadata, dispute_type, transaction:transaction_id(amount, currency, pipeline_tier)')
            .eq('id', id)
            .single();

        if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

        // Close any current open assignment
        await supabase.from('dispute_assignments')
            .update({ unassigned_at: new Date().toISOString() })
            .eq('dispute_id', id)
            .is('unassigned_at', null)
            .then(undefined, () => {});

        const snapshot = {
            id: (targetAdmin as any).id,
            name: (targetAdmin as any).name,
            specialist_title: (targetAdmin as any).specialist_title,
            specialist_bio: (targetAdmin as any).specialist_bio,
            specialties: (targetAdmin as any).specialties || [],
            cases_resolved: (targetAdmin as any).cases_resolved || 0,
            years_on_platform: (targetAdmin as any).years_on_platform || 0,
        };

        const merged = { ...((dispute as any).metadata || {}), assigned_specialist: snapshot };

        await supabase.from('disputes')
            .update({ assigned_admin_id: admin_id, metadata: merged })
            .eq('id', id);

        await supabase.from('dispute_assignments').insert({
            dispute_id: id,
            assigned_to: admin_id,
            assigned_by: assignedBy || null,
            reason: reason || 'MANUAL_REASSIGN',
        }).then(undefined, () => {});

        // Insert system message in dispute thread
        await supabase.from('dispute_messages').insert({
            dispute_id: id,
            sender_type: 'AI',
            content: `**[SYSTEM]** This case has been reassigned to **${(targetAdmin as any).name}** (${(targetAdmin as any).specialist_title || 'Dispute Specialist'}).`,
        });

        // Notify assigned admin by email
        const txn = (dispute as any).transaction;
        const adminPanelUrl = `${process.env.REVIEWS_URL || 'https://safeeely.com'}/admin/disputes/${id}`;
        if ((targetAdmin as any).email) {
            sendAdminCaseAssignmentEmail((targetAdmin as any).email, {
                adminName: (targetAdmin as any).name,
                disputeId: id,
                disputeType: (dispute as any).dispute_type || 'GENERIC',
                amount: txn?.amount || 0,
                currency: txn?.currency || '',
                pipelineTier: txn?.pipeline_tier || 'STANDARD',
                adminPanelUrl,
            });
        }

        res.json({ success: true, specialist: snapshot });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Assignment history for a single dispute
 */
router.get('/disputes/:id/assignments', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('dispute_assignments')
            .select(`
                id, reason, assigned_at, unassigned_at,
                assigned_to:admin_users!dispute_assignments_assigned_to_fkey(id, name, specialist_title),
                assigned_by:admin_users!dispute_assignments_assigned_by_fkey(id, name)
            `)
            .eq('dispute_id', id)
            .order('assigned_at', { ascending: true });

        if (error) throw error;
        res.json({ assignments: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin workload — open/resolved dispute counts per admin
 */
router.get('/management/workload', async (req: any, res) => {
    try {
        const { data: admins, error: adminErr } = await supabase
            .from('admin_users')
            .select('id, name, specialist_title, specialties, cases_resolved, status')
            .eq('status', 'ACTIVE');

        if (adminErr) throw adminErr;

        const { data: openDisputes } = await supabase
            .from('disputes')
            .select('assigned_admin_id')
            .eq('status', 'OPEN')
            .not('assigned_admin_id', 'is', null);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: resolvedToday } = await supabase
            .from('disputes')
            .select('assigned_admin_id')
            .eq('status', 'RESOLVED')
            .gte('resolved_at', today.toISOString())
            .not('assigned_admin_id', 'is', null);

        const openMap: Record<string, number> = {};
        for (const d of (openDisputes || [])) {
            if (d.assigned_admin_id) openMap[d.assigned_admin_id] = (openMap[d.assigned_admin_id] || 0) + 1;
        }
        const resolvedTodayMap: Record<string, number> = {};
        for (const d of (resolvedToday || [])) {
            if (d.assigned_admin_id) resolvedTodayMap[d.assigned_admin_id] = (resolvedTodayMap[d.assigned_admin_id] || 0) + 1;
        }

        const workload = (admins || []).map((a: any) => ({
            ...a,
            open_cases: openMap[a.id] || 0,
            resolved_today: resolvedTodayMap[a.id] || 0,
        }));

        res.json({ workload });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// DISPUTE SOP MANAGEMENT
// ============================================================

router.get('/disputes/sops', async (req: any, res) => {
    try {
        let query = supabase.from('dispute_sops').select('*');
        if (req.query.status) query = query.eq('status', req.query.status);
        if (req.query.dispute_type) query = query.eq('dispute_type', req.query.dispute_type);
        if (req.query.severity) query = query.eq('severity', req.query.severity);
        if (req.query.search) query = query.ilike('title', `%${req.query.search}%`);
        query = query.order('priority', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        const stats = {
            total: data?.length || 0,
            active: data?.filter((s: any) => s.status === 'ACTIVE').length || 0,
            pending_approval: data?.filter((s: any) => s.status === 'PENDING_REVIEW' && !s.human_approved).length || 0,
            most_triggered: data?.sort((a: any, b: any) => b.hit_count - a.hit_count)[0]?.title || null,
        };

        res.json({ sops: data || [], stats });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/disputes/sops', async (req: any, res) => {
    try {
        const { sop_code, title, rule_body, dispute_type, applies_to_agent, severity, priority } = req.body;
        if (!sop_code || !title || !rule_body) return res.status(400).json({ error: 'sop_code, title, rule_body required' });

        const { data, error } = await supabase.from('dispute_sops').insert({
            sop_code, title, rule_body,
            dispute_type: dispute_type || null,
            applies_to_agent: applies_to_agent || 'all',
            severity: severity || 'ADVISORY',
            priority: priority ?? 50,
            status: 'PENDING_REVIEW',
            human_approved: false,
            hit_count: 0,
        }).select().single();

        if (error) throw error;
        res.status(201).json({ sop: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/disputes/sops/:id', async (req: any, res) => {
    try {
        const { title, rule_body, dispute_type, applies_to_agent, severity, priority } = req.body;
        const { data, error } = await supabase.from('dispute_sops')
            .update({ title, rule_body, dispute_type, applies_to_agent, severity, priority, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select().single();
        if (error) throw error;
        res.json({ sop: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/disputes/sops/:id/status', async (req: any, res) => {
    try {
        const { status } = req.body;
        if (!['ACTIVE', 'ARCHIVED', 'PENDING_REVIEW'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const { data, error } = await supabase.from('dispute_sops').update({ status, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json({ sop: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/disputes/sops/:id/approve', async (req: any, res) => {
    try {
        const { data, error } = await supabase.from('dispute_sops')
            .update({ human_approved: true, status: 'ACTIVE', updated_at: new Date().toISOString() })
            .eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json({ sop: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/disputes/sops/analytics', async (req: any, res) => {
    try {
        const { data: adjudications } = await supabase
            .from('dispute_adjudications')
            .select('resolution_source, human_overrode_ai, low_confidence');

        const total = adjudications?.length || 0;
        const aiResolved = adjudications?.filter((a: any) => a.resolution_source === 'AI').length || 0;
        const adminOverrides = adjudications?.filter((a: any) => a.human_overrode_ai).length || 0;
        const slaEnforced = adjudications?.filter((a: any) => a.resolution_source === 'SLA').length || 0;
        const lowConfidence = adjudications?.filter((a: any) => a.low_confidence).length || 0;

        const { data: sops } = await supabase.from('dispute_sops').select('title, sop_code, hit_count').order('hit_count', { ascending: false }).limit(10);

        res.json({
            total_adjudications: total,
            ai_resolved: aiResolved,
            admin_overrides: adminOverrides,
            sla_enforced: slaEnforced,
            low_confidence_rate: total ? +(lowConfidence / total * 100).toFixed(1) : 0,
            top_sops: sops || [],
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── System Health & Cron Endpoints ───────────────────────────────────────────

const CRON_DEFINITIONS = [
    { name: 'weekly_digest',        schedule: '0 9 * * 1',   label: 'Weekly Group Digest',         humanSchedule: 'Mon 09:00 UTC' },
    { name: 'license_expiry',       schedule: '0 8 * * *',   label: 'License Expiry Check',        humanSchedule: 'Daily 08:00 UTC' },
    { name: 'transaction_reminders',schedule: '0 */2 * * *', label: 'Transaction Reminders',       humanSchedule: 'Every 2h' },
    { name: 'onboarding_drip',      schedule: '0 10 * * *',  label: 'Onboarding Drip',             humanSchedule: 'Daily 10:00 UTC' },
    { name: 're_engagement',        schedule: '0 11 * * *',  label: 'Re-Engagement + Balance Nudge', humanSchedule: 'Daily 11:00 UTC' },
    { name: 'referral_summary',     schedule: '0 9 1 * *',   label: 'Monthly Referral Summary',    humanSchedule: '1st of month 09:00 UTC' },
    { name: 'dispute_enforcement',  schedule: '*/10 * * * *',label: 'Dispute SLA Enforcement',     humanSchedule: 'Every 10 min' },
    { name: 'fraud_enforcement',    schedule: '0 */6 * * *', label: 'Fraud Enforcement',           humanSchedule: 'Every 6h' },
    { name: 'payout_reconciliation',schedule: '0 */4 * * *', label: 'Payout Reconciliation',       humanSchedule: 'Every 4h' },
];

router.get('/system/health', async (req, res) => {
    try {
        const [
            { count: pendingKyc },
            { count: openDisputes },
            { count: pendingPayouts },
        ] = await Promise.all([
            supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
            supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'OPEN').eq('is_ai_paused', true),
            supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL'),
        ]);

        const apiStart = Date.now();
        const apiLatencyMs = Date.now() - apiStart;

        res.json({
            pending_kyc_count: pendingKyc || 0,
            open_disputes_count: openDisputes || 0,
            pending_payouts_count: pendingPayouts || 0,
            api_latency_ms: apiLatencyMs,
            node_version: process.version,
            uptime_seconds: Math.floor(process.uptime()),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/system/crons', async (req, res) => {
    try {
        const { data: runs } = await supabase
            .from('cron_run_history')
            .select('job_name, started_at, completed_at, status, records_processed, error_message')
            .order('started_at', { ascending: false })
            .limit(200);

        const lastRunMap: Record<string, any> = {};
        for (const run of (runs || [])) {
            if (!lastRunMap[run.job_name]) {
                lastRunMap[run.job_name] = run;
            }
        }

        const cronStatus = CRON_DEFINITIONS.map(def => ({
            ...def,
            last_run: lastRunMap[def.name] || null,
        }));

        res.json(cronStatus);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/system/crons/:name/trigger', async (req, res) => {
    const { name } = req.params;
    const validJobs = CRON_DEFINITIONS.map(d => d.name);
    if (!validJobs.includes(name)) {
        return res.status(404).json({ error: 'Unknown job name' });
    }

    // Dynamically import and fire the cron function
    (async () => {
        try {
            const startedAt = new Date().toISOString();
            let mod: any;
            switch (name) {
                case 'weekly_digest':         mod = await import('../cron/weeklyDigest'); await mod.runWeeklyDigest(); break;
                case 'license_expiry':        mod = await import('../cron/licenseExpiry'); await mod.runLicenseExpiryCheck(); break;
                case 'transaction_reminders': mod = await import('../cron/transactionReminders'); await mod.runTransactionReminders(); break;
                case 'onboarding_drip':       mod = await import('../cron/onboardingDrip'); await mod.runOnboardingDrip(); break;
                case 're_engagement':         mod = await import('../cron/reEngagement'); await mod.runReEngagement(); break;
                case 'referral_summary':      mod = await import('../cron/referralSummary'); await mod.runMonthlyReferralSummary(); break;
                case 'dispute_enforcement':   mod = await import('../cron/disputeEnforcement'); await mod.runDisputeEnforcement(); break;
                case 'fraud_enforcement':     mod = await import('../cron/fraudEnforcement'); await mod.runFraudEnforcement(); break;
                case 'payout_reconciliation': mod = await import('../cron/transactionReminders'); await mod.runPayoutReconciliation(); break;
            }
            supabase.from('cron_run_history').insert({ job_name: name, started_at: startedAt, completed_at: new Date().toISOString(), status: 'SUCCESS' }).then(undefined, () => {});
        } catch (err: any) {
            console.error(`[manual-trigger:${name}] failed:`, err.message);
        }
    })();

    res.json({ triggered: name, message: 'Job started asynchronously' });
});

// ─── FINANCE DEEP-DIVE ────────────────────────────────────────────────────────

router.get('/finance/waterfall', async (req, res) => {
    try {
        const { period = 'month', currency = 'NGN' } = req.query;

        const now = new Date();
        let fromDate: Date;
        if (period === 'year') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        } else if (period === 'quarter') {
            fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        } else {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const { data: txns } = await supabase
            .from('transactions')
            .select('total_amount, fee_amount, currency, status')
            .eq('currency', currency as string)
            .gte('created_at', fromDate.toISOString())
            .neq('status', 'CANCELLED');

        const gross = (txns || []).reduce((s, t) => s + Number(t.total_amount), 0);
        const fees = (txns || []).filter(t => t.status === 'FINALIZED').reduce((s, t) => s + Number(t.fee_amount), 0);

        const { data: refCommissions } = await supabase
            .from('referral_commissions')
            .select('amount, currency, status')
            .eq('currency', currency as string)
            .eq('status', 'COMPLETED')
            .gte('created_at', fromDate.toISOString());

        const refPayout = (refCommissions || []).reduce((s, r) => s + Number(r.amount), 0);
        const net = fees - refPayout;

        res.json([
            { name: 'Gross Volume', value: Math.round(gross), type: 'total' },
            { name: 'Platform Fees', value: Math.round(fees), type: 'positive' },
            { name: 'Referral Payouts', value: -Math.round(refPayout), type: 'negative' },
            { name: 'Net Revenue', value: Math.round(net), type: 'net' },
        ]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/finance/commission-liability', async (req, res) => {
    try {
        const { currency, page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 50;

        let q = supabase
            .from('referral_commissions')
            .select(`
                id, amount, currency, tier, created_at,
                referrer:referrer_id(safetag),
                referred:referred_id(safetag),
                transaction:transaction_id(code)
            `)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (currency) q = q.eq('currency', currency as string);

        const { data, error } = await q;
        if (error) throw error;

        const { data: totals } = await supabase
            .from('referral_commissions')
            .select('amount, currency')
            .eq('status', 'PENDING');

        const byCurrency: Record<string, number> = {};
        for (const r of (totals || [])) {
            byCurrency[r.currency] = (byCurrency[r.currency] || 0) + Number(r.amount);
        }

        res.json({ commissions: data || [], totals_by_currency: byCurrency });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/finance/escrow-exposure', async (req, res) => {
    try {
        const ACTIVE_STATUSES = ['ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'];

        const { data: txns } = await supabase
            .from('transactions')
            .select('total_amount, currency, status')
            .in('status', ACTIVE_STATUSES);

        const exposure: Record<string, { amount: number; count: number }> = {};
        for (const t of (txns || [])) {
            if (!exposure[t.currency]) exposure[t.currency] = { amount: 0, count: 0 };
            exposure[t.currency].amount += Number(t.total_amount);
            exposure[t.currency].count += 1;
        }

        const byStatus: Record<string, number> = {};
        for (const t of (txns || [])) {
            byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        }

        res.json({
            by_currency: Object.entries(exposure).map(([currency, data]) => ({ currency, ...data, amount: Math.round(data.amount) })),
            by_status: byStatus,
            total_active_count: (txns || []).length,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/finance/refund-credits', async (req, res) => {
    try {
        const { page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 50;

        const { data, error } = await supabase
            .from('buyer_refund_credits')
            .select(`
                id, amount, currency, refund_type, status, created_at,
                profile:profile_id(safetag, email),
                dispute:dispute_id(id)
            `)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (error) throw error;

        const { data: totals } = await supabase
            .from('buyer_refund_credits')
            .select('amount, currency, status');

        const pending: Record<string, number> = {};
        const paid: Record<string, number> = {};
        for (const r of (totals || [])) {
            if (r.status === 'PENDING') {
                pending[r.currency] = (pending[r.currency] || 0) + Number(r.amount);
            } else if (r.status === 'APPLIED') {
                paid[r.currency] = (paid[r.currency] || 0) + Number(r.amount);
            }
        }

        res.json({ credits: data || [], pending_by_currency: pending, paid_by_currency: paid });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/finance/withdrawal-trends', async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        const { data: withdrawals } = await supabase
            .from('withdrawals')
            .select('amount, currency, status, created_at')
            .order('created_at', { ascending: true });

        const buckets: Record<string, { total: number; paid: number; rejected: number; count: number }> = {};
        for (const w of (withdrawals || [])) {
            const d = new Date(w.created_at);
            const key = period === 'day' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7);
            if (!buckets[key]) buckets[key] = { total: 0, paid: 0, rejected: 0, count: 0 };
            buckets[key].total += Number(w.amount);
            buckets[key].count += 1;
            if (w.status === 'PAID') buckets[key].paid += Number(w.amount);
            if (w.status === 'REJECTED') buckets[key].rejected += Number(w.amount);
        }

        const limit = period === 'day' ? 30 : 12;
        const trend = Object.entries(buckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-limit)
            .map(([name, vals]) => ({ name, ...vals }));

        const statusDist: Record<string, number> = {};
        for (const w of (withdrawals || [])) {
            statusDist[w.status] = (statusDist[w.status] || 0) + 1;
        }

        res.json({ trend, status_distribution: statusDist });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── TRUST & REPUTATION ───────────────────────────────────────────────────────

router.get('/trust/overview', async (req, res) => {
    try {
        const [flagged, blocked, avgScore] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_flagged', true).eq('is_blocked', false),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_blocked', true),
            supabase.from('profile_reputation').select('trust_score').then(r => {
                const scores = (r.data || []).map((p: any) => Number(p.trust_score));
                return scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
            }),
        ]);

        res.json({
            flagged_count: flagged.count || 0,
            blocked_count: blocked.count || 0,
            avg_trust_score: Math.round(avgScore * 100) / 100,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/trust/flagged', async (req, res) => {
    try {
        const { page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 25;

        const { data, error } = await supabase
            .from('profiles')
            .select(`id, safetag, email, created_at, reputation:profile_reputation(trust_score, disputes_lost, fraud_flags)`)
            .eq('is_flagged', true)
            .eq('is_blocked', false)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/trust/leaderboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profile_reputation')
            .select(`trust_score, disputes_won, disputes_lost, profile:profile_id(safetag, email)`)
            .order('trust_score', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/trust/:profileId/clear-flag', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { reason } = req.body;
        const { error } = await supabase
            .from('profiles')
            .update({ is_flagged: false })
            .eq('id', profileId);
        if (error) throw error;
        res.json({ success: true, reason });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/trust/:profileId/score', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { new_score, reason } = req.body;

        const { data: existing } = await supabase
            .from('profile_reputation')
            .select('trust_score_overrides')
            .eq('profile_id', profileId)
            .single();

        const overrides = existing?.trust_score_overrides || [];
        overrides.push({ score: new_score, reason, by: (req as any).admin?.id, at: new Date().toISOString() });

        const { error } = await supabase
            .from('profile_reputation')
            .update({ trust_score: new_score, trust_score_overrides: overrides })
            .eq('profile_id', profileId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REFERRALS MANAGEMENT ─────────────────────────────────────────────────────

router.get('/referrals/overview', async (req, res) => {
    try {
        const [referrers, pending, referred, paid] = await Promise.all([
            supabase.from('referral_commissions').select('referrer_id', { count: 'exact', head: false }).eq('status', 'COMPLETED').then(r => {
                return { count: new Set((r.data || []).map((x: any) => x.referrer_id)).size };
            }),
            supabase.from('referral_commissions').select('amount, currency').eq('status', 'PENDING').then(r => {
                const out: Record<string, number> = {};
                for (const rc of (r.data || [])) out[rc.currency] = (out[rc.currency] || 0) + Number(rc.amount);
                return out;
            }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).not('referred_by_id', 'is', null),
            supabase.from('referral_commissions').select('amount, currency').eq('status', 'COMPLETED').then(r => {
                const out: Record<string, number> = {};
                for (const rc of (r.data || [])) out[rc.currency] = (out[rc.currency] || 0) + Number(rc.amount);
                return out;
            }),
        ]);

        res.json({
            active_referrers: (referrers as any).count,
            pending_liability: pending,
            total_referred: referred.count || 0,
            total_paid: paid,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/referrals/leaderboard', async (req, res) => {
    try {
        const { period = 'all', page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 25;

        let q = supabase
            .from('referral_commissions')
            .select('referrer_id, amount, currency, tier, profiles!referrer_id(safetag)')
            .eq('status', 'COMPLETED');

        if (period === 'monthly') {
            const start = new Date();
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            q = q.gte('created_at', start.toISOString());
        }

        const { data } = await q;
        const byReferrer: Record<string, any> = {};
        for (const rc of (data || [])) {
            if (!byReferrer[rc.referrer_id]) {
                byReferrer[rc.referrer_id] = {
                    referrer_id: rc.referrer_id,
                    safetag: (rc as any).profiles?.safetag,
                    tier1: 0, tier2: 0, total: 0,
                };
            }
            if (rc.tier === 1) byReferrer[rc.referrer_id].tier1++;
            if (rc.tier === 2) byReferrer[rc.referrer_id].tier2++;
            byReferrer[rc.referrer_id].total += Number(rc.amount);
        }
        const sorted = Object.values(byReferrer)
            .sort((a, b) => b.total - a.total)
            .slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

        res.json(sorted);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/referrals/commissions', async (req, res) => {
    try {
        const { status, tier, currency, page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 50;

        let q = supabase
            .from('referral_commissions')
            .select(`id, amount, currency, tier, status, created_at, referrer:referrer_id(safetag), referred:referred_id(safetag)`)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (status) q = q.eq('status', status as string);
        if (tier) q = q.eq('tier', parseInt(tier as string, 10));
        if (currency) q = q.eq('currency', currency as string);

        const { data, error } = await q;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/referrals/commissions/:id/award', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('referral_commissions')
            .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'PENDING');
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── MARKETPLACE MODERATION ───────────────────────────────────────────────────

router.get('/marketplace/listings', async (req, res) => {
    try {
        const { status, category, page = '1', search } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 25;

        let q = supabase
            .from('marketplace_listings')
            .select(`id, title, description, price, currency, category_type, intent, status, featured, created_at, view_count, seller:profile_id(safetag)`)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (status) q = q.eq('status', status as string);
        if (category) q = q.eq('category_type', category as string);
        if (search) q = q.ilike('title', `%${search}%`);

        const { data, error } = await q;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/marketplace/stats', async (req, res) => {
    try {
        const [total, active, removed] = await Promise.all([
            supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }),
            supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
            supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }).eq('status', 'REMOVED'),
        ]);
        res.json({
            total: total.count || 0,
            active: active.count || 0,
            removed: removed.count || 0,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/marketplace/listings/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const { error } = await supabase
            .from('marketplace_listings')
            .update({ status, moderation_reason: reason })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/marketplace/listings/:id/featured', async (req, res) => {
    try {
        const { id } = req.params;
        const { featured } = req.body;
        const { error } = await supabase
            .from('marketplace_listings')
            .update({ featured: Boolean(featured) })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/marketplace/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('marketplace_listings').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REVIEW MODERATION ────────────────────────────────────────────────────────

router.get('/reviews', async (req, res) => {
    try {
        const { rating, flagged, search, page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 25;

        let q = supabase
            .from('reviews')
            .select(`id, rating, comment, flagged, flagged_reason, created_at,
                reviewer:reviewer_id(safetag), reviewee:reviewee_id(safetag),
                transaction:transaction_id(code)`)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (rating) q = q.eq('rating', parseInt(rating as string, 10));
        if (flagged === 'true') q = q.eq('flagged', true);
        if (search) q = q.or(`reviewer_id.in.(select id from profiles where safetag ilike %${search}%)`);

        const { data, error } = await q;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reviews/stats', async (req, res) => {
    try {
        const [total, flaggedCount, thisWeek, ratingDist] = await Promise.all([
            supabase.from('reviews').select('*', { count: 'exact', head: true }),
            supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('flagged', true),
            supabase.from('reviews').select('*', { count: 'exact', head: true })
                .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
            supabase.from('reviews').select('rating').then(r => {
                const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                let sum = 0; let count = 0;
                for (const rev of (r.data || [])) {
                    dist[rev.rating] = (dist[rev.rating] || 0) + 1;
                    sum += rev.rating; count++;
                }
                return { dist, avg: count ? Math.round((sum / count) * 10) / 10 : 0 };
            }),
        ]);
        res.json({
            total: total.count || 0,
            flagged: flaggedCount.count || 0,
            this_week: thisWeek.count || 0,
            avg_rating: ratingDist.avg,
            distribution: ratingDist.dist,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/reviews/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/reviews/:id/flag', async (req, res) => {
    try {
        const { flagged, reason } = req.body;
        const { error } = await supabase
            .from('reviews')
            .update({ flagged: Boolean(flagged), flagged_reason: reason || null })
            .eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── COMMUNICATIONS CENTER ────────────────────────────────────────────────────

router.get('/communications/notifications', async (req, res) => {
    try {
        const { type, page = '1', profile_id } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 50;

        let q = supabase
            .from('system_notifications')
            .select(`id, type, title, content, is_read, created_at, profile:profile_id(safetag)`)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (type) q = q.eq('type', type as string);
        if (profile_id) q = q.eq('profile_id', profile_id as string);

        const { data, error } = await q;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/communications/delivery-stats', async (req, res) => {
    try {
        const days = parseInt((req.query.days as string) || '30', 10);
        const from = new Date(Date.now() - days * 86400000).toISOString();

        const { data } = await supabase
            .from('system_notifications')
            .select('type, is_read, created_at')
            .gte('created_at', from);

        const byDay: Record<string, { sent: number; read: number }> = {};
        const byType: Record<string, number> = {};
        for (const n of (data || [])) {
            const day = n.created_at.slice(0, 10);
            if (!byDay[day]) byDay[day] = { sent: 0, read: 0 };
            byDay[day].sent++;
            if (n.is_read) byDay[day].read++;
            byType[n.type] = (byType[n.type] || 0) + 1;
        }

        const trend = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vals]) => ({ date, ...vals }));

        res.json({ trend, by_type: byType });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── MARKETING TEMPLATES ──────────────────────────────────────────────────────

router.get('/marketing/templates', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/marketing/templates', async (req, res) => {
    try {
        const { name, content, platforms } = req.body;
        const { data, error } = await supabase.from('message_templates').insert({
            name, content, platforms: platforms || [],
            created_by: (req as any).admin?.id,
        }).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/marketing/templates/:id', async (req, res) => {
    try {
        const { name, content, platforms } = req.body;
        const { data, error } = await supabase.from('message_templates')
            .update({ name, content, platforms, updated_at: new Date().toISOString() })
            .eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/marketing/templates/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('message_templates').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/marketing/campaigns', async (req, res) => {
    try {
        const { page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 20;
        const { data, error } = await supabase
            .from('broadcast_campaigns')
            .select('*')
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── USER SEGMENTATION ────────────────────────────────────────────────────────

router.get('/segments/users', async (req, res) => {
    try {
        const { platform, kyc_status, page = '1' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const PAGE_SIZE = 50;

        let q = supabase
            .from('profiles')
            .select('id, safetag, email, primary_platform, kyc_status, created_at')
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

        if (platform) q = q.eq('primary_platform', platform as string);
        if (kyc_status) q = q.eq('kyc_status', kyc_status as string);

        const { data, error } = await q;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/segments/counts', async (req, res) => {
    try {
        const { platform, kyc_status } = req.query;

        let q = supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (platform) q = q.eq('primary_platform', platform as string);
        if (kyc_status) q = q.eq('kyc_status', kyc_status as string);

        const { count } = await q;
        res.json({ count: count || 0 });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;


