import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min (shorter window for dev)
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
    skip: (req) => req.path === '/health',
});

export const scanRateLimiter = rateLimit({
    windowMs: parseInt(process.env.SCAN_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour
    max: parseInt(process.env.SCAN_RATE_LIMIT_MAX || '5', 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const user = req.user as { id: string } | undefined;
        return user?.id || req.ip || 'unknown';
    },
    message: {
        success: false,
        error: 'Scan limit reached. Maximum 5 scans per hour.',
    },
});
