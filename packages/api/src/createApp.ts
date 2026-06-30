import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import profileRoutes from './routes/profiles';
import transactionRoutes from './routes/transactions';
import reviewRoutes from './routes/reviews';
import paymentRoutes from './routes/payments';
import withdrawalRoutes from './routes/withdrawals';
import referralRoutes from './routes/referrals';
import disputeRoutes from './routes/disputes';
import waitlistRoutes from './routes/waitlist';
import receiptRoutes from './routes/receipts';
import adminRoutes from './routes/admin';
import adminAnalyticsRoutes from './routes/adminAnalytics';
import authRoutes from './routes/auth';
import magicLinkRoutes from './routes/magicLink';
import marketplaceRoutes from './routes/marketplace';
import notificationRoutes from './routes/notifications';
import communityRoutes from './routes/communities';
import feedbackRoutes from './routes/feedback';
import reportRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';

export function createApp() {
    const app = express();

    const corsBase = process.env.CORS_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001';
    const extraOrigins: string[] = [];
    if (process.env.REVIEWS_URL) extraOrigins.push(process.env.REVIEWS_URL.replace(/\/$/, ''));
    const CORS_ORIGINS = [...new Set([
        ...corsBase.split(',').map(o => o.trim()).filter(Boolean),
        ...extraOrigins,
    ])];

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || CORS_ORIGINS.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'X-Requested-With'],
        credentials: true
    }));
    app.use(cookieParser());
    app.use(bodyParser.json({
        verify: (req: any, _res, buf) => {
            req.rawBody = buf.toString();
        }
    }));

    app.use((req, res, next) => {
        console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });

    app.get('/', (req, res) => {
        res.send('Safeeely API is live. Check /health for status.');
    });

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', time: new Date().toISOString() });
    });

    app.get('/api/debug-version', (req, res) => {
        res.json({ version: '1.0.2-admin-ready', timestamp: new Date().toISOString() });
    });

    const FRONTEND_ROUTES = ['/kyc', '/pay', '/payout', '/reviews', '/admin'];
    FRONTEND_ROUTES.forEach(route => {
        app.get(route, (req, res) => {
            const frontendUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
            const qs = new URLSearchParams(req.query as any).toString();
            res.redirect(`${frontendUrl}${route}${qs ? '?' + qs : ''}`);
        });
    });

    app.use('/api/profiles', profileRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/withdrawals', withdrawalRoutes);
    app.use('/api/referrals', referralRoutes);
    app.use('/api/disputes', disputeRoutes);
    app.use('/api/waitlist', waitlistRoutes);
    app.use('/api/receipts', receiptRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/admin/analytics', adminAnalyticsRoutes);
    app.use('/api/marketplace', marketplaceRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/communities', communityRoutes);
    app.use('/api/feedback', feedbackRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/analytics', analyticsRoutes);

    app.get('/api/ping', (req, res) => {
        res.json({ status: 'ok', time: new Date().toISOString() });
    });
    app.use('/api/auth', authRoutes);
    app.use('/api/auth/magic-link', magicLinkRoutes);

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('🔥 [Critical Server Error]:', err);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                message: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        }
    });

    return app;
}
