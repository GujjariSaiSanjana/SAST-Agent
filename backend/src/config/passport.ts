import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { prisma } from './database';
import { logger } from '../utils/logger';

// ── JWT from cookie ───────────────────────────────────────────
const cookieExtractor = (req: Request): string | null => {
    let token: string | null = null;
    if (req && req.cookies) {
        token = req.cookies['access_token'] || null;
    }
    return token;
};

const jwtOptions: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
    ]),
    secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
};

passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user) return done(null, false);
            return done(null, user);
        } catch (err) {
            logger.error('JWT Strategy error:', err);
            return done(err, false);
        }
    })
);

// ── GitHub OAuth ──────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/auth/github/callback',
                scope: ['user:email'],
            },
            async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
                try {
                    const email = profile.emails?.[0]?.value || null;
                    const user = await prisma.user.upsert({
                        where: { githubId: profile.id },
                        update: {
                            username: profile.username || profile.displayName || `user_${profile.id}`,
                            email,
                            avatarUrl: profile.photos?.[0]?.value || null,
                        },
                        create: {
                            githubId: profile.id,
                            username: profile.username || profile.displayName || `user_${profile.id}`,
                            email,
                            avatarUrl: profile.photos?.[0]?.value || null,
                        },
                    });
                    return done(null, user);
                } catch (err) {
                    logger.error('GitHub OAuth error:', err);
                    return done(err as Error, undefined);
                }
            }
        )
    );
} else {
    logger.warn('⚠️  GitHub OAuth credentials not configured');
}

export default passport;
