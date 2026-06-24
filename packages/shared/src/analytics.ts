const PII_KEY_PATTERN = /bvn|document|id_number|card|account_number|cvv|otp|jwt|token|password|signature|raw_?body|description|comment|message|address|email|phone/i;

export function toDistinctId(safetag: string): string {
    return safetag.trim().toLowerCase().replace(/^@/, '');
}

export function scrubProperties(properties: Record<string, any>): Record<string, any> {
    const scrubbed: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
        if (PII_KEY_PATTERN.test(key)) continue;
        scrubbed[key] = value;
    }
    return scrubbed;
}
