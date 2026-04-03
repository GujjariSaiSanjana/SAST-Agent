import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { User } from '@prisma/client';

const authService = new AuthService();

export class AuthController {
    githubCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const token = authService.generateToken(user);

            res.cookie('access_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.redirect(`${process.env.CLIENT_URL}/dashboard`);
        } catch (err) {
            next(err);
        }
    };

    me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const userWithStats = await authService.getUserWithStats(user.id);
            sendSuccess(res, userWithStats);
        } catch (err) {
            next(err);
        }
    };

    logout = (_req: Request, res: Response): void => {
        res.clearCookie('access_token');
        sendSuccess(res, { message: 'Logged out successfully' });
    };
}
