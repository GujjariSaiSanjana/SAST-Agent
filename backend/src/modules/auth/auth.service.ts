import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma } from '../../config/database';

export class AuthService {
    generateToken(user: User): string {
        return jwt.sign(
            {
                sub: user.id,
                username: user.username,
                email: user.email,
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
        );
    }

    async getUserWithStats(userId: string) {
        const [user, projectCount, scanCount] = await Promise.all([
            prisma.user.findUniqueOrThrow({ where: { id: userId } }),
            prisma.project.count({ where: { userId } }),
            prisma.scan.count({ where: { userId } }),
        ]);

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            stats: {
                projectCount,
                scanCount,
            },
        };
    }
}
