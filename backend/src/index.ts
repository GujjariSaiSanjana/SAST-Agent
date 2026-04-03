import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import passport from 'passport';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { prisma } from './config/database';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import scanRoutes from './modules/scans/scan.routes';
import issueRoutes from './modules/issues/issue.routes';

// Passport config
import './config/passport';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Basic middleware ─────────────────────────────────────────
app.use(compression() as express.RequestHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// ── Logging & Rate limiting ──────────────────────────────────
app.use(requestLogger);
app.use(globalRateLimiter);

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: 'error', message: 'Database unavailable' });
    }
});

// ── API Routes ───────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/issues', issueRoutes);

// ── Error handling ───────────────────────────────────────────
app.use(errorHandler);

// ── Graceful shutdown ────────────────────────────────────────
const server = app.listen(PORT, () => {
    logger.info(`🚀 SAST Agent API running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
});

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
