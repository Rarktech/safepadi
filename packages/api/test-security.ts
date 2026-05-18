import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import axios, { AxiosResponse } from 'axios';
import jwt from 'jsonwebtoken';

const API = 'http://127.0.0.1:3000/api';
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

let passed = 0, failed = 0;

async function test(name: string, fn: () => Promise<void>) {
    try { await fn(); console.log(`  ✅ ${name}`); passed++; }
    catch (e: any) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

// --- Token factories ---

function mintAdminToken(): string {
    return jwt.sign(
        { id: 'test-admin', email: 'test@safeeely.com', role: 'SUPER_ADMIN', typ: 'admin' },
        JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' }
    );
}

function mintUserToken(sub = 'test-sub-uuid', safetag = '@testuser'): string {
    return jwt.sign(
        { sub, safetag, platform: 'telegram', platform_id: 'test', jti: 'test-jti-' + Date.now(), typ: 'user', elevated_scopes: [], elev_exp: null },
        JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' }
    );
}

// --- HTTP helpers ---

async function get(path: string, token?: string): Promise<AxiosResponse> {
    const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return axios.get(`${API}${path}`, { headers, validateStatus: () => true });
}

async function post(path: string, body: any = {}, token?: string): Promise<AxiosResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return axios.post(`${API}${path}`, body, { headers, validateStatus: () => true });
}

async function patch(path: string, body: any = {}, token?: string): Promise<AxiosResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return axios.patch(`${API}${path}`, body, { headers, validateStatus: () => true });
}

async function del(path: string, token?: string): Promise<AxiosResponse> {
    const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return axios.delete(`${API}${path}`, { headers, validateStatus: () => true });
}

// =============================================
// GROUP 1 — Protected endpoints return 401 with no auth
// =============================================

async function g1_noAuth() {
    console.log('\n📋 G1 — No-auth: all protected endpoints must return 401');
    const SAFETAG = 'testuser';

    await test('GET /profiles/:safetag/balance — no auth → 401', async () => {
        const r = await get(`/profiles/${SAFETAG}/balance`);
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('GET /profiles/:safetag/payout-methods — no auth → 401', async () => {
        const r = await get(`/profiles/${SAFETAG}/payout-methods`);
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('GET /profiles/:safetag/earnings-history — no auth → 401', async () => {
        const r = await get(`/profiles/${SAFETAG}/earnings-history`);
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('GET /notifications/:safetag — no auth → 401', async () => {
        const r = await get(`/notifications/${SAFETAG}`);
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('PATCH /notifications/:safetag/read — no auth → 401', async () => {
        const r = await patch(`/notifications/${SAFETAG}/read`, { all: true });
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('DELETE /notifications/:safetag/:id — no auth → 401', async () => {
        const r = await del(`/notifications/${SAFETAG}/some-id`);
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /withdrawals/:safetag — no auth → 401', async () => {
        const r = await post(`/withdrawals/${SAFETAG}`, { amount: 100, currency: 'USD' });
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /disputes/raise — no auth → 401', async () => {
        const r = await post('/disputes/raise', { transaction_id: 'test', reason: 'test' });
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /disputes/test-id/messages — no auth → 401', async () => {
        const r = await post('/disputes/test-id/messages', { content: 'hi' });
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('GET /disputes/my-disputes — no auth → 401', async () => {
        const r = await get('/disputes/my-disputes');
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('PATCH /transactions/test-id/status — no auth → 401', async () => {
        const r = await patch('/transactions/test-id/status', { status: 'accept' });
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /transactions/test-id/upload-proof-files — no auth → 401', async () => {
        const r = await post('/transactions/test-id/upload-proof-files', {});
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /disputes/test-id/accept-verdict — no auth → 401', async () => {
        const r = await post('/disputes/test-id/accept-verdict');
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /disputes/test-id/escalate — no auth → 401', async () => {
        const r = await post('/disputes/test-id/escalate');
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /disputes/test-id/confirm-return — no auth → 401', async () => {
        const r = await post('/disputes/test-id/confirm-return', { role: 'BUYER' });
        assert(r.status === 401, `got ${r.status}`);
    });
}

// =============================================
// GROUP 2 — Admin auth works with locally-minted admin JWT
// =============================================

async function g2_adminAuth() {
    console.log('\n📋 G2 — Admin auth: locally-minted admin JWT must be accepted (no DB check)');
    const adminToken = mintAdminToken();

    await test('GET /admin/stats — admin JWT → not 401', async () => {
        const r = await get('/admin/stats', adminToken);
        assert(r.status !== 401, `got 401 (admin token rejected)`);
    });

    await test('GET /admin/auth/me — admin JWT → 200 with email+role', async () => {
        const r = await get('/admin/auth/me', adminToken);
        assert(r.status === 200, `got ${r.status}`);
        assert(r.data.email === 'test@safeeely.com', `email missing: ${JSON.stringify(r.data)}`);
        assert(r.data.role === 'SUPER_ADMIN', `role missing: ${JSON.stringify(r.data)}`);
    });

    await test('GET /admin/auth/me — no auth → 401', async () => {
        const r = await get('/admin/auth/me');
        assert(r.status === 401, `got ${r.status}`);
    });
}

// =============================================
// GROUP 3 — Cross-type JWT rejection
// =============================================

async function g3_crossType() {
    console.log('\n📋 G3 — Cross-type rejection: admin JWT must fail requireUser; user JWT must fail requireAdmin');
    const adminToken = mintAdminToken();
    const userToken  = mintUserToken();

    await test('GET /admin/stats — user JWT (typ:user) → 401', async () => {
        const r = await get('/admin/stats', userToken);
        assert(r.status === 401, `got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('POST /disputes/test-id/resolve — user JWT → 401 (requireAdmin rejects)', async () => {
        const r = await post('/disputes/test-id/resolve', { resolution_type: 'PAY_SELLER' }, userToken);
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('GET /profiles/testuser/balance — admin JWT (typ:admin) → 401 INVALID_TOKEN_TYPE', async () => {
        const r = await get('/profiles/testuser/balance', adminToken);
        assert(r.status === 401, `got ${r.status}`);
        assert(r.data.error === 'INVALID_TOKEN_TYPE', `got: ${r.data.error}`);
    });

    await test('PATCH /notifications/testuser/read — admin JWT → 401 INVALID_TOKEN_TYPE', async () => {
        const r = await patch('/notifications/testuser/read', { all: true }, adminToken);
        assert(r.status === 401, `got ${r.status}`);
        assert(r.data.error === 'INVALID_TOKEN_TYPE', `got: ${r.data.error}`);
    });
}

// =============================================
// GROUP 4 — Search injection protection
// =============================================

async function g4_injection() {
    console.log('\n📋 G4 — Search injection: PostgREST filter injection must be blocked');

    await test('GET /profiles/search?query= (empty) → 400', async () => {
        const r = await get('/profiles/search?query=');
        assert(r.status === 400, `got ${r.status}`);
    });

    await test('GET /profiles/search?query=alice,trust_score.gte.0 — injected chars stripped → not 500', async () => {
        const r = await get('/profiles/search?query=alice%2Ctrust_score.gte.0');
        // Comma stripped by whitelist → query becomes "alice" → 200 or empty array, not 500
        assert(r.status !== 500, `server error: ${JSON.stringify(r.data)}`);
        assert(r.status !== 400, `unexpected 400 for valid-after-strip query: ${JSON.stringify(r.data)}`);
    });

    await test('GET /profiles/search?query=<script>xss (special chars stripped → not 500)', async () => {
        const r = await get('/profiles/search?query=%3Cscript%3Exss');
        // <> stripped → 'scriptxss' (non-empty) → returns results, not a server error
        assert(r.status !== 500, `got ${r.status}`);
    });
}

// =============================================
// GROUP 5 — Admin login / logout cookie behaviour
// =============================================

async function g5_adminCookie() {
    console.log('\n📋 G5 — Admin cookie: login/logout endpoints behave correctly');

    await test('POST /admin/auth/login — invalid creds → 401 (not 500)', async () => {
        const r = await post('/admin/auth/login', { email: 'nobody@test.com', password: 'wrongpassword' });
        assert(r.status === 401, `got ${r.status}`);
    });

    await test('POST /admin/auth/login — missing body → 400', async () => {
        const r = await post('/admin/auth/login', {});
        assert(r.status === 400, `got ${r.status}`);
    });

    await test('POST /admin/auth/logout — returns 200 (clears sf_admin cookie)', async () => {
        const r = await post('/admin/auth/logout', {});
        assert(r.status === 200, `got ${r.status}`);
    });
}

// =============================================
// GROUP 6 — Deleted endpoint stays gone
// =============================================

async function g6_deleted() {
    console.log('\n📋 G6 — Deleted endpoint: POST /transactions/:id/pay must return 404');

    await test('POST /transactions/test-id/pay → 404 (endpoint deleted)', async () => {
        const adminToken = mintAdminToken();
        const r = await post('/transactions/test-id/pay', {}, adminToken);
        assert(r.status === 404, `got ${r.status} — endpoint may still exist!`);
    });
}

// =============================================
// MAIN
// =============================================

(async () => {
    console.log('🔒 Safeeely Security Test Suite');
    console.log('   API:', API);
    console.log('   JWT_SECRET: SET ✅\n');

    // Verify API is reachable
    try {
        await axios.get(`${API}/profiles/search?query=test`, { validateStatus: () => true });
    } catch {
        console.error('❌ Cannot reach API at', API, '— run `npm run dev:api` first');
        process.exit(1);
    }

    await g1_noAuth();
    await g2_adminAuth();
    await g3_crossType();
    await g4_injection();
    await g5_adminCookie();
    await g6_deleted();

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) { console.log('❌ Some security checks FAILED'); process.exit(1); }
    else { console.log('✅ All security checks passed'); }
})();
