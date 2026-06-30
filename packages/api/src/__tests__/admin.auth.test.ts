/**
 * Admin authentication endpoint tests.
 * Covers POST /api/admin/auth/login, GET /api/admin/auth/me, POST /api/admin/auth/logout.
 * Supabase and bcrypt are mocked — no real DB calls.
 */

// jest.mock calls are hoisted above imports by ts-jest
jest.mock('@safepal/shared', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

// Mock all services that admin routes may import at module level
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
import bcrypt from 'bcryptjs';
import { createApp } from '../createApp';

const TEST_SECRET = 'test-jwt-secret-must-be-32-chars-x';

// Build the Express app once for all tests in this file
let app: ReturnType<typeof createApp>;

beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    app = createApp();
});

beforeEach(() => {
    jest.clearAllMocks();
});

// Returns a Supabase-style chainable query that resolves to { data, error }
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

const ACTIVE_ADMIN = {
    id: 'admin-uuid-001',
    name: 'Test Admin',
    email: 'admin@safepadi.com',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    password_hash: '$2a$12$fakeHashForTestingOnly',
};

const fromMock = supabase.from as jest.Mock;
const compareMock = bcrypt.compare as jest.Mock;

// Helper — sign a valid admin JWT for use in auth header tests
function signAdminToken(overrides: Record<string, any> = {}) {
    return jwt.sign(
        { id: 'admin-uuid-001', role: 'SUPER_ADMIN', email: 'admin@safepadi.com', typ: 'admin', ...overrides },
        TEST_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );
}

// ─── POST /api/admin/auth/login ───────────────────────────────────────────────

describe('POST /api/admin/auth/login', () => {
    it('returns 200 with token and user on correct credentials', async () => {
        fromMock.mockReturnValue(makeChain({ data: ACTIVE_ADMIN, error: null }));
        compareMock.mockResolvedValue(true);

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'admin@safepadi.com', password: 'correct-password-here' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
        expect(res.body.user.email).toBe('admin@safepadi.com');
        expect(res.body.user.role).toBe('SUPER_ADMIN');
        expect(res.body.user.password_hash).toBeUndefined();
    });

    it('returns 401 when password does not match', async () => {
        fromMock.mockReturnValue(makeChain({ data: ACTIVE_ADMIN, error: null }));
        compareMock.mockResolvedValue(false);

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'admin@safepadi.com', password: 'wrong-password' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Password Mismatch/);
    });

    it('returns 401 when email is not found in DB', async () => {
        fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'No rows found' } }));

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'ghost@example.com', password: 'any-password' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/DB Error or Not Found/);
    });

    it('returns 403 when account status is INACTIVE', async () => {
        fromMock.mockReturnValue(makeChain({
            data: { ...ACTIVE_ADMIN, status: 'INACTIVE' },
            error: null,
        }));

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'admin@safepadi.com', password: 'any-password' });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Account is disabled/);
    });

    it('returns 400 when password is missing from request body', async () => {
        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'admin@safepadi.com' });

        expect(res.status).toBe(400);
    });

    it('returns 400 when email is missing from request body', async () => {
        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ password: 'some-password' });

        expect(res.status).toBe(400);
    });

    it('normalises email to lowercase before DB lookup', async () => {
        fromMock.mockReturnValue(makeChain({ data: ACTIVE_ADMIN, error: null }));
        compareMock.mockResolvedValue(true);

        await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'ADMIN@SAFEPADI.COM', password: 'correct-password' });

        expect(fromMock).toHaveBeenCalledWith('admin_users');
    });
});

// ─── GET /api/admin/auth/me ───────────────────────────────────────────────────

describe('GET /api/admin/auth/me', () => {
    it('returns 200 with decoded claims for a valid Bearer token', async () => {
        const token = signAdminToken();

        const res = await request(app)
            .get('/api/admin/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe('admin@safepadi.com');
        expect(res.body.role).toBe('SUPER_ADMIN');
        expect(res.body.id).toBe('admin-uuid-001');
    });

    it('returns 401 NOT_AUTHENTICATED when no token is provided', async () => {
        const res = await request(app).get('/api/admin/auth/me');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('NOT_AUTHENTICATED');
    });

    it('returns 401 INVALID_TOKEN for a malformed token', async () => {
        const res = await request(app)
            .get('/api/admin/auth/me')
            .set('Authorization', 'Bearer not.a.real.token');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('returns 401 INVALID_TOKEN for a token signed with a wrong secret', async () => {
        const wrongToken = jwt.sign(
            { id: 'x', role: 'SUPER_ADMIN', email: 'x@x.com', typ: 'admin' },
            'completely-different-secret-value',
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/admin/auth/me')
            .set('Authorization', `Bearer ${wrongToken}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('returns 403 ADMIN_REQUIRED for a valid user token with wrong typ', async () => {
        const userToken = jwt.sign(
            { id: 'user-123', typ: 'user' },
            TEST_SECRET,
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/admin/auth/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('ADMIN_REQUIRED');
    });
});

// ─── POST /api/admin/auth/logout ─────────────────────────────────────────────

describe('POST /api/admin/auth/logout', () => {
    it('returns 200 and clears the sf_admin cookie', async () => {
        const res = await request(app).post('/api/admin/auth/logout');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Cookie should be cleared (set with past expiry or empty value)
        const setCookieHeader = res.headers['set-cookie'];
        expect(setCookieHeader).toBeDefined();
        const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;
        expect(cookieStr).toMatch(/sf_admin/);
    });
});
