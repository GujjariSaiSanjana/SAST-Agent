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
import { AiScannerService } from '../scanner/ai-scanner.service';
import { parseFindings } from '../scanner/parser';
import { AiService } from '../modules/ai/ai.service';
import { logger } from '../utils/logger';
import { AiScanFinding } from '../modules/ai/ai.interface';

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

        const aiProvider = aiService.getProvider('nvidia');
        if (!aiProvider) {
            throw new Error('No AI provider configured (requires NVIDIA NIM API Key)');
        }

        const aiScanner = new AiScannerService(aiProvider);

        let currentFindingsCount = 0;
        const liveCounts = { critical: 0, high: 0, medium: 0, low: 0, warning: 0, info: 0 };

        const findings = await aiScanner.scan(workDir, scanId, async (batch) => {
            // 1. SAVE TO DB IMMEDIATELY
            await prisma.issue.createMany({
                data: batch.map((f) => ({
                    ruleId: f.ruleId,
                    title: f.title,
                    description: f.description,
                    severity: f.severity as any,
                    category: f.category,
                    filePath: f.filePath || 'unknown',
                    lineStart: f.lineStart,
                    lineEnd: f.lineEnd,
                    codeSnippet: f.codeSnippet,
                    scanId,
                    aiProcessed: true,
                    aiProcessedAt: new Date(),
                })),
                skipDuplicates: true,
            });

            // 2. UPDATE LIVE COUNTS
            batch.forEach(f => {
                const s = f.severity.toLowerCase();
                if (s === 'critical') liveCounts.critical++;
                else if (s === 'high') liveCounts.high++;
                else if (s === 'medium') liveCounts.medium++;
                else if (s === 'low') liveCounts.low++;
                else if (s === 'warning') liveCounts.warning++;
                else if (s === 'info') liveCounts.info++;
            });
            currentFindingsCount += batch.length;

            const riskScore = (liveCounts.critical * 10) + (liveCounts.high * 7) + (liveCounts.medium * 4) + (liveCounts.low * 1);

            // 3. UPDATE SCAN RECORD FOR REAL-TIME UI
            await prisma.scan.update({
                where: { id: scanId },
                data: {
                    totalIssues: currentFindingsCount,
                    riskScore,
                    criticalCount: liveCounts.critical,
                    highCount: liveCounts.high,
                    mediumCount: liveCounts.medium,
                    lowCount: liveCounts.low,
                    warningCount: liveCounts.warning + liveCounts.info,
                }
            });

            logger.info(`[Queue] Scan ${scanId} live update: ${currentFindingsCount} findings found so far...`);
        });

        // ── 4. COMPLETE SCAN RECORD ──────────────────────────────
        const duration = Math.round((Date.now() - startTime) / 1000);
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'COMPLETED',
                duration,
                completedAt: new Date(),
            },
        });

        job.progress(100);
        logger.info(`[Queue] ✅ AI Scan ${scanId} completed in ${duration}s with ${findings.length} findings`);

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
