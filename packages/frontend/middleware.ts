import { NextResponse, NextRequest } from 'next/server';

// Routes that require a valid session to load at all
const PROTECTED_ROUTES = [
    /^\/withdraw\/.+/,
    /^\/dashboard\/.*/,
];

// Routes that are always public — never redirect to login
const PUBLIC_ROUTES = [
    /^\/$/, /^\/login/, /^\/register/,
    /^\/pay\/.+/, /^\/delivery\/.+/, /^\/upload\/.+/,
    /^\/receipt\/.+/, /^\/reviews\/.*/, /^\/marketplace.*/,
    /^\/privacy/, /^\/terms/, /^\/waitlist.*/,
    /^\/_next\/.*/, /^\/api\/.*/, /^\/favicon\.ico/,
    /^\/[^/]+$/, // top-level /@safetag referral pages
];

export async function middleware(req: NextRequest) {
    const { pathname, searchParams } = req.nextUrl;

    // Never touch static/public routes
    if (PUBLIC_ROUTES.some(r => r.test(pathname))) {
        // Still exchange a magic link token if present, even on public pages
        const t = searchParams.get('t');
        if (t && t.startsWith('mlt_')) {
            return await exchangeMagicToken(t, req);
        }
        return NextResponse.next();
    }

    // Exchange magic link token if present (highest priority — creates session)
    const t = searchParams.get('t');
    if (t && t.startsWith('mlt_')) {
        return await exchangeMagicToken(t, req);
    }

    // Check for existing session cookie
    const session = req.cookies.get('sf_session')?.value;

    // KYC page requires session — redirect to login if none
    if (pathname === '/kyc' || pathname.startsWith('/kyc')) {
        if (!session) {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('next', pathname + req.nextUrl.search);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // Protected route check
    if (PROTECTED_ROUTES.some(r => r.test(pathname))) {
        if (!session) {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

async function exchangeMagicToken(t: string, req: NextRequest): Promise<NextResponse> {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

    try {
        const exchangeRes = await fetch(`${apiUrl}/auth/magic-link/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ t }),
        });

        if (!exchangeRes.ok) {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('reason', 'link_expired');
            return NextResponse.redirect(loginUrl);
        }

        const { session_token } = await exchangeRes.json();

        // Redirect to clean URL (strip ?t=)
        const cleanUrl = new URL(req.url);
        cleanUrl.searchParams.delete('t');
        const response = NextResponse.redirect(cleanUrl);

        response.cookies.set('sf_session', session_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 60,
        });

        return response;
    } catch {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('reason', 'link_error');
        return NextResponse.redirect(loginUrl);
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
