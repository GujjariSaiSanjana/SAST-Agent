import { prisma } from '../../config/database';
import { scanQueue } from '../../queue/scan.queue';
import { logger } from '../../utils/logger';

export class ScanService {
    async list(userId: string, limit = 10, skip = 0) {
        const [scans, total] = await Promise.all([
            prisma.scan.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: { project: { select: { name: true } } },
            }),
            prisma.scan.count({ where: { userId } }),
        ]);

        return { scans, total };
    }

    async getSummary(id: string, userId: string) {
        const scan = await prisma.scan.findFirstOrThrow({
            where: { id, userId },
            include: { project: { select: { name: true } } },
        });

        const severityBreakdown = await prisma.issue.groupBy({
            by: ['severity'],
            where: { scanId: id },
            _count: true,
        });

        return {
            scan,
            severityBreakdown: severityBreakdown.map((s) => ({
                severity: s.severity,
                count: s._count,
            })),
        };
    }

    async getIssues(scanId: string, userId: string, limit = 50, skip = 0) {
        const [issues, total] = await Promise.all([
            prisma.issue.findMany({
                where: { scanId, scan: { userId } },
                take: limit,
                skip,
                orderBy: { severity: 'asc' }, // In enum critical < high < etc
            }),
            prisma.issue.count({ where: { scanId, scan: { userId } } }),
        ]);

        return { issues, total };
    }

    async startScan(userId: string, repoUrl: string, projectId?: string) {
        const scan = await prisma.scan.create({
            data: {
                userId,
                projectId,
                source: 'GITHUB',
                inputRef: repoUrl,
                status: 'PENDING',
            },
        });

        await scanQueue.add({
            scanId: scan.id,
            userId,
            source: 'GITHUB',
            inputRef: repoUrl,
        });

        return scan;
    }

    async startZipScan(userId: string, filePath: string, projectId?: string) {
        const scan = await prisma.scan.create({
            data: {
                userId,
                projectId,
                source: 'ZIP_UPLOAD',
                inputRef: filePath.split('/').pop() || 'upload.zip',
                status: 'PENDING',
            },
        });

        await scanQueue.add({
            scanId: scan.id,
            userId,
            source: 'ZIP_UPLOAD',
            inputRef: filePath,
        });

        return scan;
    }

    async subscribeToScan(scanId: string, userId: string, onProgress: (data: any) => void) {
        // Simple polling for progress for now (or a real pub/sub if needed)
        // In a real app we'd use Redis Pub/Sub, but here we can poll or use an event emitter

        let lastStatus = '';
        const check = async () => {
            try {
                const scan = await prisma.scan.findFirst({
                    where: { id: scanId, userId },
                    select: { status: true, errorMsg: true },
                });
                if (scan && scan.status !== lastStatus) {
                    lastStatus = scan.status;
                    onProgress({
                        status: scan.status,
                        error: scan.errorMsg,
                        done: ['COMPLETED', 'FAILED'].includes(scan.status)
                    });
                }
                return scan?.status;
            } catch (err) {
                logger.error('Error polling scan status:', err);
                return 'FAILED';
            }
        };

        const interval = setInterval(async () => {
            const status = await check();
            if (status && ['COMPLETED', 'FAILED'].includes(status)) {
                clearInterval(interval);
            }
        }, 2000);

        // Initial check
        check();

        return () => clearInterval(interval);
    }
}
