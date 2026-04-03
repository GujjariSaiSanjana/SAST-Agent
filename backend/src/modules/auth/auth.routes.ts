import { Router } from 'express';
import passport from 'passport';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const ctrl = new AuthController();

// GitHub OAuth
router.get('/github', passport.authenticate('github', { session: false, scope: ['user:email'] }));

router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed` }),
    ctrl.githubCallback
);

// Current user
router.get('/me', authenticate, ctrl.me);

// Logout
router.post('/logout', authenticate, ctrl.logout);

export default router;
