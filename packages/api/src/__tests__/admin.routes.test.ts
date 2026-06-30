/**
 * Admin protected-route endpoint tests.
 * Verifies that every major admin route:
 *   (a) Returns 401 when called without a valid JWT
 *   (b) Returns a 2xx when called with a valid admin JWT
 *
 * Supabase is mocked to return empty-but-valid data shapes so routes don't
 * throw on missing records. No real DB or network calls are made.
 */

jest.mock('@safepal/shared', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));

jest.mock('../services/notifications', () => ({
    sendNotification: jest.fn(),
    routeNotification: jest.fn(),
    recordNotification: jest.fn(),
}));
jest.mock('../services/email', () => ({
    sendEmail: jest.fn(),
    sendAdminCaseAssignmentEmail: jest.fn(),
}));
jest.mock('../services/payout', () => ({ disburseFunds: jest.fn() }));
jest.mock('../services/magicLinkInternal', () => ({ buildInternalMagicLink: jest.fn() }));
jest.mock('../services/disputeRouter', () => ({ routeDispute: jest.fn() }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { supabase } from '@safepal/shared';
import { createApp } from '../createApp';

const TEST_SECRET = 'test-jwt-secret-must-be-32-chars-x';

const fromMock = supabase.from as jest.Mock;
const rpcMock = supabase.rpc as jest.Mock;

let app: ReturnType<typeof createApp>;

beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    app = createApp();
});

beforeEach(() => {
    jest.clearAllMocks();
    // Default: every supabase.from call returns empty results — routes should handle gracefully
    fromMock.mockReturnValue(makeChain({ data: [], error: null, count: 0 }));
    rpcMock.mockResolvedValue({ data: [], error: null });
});

// Chainable Supabase query mock — every chained method returns itself, awaiting resolves to `result`
function makeChain(result: { data?: any; error?: any; count?: number }) {
    const chain: Record<string, any> = {
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        catch: (reject: any) => Promise.resolve(result).catch(reject),
    };
    [
        'select', 'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
        'is', 'ilike', 'like', 'filter', 'not', 'or', 'match',
        'order', 'limit', 'range', 'offset', 'head',
        'insert', 'update', 'upsert', 'delete',
        'single', 'maybeSingle',
    ].forEach(m => {
        chain[m] = jest.fn().mockReturnValue(chain);
    });
    return chain;
}

// Valid admin Bearer token for use in all auth'd test calls
function adminAuthHeader() {
    const token = jwt.sign(
        { id: 'admin-uuid-001', role: 'SUPER_ADMIN', email: 'admin@safepadi.com', typ: 'admin' },
        TEST_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );
    return `Bearer ${token}`;
}

// ─── Auth guard — every protected route must reject unauthenticated requests ──

describe('Auth guard — protected routes reject unauthenticated calls', () => {
    const PROTECTED_ROUTES: Array<{ method: string; path: string }> = [
        { method: 'GET', path: '/api/admin/stats' },
        { method: 'GET', path: '/api/admin/transactions' },
        { method: 'GET', path: '/api/admin/customers' },
        { method: 'GET', path: '/api/admin/kyc' },
        { method: 'GET', path: '/api/admin/disputes' },
        { method: 'GET', path: '/api/admin/payouts' },
        { method: 'GET', path: '/api/admin/reviews' },
        { method: 'GET', path: '/api/admin/trust/overview' },
        { method: 'GET', path: '/api/admin/finance/waterfall' },
        { method: 'GET', path: '/api/admin/segments/users' },
        { method: 'GET', path: '/api/admin/system/health' },
        { method: 'GET', path: '/api/admin/communications/notifications' },
        { method: 'GET', path: '/api/admin/marketing/templates' },
        { method: 'GET', path: '/api/admin/referrals/overview' },
        { method: 'GET', path: '/api/admin/marketplace/listings' },
    ];

    PROTECTED_ROUTES.forEach(({ method, path }) => {
        it(`${method} ${path} returns 401 without token`, async () => {
            const res = await (request(app) as any)[method.toLowerCase()](path);
            expect(res.status).toBe(401);
        });
    });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
    it('returns 200 with expected top-level keys', async () => {
        const res = await request(app)
            .get('/api/admin/stats')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('volume_by_currency');
        expect(res.body).toHaveProperty('total_customers');
        expect(res.body).toHaveProperty('total_transactions');
    });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

describe('GET /api/admin/transactions', () => {
    it('returns 200 with transactions array', async () => {
        const res = await request(app)
            .get('/api/admin/transactions')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.transactions ?? res.body)).toBe(true);
    });
});

describe('GET /api/admin/transactions/:id', () => {
    it('returns 200 for a known transaction ID', async () => {
        fromMock.mockReturnValue(makeChain({ data: { id: 'txn-001', status: 'PAID', currency: 'NGN' }, error: null }));

        const res = await request(app)
            .get('/api/admin/transactions/txn-001')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });

    it('returns 404 when transaction is not found', async () => {
        fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'Not found' } }));

        const res = await request(app)
            .get('/api/admin/transactions/does-not-exist')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(404);
    });
});

// ─── Customers ────────────────────────────────────────────────────────────────

describe('GET /api/admin/customers', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/customers')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/customers/:id', () => {
    it('is accessible to authenticated admins (not 401)', async () => {
        const res = await request(app)
            .get('/api/admin/customers/user-001')
            .set('Authorization', adminAuthHeader());

        expect(res.status).not.toBe(401);
    });
});

describe('POST /api/admin/customers/:id/block', () => {
    it('is accessible to authenticated admins (not 401)', async () => {
        const res = await request(app)
            .post('/api/admin/customers/user-001/block')
            .set('Authorization', adminAuthHeader())
            .send({ reason: 'Suspected fraud' });

        expect(res.status).not.toBe(401);
    });
});

describe('POST /api/admin/customers/:id/unblock', () => {
    it('is accessible to authenticated admins (not 401)', async () => {
        const res = await request(app)
            .post('/api/admin/customers/user-001/unblock')
            .set('Authorization', adminAuthHeader());

        expect(res.status).not.toBe(401);
    });
});

// ─── KYC ──────────────────────────────────────────────────────────────────────

describe('GET /api/admin/kyc', () => {
    it('returns 200 with submissions and stats', async () => {
        const res = await request(app)
            .get('/api/admin/kyc')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('submissions');
        expect(res.body).toHaveProperty('stats');
    });
});

describe('POST /api/admin/kyc/:id/approve', () => {
    it('is accessible to authenticated admins (not 401)', async () => {
        const res = await request(app)
            .post('/api/admin/kyc/kyc-sub-001/approve')
            .set('Authorization', adminAuthHeader());

        expect(res.status).not.toBe(401);
    });
});

describe('POST /api/admin/kyc/:id/reject', () => {
    it('is accessible to authenticated admins (not 401)', async () => {
        const res = await request(app)
            .post('/api/admin/kyc/kyc-sub-001/reject')
            .set('Authorization', adminAuthHeader())
            .send({ reason: 'Document unclear' });

        expect(res.status).not.toBe(401);
    });
});

// ─── Disputes ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/disputes', () => {
    it('returns 200 with an array of disputes', async () => {
        const res = await request(app)
            .get('/api/admin/disputes')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe('GET /api/admin/disputes/unassigned', () => {
    it('returns 200 with unassigned disputes', async () => {
        const res = await request(app)
            .get('/api/admin/disputes/unassigned')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/disputes/my-cases', () => {
    it('returns 200 with cases assigned to current admin', async () => {
        const res = await request(app)
            .get('/api/admin/disputes/my-cases')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Payouts ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/payouts', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/payouts')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/reviews', () => {
    it('returns 200 with reviews array', async () => {
        const res = await request(app)
            .get('/api/admin/reviews')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/reviews/stats', () => {
    it('returns 200 with review statistics', async () => {
        const res = await request(app)
            .get('/api/admin/reviews/stats')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── System Health ────────────────────────────────────────────────────────────

describe('GET /api/admin/system/health', () => {
    it('returns 200 with uptime and node version', async () => {
        const res = await request(app)
            .get('/api/admin/system/health')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('uptime_seconds');
        expect(res.body).toHaveProperty('node_version');
    });
});

describe('GET /api/admin/system/crons', () => {
    it('returns 200 with cron history', async () => {
        const res = await request(app)
            .get('/api/admin/system/crons')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Trust ────────────────────────────────────────────────────────────────────

describe('GET /api/admin/trust/overview', () => {
    it('returns 200 with trust overview metrics', async () => {
        const res = await request(app)
            .get('/api/admin/trust/overview')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/trust/flagged', () => {
    it('returns 200 with flagged profiles', async () => {
        const res = await request(app)
            .get('/api/admin/trust/flagged')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/trust/leaderboard', () => {
    it('returns 200 with trust leaderboard', async () => {
        const res = await request(app)
            .get('/api/admin/trust/leaderboard')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Finance ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/finance/waterfall', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/finance/waterfall')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/finance/escrow-exposure', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/finance/escrow-exposure')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Segments ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/segments/users', () => {
    it('returns 200 with users array', async () => {
        const res = await request(app)
            .get('/api/admin/segments/users')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe('GET /api/admin/segments/counts', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/segments/counts')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Communications ───────────────────────────────────────────────────────────

describe('GET /api/admin/communications/notifications', () => {
    it('returns 200 with notifications array', async () => {
        const res = await request(app)
            .get('/api/admin/communications/notifications')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/communications/delivery-stats', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/communications/delivery-stats')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Marketing ────────────────────────────────────────────────────────────────

describe('GET /api/admin/marketing/templates', () => {
    it('returns 200 with templates array', async () => {
        const res = await request(app)
            .get('/api/admin/marketing/templates')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe('GET /api/admin/marketing/campaigns', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/marketing/campaigns')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Referrals ────────────────────────────────────────────────────────────────

describe('GET /api/admin/referrals/overview', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/referrals/overview')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/referrals/leaderboard', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/referrals/leaderboard')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Marketplace ──────────────────────────────────────────────────────────────

describe('GET /api/admin/marketplace/listings', () => {
    it('returns 200 with listings array', async () => {
        const res = await request(app)
            .get('/api/admin/marketplace/listings')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

describe('GET /api/admin/marketplace/stats', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/marketplace/stats')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Management ───────────────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
    it('returns 200 with admin users array', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe('GET /api/admin/management/workload', () => {
    it('returns 200', async () => {
        const res = await request(app)
            .get('/api/admin/management/workload')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/settings', () => {
    it('is accessible to authenticated admins (not 401)', async () => {
        const res = await request(app)
            .get('/api/admin/settings')
            .set('Authorization', adminAuthHeader());

        expect(res.status).not.toBe(401);
    });
});

// ─── SOP Management ───────────────────────────────────────────────────────────

describe('GET /api/admin/disputes/sops', () => {
    it('returns 200 with SOPs array', async () => {
        const res = await request(app)
            .get('/api/admin/disputes/sops')
            .set('Authorization', adminAuthHeader());

        expect(res.status).toBe(200);
    });
});
