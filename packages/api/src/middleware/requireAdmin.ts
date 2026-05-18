import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.sf_admin;
        if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
        if ((decoded as any).typ !== 'admin') throw new Error('Invalid token type');
        (req as any).admin = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}
