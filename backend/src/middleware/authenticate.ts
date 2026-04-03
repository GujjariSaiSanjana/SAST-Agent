import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User } from '@prisma/client';
import { AppError } from '../utils/AppError';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
        'jwt',
        { session: false },
        (err: Error | null, user: User | false) => {
            if (err) return next(err);
            if (!user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
            req.user = user;
            next();
        }
    )(req, res, next);
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
        'jwt',
        { session: false },
        (_err: Error | null, user: User | false) => {
            if (user) req.user = user;
            next();
        }
    )(req, res, next);
}
