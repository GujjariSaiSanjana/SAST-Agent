import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Custom application errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
        });
        return;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
        return;
    }

    // Multer errors
    if (err.name === 'MulterError') {
        res.status(400).json({
            success: false,
            error: `File upload error: ${err.message}`,
        });
        return;
    }

    // Prisma errors
    if (err.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err as unknown as { code: string; meta?: { target?: string[] } };
        if (prismaErr.code === 'P2002') {
            res.status(409).json({
                success: false,
                error: 'Resource already exists',
                field: prismaErr.meta?.target?.[0],
            });
            return;
        }
        if (prismaErr.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: 'Resource not found',
            });
            return;
        }
    }

    // Unknown errors
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}
