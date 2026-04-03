import Bull from 'bull';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import simpleGit from 'simple-git';
import unzipper from 'unzipper';
import { createReadStream } from 'fs';
import { ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { BearerService } from '../scanner/bearer.service';
import { parseFindings } from '../scanner/parser';
import { AiService } from '../modules/ai/ai.service';
import { logger } from '../utils/logger';

export interface ScanJobData {
    scanId: string;
    userId: string;
    source: 'GITHUB' | 'ZIP_UPLOAD';
    inputRef: string;        // URL or temp file path
    projectId?: string;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const scanQueue = new Bull<ScanJobData>('scan-queue', REDIS_URL, {
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
        timeout: 10 * 60 * 1000, // 10 min
    },
});

const bearerService = new BearerService();
const aiService = new AiService();

// ── Worker ────────────────────────────────────────────────────
scanQueue.process(2, async (job) => {
    const { scanId, source, inputRef } = job.data;
    const startTime = Date.now();
    let workDir: string | null = null;

    try {
        // ── 1. CLONING / EXTRACTING ──────────────────────────────
        await updateStatus(scanId, 'CLONING');
        job.progress(10);

        workDir = await fs.mkdtemp(path.join(os.tmpdir(), `sast-${scanId}-`));

        if (source === 'GITHUB') {
            await cloneRepo(inputRef, workDir);
        } else {
            await extractZip(inputRef, workDir);
        }

        // ── 2. SCANNING ──────────────────────────────────────────
        await updateStatus(scanId, 'SCANNING');
        job.progress(30);

        const scanResult = await bearerService.scan(workDir, scanId);

        // ── 3. PARSING ───────────────────────────────────────────
        await updateStatus(scanId, 'PROCESSING');
        job.progress(60);

        const parsed = parseFindings(scanResult.findings);

        // ── 4. STORE ISSUES ─────────────────────────────────────
        if (parsed.issues.length > 0) {
            await prisma.issue.createMany({
                data: parsed.issues.map((issue) => ({
                    ...issue,
                    scanId,
                })),
                skipDuplicates: true,
            });
        }

        // ── 5. UPDATE SCAN RECORD ────────────────────────────────
        const duration = Math.round((Date.now() - startTime) / 1000);
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'AI_ANALYSIS',
                riskScore: parsed.riskScore,
                totalIssues: parsed.issues.length,
                criticalCount: parsed.counts.critical,
                highCount: parsed.counts.high,
                mediumCount: parsed.counts.medium,
                lowCount: parsed.counts.low,
                warningCount: parsed.counts.warning,
                duration,
                bearerOutput: scanResult.raw ? JSON.parse(scanResult.raw) : undefined,
                errorMsg: scanResult.success ? null : scanResult.errorMsg,
            },
        });

        job.progress(70);

        // ── 6. AI ANALYSIS ───────────────────────────────────────
        await aiService.processScanIssues(scanId);
        job.progress(95);

        // ── 7. COMPLETE ──────────────────────────────────────────
        const finalDuration = Math.round((Date.now() - startTime) / 1000);
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                duration: finalDuration,
            },
        });

        job.progress(100);
        logger.info(`[Queue] ✅ Scan ${scanId} completed in ${finalDuration}s`);

    } catch (err) {
        const error = err as Error;
        logger.error(`[Queue] ❌ Scan ${scanId} failed:`, error.message);

        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'FAILED',
                errorMsg: error.message,
                completedAt: new Date(),
            },
        }).catch(() => { });

        throw err;
    } finally {
        // Cleanup temp work directory
        if (workDir) {
            await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
        }
        // Cleanup uploaded ZIP if applicable
        if (job.data.source === 'ZIP_UPLOAD') {
            await fs.unlink(job.data.inputRef).catch(() => { });
        }
    }
});

// ── Helpers ───────────────────────────────────────────────────
async function updateStatus(scanId: string, status: ScanStatus): Promise<void> {
    await prisma.scan.update({
        where: { id: scanId },
        data: { status },
    });
    logger.info(`[Queue] Scan ${scanId} → ${status}`);
}

async function cloneRepo(url: string, targetDir: string): Promise<void> {
    logger.info(`[Queue] Cloning ${url} → ${targetDir}`);
    const git = simpleGit();
    await git.clone(url, targetDir, ['--depth', '1', '--single-branch']);
}

async function extractZip(zipPath: string, targetDir: string): Promise<void> {
    logger.info(`[Queue] Extracting ${zipPath} → ${targetDir}`);

    await new Promise<void>((resolve, reject) => {
        createReadStream(zipPath)
            .pipe(
                unzipper.Parse({
                    forceStream: true,
                })
            )
            .on('entry', async (entry) => {
                const fileName = entry.path;
                const type = entry.type;

                // ⚠️ ZIP path traversal prevention
                const destPath = path.resolve(targetDir, fileName);
                if (!destPath.startsWith(path.resolve(targetDir))) {
                    logger.warn(`[Queue] ZIP path traversal attempt blocked: ${fileName}`);
                    entry.autodrain();
                    return;
                }

                if (type === 'Directory') {
                    await fs.mkdir(destPath, { recursive: true });
                    entry.autodrain();
                } else {
                    await fs.mkdir(path.dirname(destPath), { recursive: true });
                    entry.pipe(
                        require('fs').createWriteStream(destPath)
                    );
                }
            })
            .on('finish', resolve)
            .on('error', reject);
    });
}

// ── Event listeners ───────────────────────────────────────────
scanQueue.on('failed', (job, err) => {
    logger.error(`[Queue] Job ${job.id} failed: ${err.message}`);
});

scanQueue.on('completed', (job) => {
    logger.info(`[Queue] Job ${job.id} completed`);
});

export async function addScanJob(data: ScanJobData): Promise<Bull.Job<ScanJobData>> {
    return scanQueue.add(data, {
        jobId: data.scanId, // idempotent
    });
}
