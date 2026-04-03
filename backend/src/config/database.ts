import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
    global.__prisma ||
    new PrismaClient({
        log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
        ],
    });

if (process.env.NODE_ENV === 'development') {
    global.__prisma = prisma;

    (prisma as any).$on('query', (e: any) => {
        logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
    });
}

// Test connection on startup
prisma.$connect()
    .then(() => logger.info('✅ Database connected'))
    .catch((err: Error) => {
        logger.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });
