export function extractJSON<T>(raw: string, label: string): T {
    let text = raw.trim();

    // Strip markdown code fences
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Try direct parse first
    try {
        return JSON.parse(text) as T;
    } catch { /* fall through to bracket search */ }

    // Find first { or [
    const objStart = text.indexOf('{');
    const arrStart = text.indexOf('[');
    let start = -1;
    if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) start = objStart;
    else if (arrStart !== -1) start = arrStart;

    if (start === -1) {
        throw new Error(`${label}: no JSON found in response`);
    }

    const openChar = text[start];
    const closeChar = openChar === '{' ? '}' : ']';
    let depth = 0;
    let end = -1;

    for (let i = start; i < text.length; i++) {
        if (text[i] === openChar) depth++;
        else if (text[i] === closeChar) {
            depth--;
            if (depth === 0) { end = i; break; }
        }
    }

    if (end === -1) throw new Error(`${label}: unmatched brackets`);

    try {
        return JSON.parse(text.slice(start, end + 1)) as T;
    } catch (e) {
        throw new Error(`${label}: JSON parse failed — ${(e as Error).message}`);
    }
}

export function safeParseJSON<T>(raw: string, fallback: T, label = 'JSON'): T {
    try {
        return extractJSON<T>(raw, label);
    } catch (err) {
        console.warn(`⚠️ ${label} parse failed, using fallback:`, (err as Error).message);
        return fallback;
    }
}
