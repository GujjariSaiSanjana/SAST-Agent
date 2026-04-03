import fs from 'fs/promises';
import path from 'path';
import { AiProvider, AiScanFinding } from '../modules/ai/ai.interface';
import { logger } from '../utils/logger';

export class AiScannerService {
    constructor(private provider: AiProvider) { }

    async scan(targetDir: string, scanId: string, onFindings?: (findings: AiScanFinding[]) => Promise<void>): Promise<AiScanFinding[]> {
        logger.info(`[AI-Scanner] Starting AI scan for scanId=${scanId}, target=${targetDir} using ${this.provider.name}`);

        const allFindings: AiScanFinding[] = [];
        const files = await this.getRelevantFiles(targetDir);

        logger.info(`[AI-Scanner] Found ${files.length} relevant files for scanning`);

        // Process files sequentially with backoff to respect tight API rate limits
        const BATCH_SIZE = 1;
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const file = files[i];
            let retries = 0;
            const MAX_RETRIES = 2;

            while (retries <= MAX_RETRIES) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const relativePath = path.relative(targetDir, file);

                    if (content.length < 10 || content.length > 60000) break;

                    logger.debug(`[AI-Scanner] Sequential analysis: ${relativePath} (Retry: ${retries})...`);
                    const findings = await this.provider.scan(relativePath, content);

                    if (findings.length > 0) {
                        const batchFindings = findings.map(f => ({ ...f, filePath: relativePath }));
                        allFindings.push(...batchFindings);
                        if (onFindings) {
                            await onFindings(batchFindings);
                        }
                    }

                    // Successful call, exit retry loop
                    break;

                } catch (err: any) {
                    if (err.status === 429 && retries < MAX_RETRIES) {
                        logger.warn(`[AI-Scanner] Rate limit hit for ${file}. Retrying in 5s...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        retries++;
                    } else {
                        logger.error(`[AI-Scanner] Failed to analyze file ${file} after ${retries} retries:`, err.message);
                        break; // Move to next file
                    }
                }
            }

            // Respectful breather between files
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        logger.info(`[AI-Scanner] AI Scan complete: ${allFindings.length} findings for scanId=${scanId}`);
        return allFindings;
    }

    private async getRelevantFiles(dir: string): Promise<string[]> {
        const relevantExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java', '.php', '.rb', '.c', '.cpp', '.h'];
        const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'vendor', 'tests', 'test', 'coverage'];

        const results: string[] = [];

        async function walk(currentDir: string) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    if (ignoreDirs.includes(entry.name)) continue;
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (relevantExtensions.includes(ext)) {
                        results.push(fullPath);
                    }
                }
            }
        }

        await walk(dir);
        return results;
    }
}
