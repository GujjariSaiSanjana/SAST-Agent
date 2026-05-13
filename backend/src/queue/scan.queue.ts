import Bull from 'bull';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import simpleGit from 'simple-git';
import unzipper from 'unzipper';
import { createReadStream } from 'fs';
import { ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AiScannerService } from '../scanner/ai-scanner.service';
import { AiService } from '../modules/ai/ai.service';
import { logger } from '../utils/logger';
import { AiScanFinding } from '../modules/ai/ai.interface';

export interface ScanJobData {
    scanId: string;
    userId: string;
    source: 'GITHUB' | 'ZIP_UPLOAD';
    inputRef: string;
    projectId?: string;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const scanQueue = new Bull<ScanJobData>('scan-queue', REDIS_URL, {
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
        timeout: 15 * 60 * 1000, // 15 min (scan + enrichment)
    },
});

const aiService = new AiService();

// ── Worker ────────────────────────────────────────────────────
scanQueue.process(2, async (job) => {
    const { scanId, source, inputRef } = job.data;
    const startTime = Date.now();
    let workDir: string | null = null;

    try {
        // ── 1. CLONE / EXTRACT ───────────────────────────────────
        await updateStatus(scanId, 'CLONING');
        job.progress(5);

        workDir = await fs.mkdtemp(path.join(os.tmpdir(), `sast-${scanId}-`));

        if (source === 'GITHUB') {
            await cloneRepo(inputRef, workDir);
        } else {
            await extractZip(inputRef, workDir);
        }

        // ── 2. AI SCAN ───────────────────────────────────────────
        await updateStatus(scanId, 'SCANNING');
        job.progress(15);

        const providers = aiService.getProviders();
        if (providers.length === 0) {
            throw new Error('No AI providers configured. Set NVIDIA_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.');
        }

        const aiScanner = new AiScannerService(providers);

        let currentFindingsCount = 0;
        const liveCounts = { critical: 0, high: 0, medium: 0, low: 0, warning: 0, info: 0 };

        const findings = await aiScanner.scan(workDir, scanId, async (batch: AiScanFinding[]) => {
            // Persist findings immediately for live UI updates
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
                    cweId: f.cweId || null,
                    owaspId: f.owaspId || null,
                    scanId,
                    // aiProcessed stays false — enrichment runs after scan
                })),
                skipDuplicates: true,
            });

            // Update live severity counts
            batch.forEach(f => {
                const s = f.severity.toLowerCase();
                if (s in liveCounts) (liveCounts as any)[s]++;
            });
            currentFindingsCount += batch.length;

            // Risk formula: Critical×10 + High×5 + Medium×2 + Low×1
            const riskScore =
                liveCounts.critical * 10 +
                liveCounts.high * 5 +
                liveCounts.medium * 2 +
                liveCounts.low * 1;

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
                },
            });

            logger.info(`[Queue] Scan ${scanId} live: ${currentFindingsCount} findings`);
        });

        // ── 3. AI ENRICHMENT ─────────────────────────────────────
        await updateStatus(scanId, 'AI_ANALYSIS');
        job.progress(75);

        logger.info(`[Queue] Starting AI enrichment for ${scanId}`);
        await aiService.processScanIssues(scanId);

        // ── 4. COMPLETE ──────────────────────────────────────────
        const duration = Math.round((Date.now() - startTime) / 1000);
        await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'COMPLETED', duration, completedAt: new Date() },
        });

        job.progress(100);
        logger.info(`[Queue] Scan ${scanId} completed in ${duration}s with ${findings.length} findings`);

    } catch (err) {
        const error = err as Error;
        logger.error(`[Queue] Scan ${scanId} failed: ${error.message}`);
        await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'FAILED', errorMsg: error.message, completedAt: new Date() },
        }).catch(() => {});
        throw err;

    } finally {
        if (workDir) await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
        if (job.data.source === 'ZIP_UPLOAD') await fs.unlink(job.data.inputRef).catch(() => {});
    }
});

// ── Helpers ───────────────────────────────────────────────────
async function updateStatus(scanId: string, status: ScanStatus): Promise<void> {
    await prisma.scan.update({ where: { id: scanId }, data: { status } });
    logger.info(`[Queue] Scan ${scanId} → ${status}`);
}

async function cloneRepo(url: string, targetDir: string): Promise<void> {
    logger.info(`[Queue] Cloning ${url}`);
    const git = simpleGit();
    await git.clone(url, targetDir, ['--depth', '1', '--single-branch']);
}

async function extractZip(zipPath: string, targetDir: string): Promise<void> {
    logger.info(`[Queue] Extracting ${zipPath}`);
    await new Promise<void>((resolve, reject) => {
        createReadStream(zipPath)
            .pipe(unzipper.Parse({ forceStream: true }))
            .on('entry', async (entry) => {
                const fileName = entry.path;
                const destPath = path.resolve(targetDir, fileName);

                // ZIP path traversal prevention
                if (!destPath.startsWith(path.resolve(targetDir))) {
                    logger.warn(`[Queue] Blocked ZIP path traversal: ${fileName}`);
                    entry.autodrain();
                    return;
                }

                if (entry.type === 'Directory') {
                    await fs.mkdir(destPath, { recursive: true });
                    entry.autodrain();
                } else {
                    await fs.mkdir(path.dirname(destPath), { recursive: true });
                    entry.pipe(require('fs').createWriteStream(destPath));
                }
            })
            .on('finish', resolve)
            .on('error', reject);
    });
}

// ── Event listeners ───────────────────────────────────────────
scanQueue.on('failed', (job, err) => logger.error(`[Queue] Job ${job.id} failed: ${err.message}`));
scanQueue.on('completed', (job) => logger.info(`[Queue] Job ${job.id} completed`));

export async function addScanJob(data: ScanJobData): Promise<Bull.Job<ScanJobData>> {
    return scanQueue.add(data, { jobId: data.scanId });
}
