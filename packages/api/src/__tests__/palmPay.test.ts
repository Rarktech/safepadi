import crypto from 'crypto';
import { buildCanonicalString, verifyWebhook, isConfigured } from '../services/providers/palmPay';

// ─── buildCanonicalString ──────────────────────────────────────────────────────

describe('buildCanonicalString', () => {
    it('sorts keys alphabetically and joins with &', () => {
        const result = buildCanonicalString({ b: 'two', a: 'one', c: 'three' });
        expect(result).toBe('a=one&b=two&c=three');
    });

    it('filters out null, undefined, and empty string values', () => {
        const result = buildCanonicalString({ a: 'keep', b: null, c: undefined, d: '', e: 'also' });
        expect(result).toBe('a=keep&e=also');
    });

    it('handles numeric values', () => {
        const result = buildCanonicalString({ amount: 50000, currency: 'NGN' });
        expect(result).toBe('amount=50000&currency=NGN');
    });

    it('returns empty string for empty object', () => {
        expect(buildCanonicalString({})).toBe('');
    });

    it('returns empty string when all values are filtered out', () => {
        expect(buildCanonicalString({ a: null, b: undefined })).toBe('');
    });
});

// ─── verifyWebhook ─────────────────────────────────────────────────────────────

describe('verifyWebhook', () => {
    it('returns false when PALMPAY_PUBLIC_KEY is not set', () => {
        delete process.env.PALMPAY_PUBLIC_KEY;
        expect(verifyWebhook('{}', 'badsig')).toBe(false);
    });

    it('returns false for an invalid signature', () => {
        process.env.PALMPAY_PUBLIC_KEY = 'not-a-real-key';
        expect(verifyWebhook('{"orderId":"test"}', 'invalidsig')).toBe(false);
    });

    it('returns false for malformed JSON body', () => {
        process.env.PALMPAY_PUBLIC_KEY = 'dummy';
        expect(verifyWebhook('not-json', 'badsig')).toBe(false);
    });

    it('verifies a real RSA-signed canonical string', () => {
        // Generate a throwaway RSA key pair
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        const publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

        process.env.PALMPAY_PRIVATE_KEY = privatePem;
        process.env.PALMPAY_PUBLIC_KEY = publicPem;

        const params = { orderId: 'abc123', orderStatus: 'SUCCESS', amount: '5000' };
        const canonical = buildCanonicalString(params);

        // Sign the canonical string the same way the provider does
        const signer = crypto.createSign('SHA256');
        signer.update(canonical);
        const signature = signer.sign(privatePem, 'base64');

        // verifyWebhook should parse the JSON, rebuild canonical, and verify
        const rawBody = JSON.stringify(params);
        expect(verifyWebhook(rawBody, signature)).toBe(true);
    });

    it('rejects if the signature was made over raw JSON (wrong approach)', () => {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        const publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

        process.env.PALMPAY_PRIVATE_KEY = privatePem;
        process.env.PALMPAY_PUBLIC_KEY = publicPem;

        const rawBody = '{"orderId":"abc","orderStatus":"SUCCESS"}';

        // Sign the raw body directly (wrong — PalmPay doesn't do this)
        const signer = crypto.createSign('SHA256');
        signer.update(rawBody);
        const wrongSignature = signer.sign(privatePem, 'base64');

        // Our verifyWebhook rebuilds canonical string, so this should FAIL
        expect(verifyWebhook(rawBody, wrongSignature)).toBe(false);
    });
});

// ─── isConfigured ──────────────────────────────────────────────────────────────

describe('isConfigured', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
        Object.assign(process.env, origEnv);
    });

    it('returns false when PALMPAY_APP_ID is missing', () => {
        delete process.env.PALMPAY_APP_ID;
        process.env.PALMPAY_PRIVATE_KEY = 'key';
        process.env.PALMPAY_PUBLIC_KEY = 'pubkey';
        expect(isConfigured()).toBe(false);
    });

    it('returns false when PALMPAY_PRIVATE_KEY is missing', () => {
        process.env.PALMPAY_APP_ID = 'app123';
        delete process.env.PALMPAY_PRIVATE_KEY;
        process.env.PALMPAY_PUBLIC_KEY = 'pubkey';
        expect(isConfigured()).toBe(false);
    });

    it('returns true when all three vars are set', () => {
        process.env.PALMPAY_APP_ID = 'app123';
        process.env.PALMPAY_PRIVATE_KEY = 'privatekey';
        process.env.PALMPAY_PUBLIC_KEY = 'publickey';
        expect(isConfigured()).toBe(true);
    });
});
