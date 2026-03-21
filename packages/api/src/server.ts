import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
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
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*']
}));
app.use(bodyParser.json());

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/debug-version', (req, res) => {
    res.json({ version: '1.0.2-admin-ready', timestamp: new Date().toISOString() });
});

// Redirect frontend pages landing on the API server
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
app.use('/api/auth', authRoutes);

// Global error handler
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

app.listen(PORT, () => {
    console.log(`Safeeely API is running on port ${PORT}`);
});
