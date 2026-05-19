/**
 * Run this to verify your META_APP_SECRET matches what Meta uses to sign webhooks.
 *
 * Usage (from repo root):
 *   npx ts-node packages/whatsapp/test-hmac.ts
 *
 * What to do:
 *  1. Get a webhook body from Railway logs — find a [WA-DIAG] line, note the `hex=` value
 *  2. Get the X-Hub-Signature-256 header from Railway logs — note the `sig_hdr=` value
 *  3. Set META_APP_SECRET in your .env (already there) or pass it below
 */
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const secret = (process.env.META_APP_SECRET?.trim() ?? '').replace(/[^0-9a-fA-F]/g, '');

console.log('=== META_APP_SECRET info ===');
console.log(`  Length : ${secret.length} (should be 32)`);
console.log(`  Prefix : ${secret.substring(0, 8)}`);
console.log(`  Suffix : ${secret.substring(secret.length - 4)}`);
console.log(`  Valid hex: ${/^[0-9a-fA-F]{32}$/.test(secret)}`);
console.log('');

if (!secret) {
    console.error('ERROR: META_APP_SECRET is empty or not set in .env');
    process.exit(1);
}

// ── Optional: paste a real body + received sig from Railway logs to cross-check ──
const SAMPLE_BODY   = ''; // paste exact JSON body string here
const RECEIVED_SIG  = ''; // paste the sha256=XXXX value from X-Hub-Signature-256 header

if (SAMPLE_BODY && RECEIVED_SIG) {
    const body     = Buffer.from(SAMPLE_BODY, 'utf-8');
    const computed = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    console.log('=== HMAC cross-check ===');
    console.log(`  Received : ${RECEIVED_SIG}`);
    console.log(`  Computed : ${computed}`);
    console.log(`  MATCH    : ${computed === RECEIVED_SIG ? '✅ YES' : '❌ NO'}`);
} else {
    // Self-test: generate a test signature and verify round-trip
    const testBody = Buffer.from('{"object":"whatsapp_business_account","test":true}');
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(testBody).digest('hex');
    console.log('=== Self-test (round-trip) ===');
    console.log(`  Generated sig: ${sig}`);
    const roundTrip = crypto.createHmac('sha256', secret).update(testBody).digest('hex');
    console.log(`  Round-trip  : ${roundTrip === sig.replace('sha256=', '') ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
    console.log('To cross-check against a real webhook, paste the body JSON and received sig into');
    console.log('SAMPLE_BODY and RECEIVED_SIG at the top of this file.');
}
