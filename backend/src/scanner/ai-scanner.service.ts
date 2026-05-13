import fs from 'fs/promises';
import path from 'path';
import { AiProvider, AiScanFinding } from '../modules/ai/ai.interface';
import { logger } from '../utils/logger';

const RELEVANT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java', '.php', '.rb', '.c', '.cpp', '.h'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'vendor', 'tests', 'test', 'coverage', '__pycache__', '.next', '.nuxt'];
const MAX_FILE_BYTES = 60_000;
const INTER_FILE_DELAY_MS = 1_500;

export class AiScannerService {
    constructor(private providers: AiProvider[]) {
        if (providers.length === 0) throw new Error('AiScannerService requires at least one provider');
    }

    async scan(
        targetDir: string,
        scanId: string,
        onFindings?: (findings: AiScanFinding[]) => Promise<void>
    ): Promise<AiScanFinding[]> {
        logger.info(`[AI-Scanner] Starting scan scanId=${scanId} providers=[${this.providers.map(p => p.name).join(',')}]`);

        const allFindings: AiScanFinding[] = [];
        const files = await this.getRelevantFiles(targetDir);
        logger.info(`[AI-Scanner] ${files.length} files to scan`);

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                if (content.length < 10 || content.length > MAX_FILE_BYTES) continue;

                const relativePath = path.relative(targetDir, file);
                logger.debug(`[AI-Scanner] Scanning ${relativePath}`);

                const findings = await this.scanFileWithFallback(relativePath, content);

                if (findings.length > 0) {
                    const tagged = findings.map(f => ({ ...f, filePath: relativePath }));
                    allFindings.push(...tagged);
                    if (onFindings) await onFindings(tagged);
                }
            } catch (err: any) {
                logger.error(`[AI-Scanner] Failed ${file}: ${err.message}`);
            }

            await new Promise(r => setTimeout(r, INTER_FILE_DELAY_MS));
        }

        logger.info(`[AI-Scanner] Done: ${allFindings.length} findings for scanId=${scanId}`);
        return allFindings;
    }

    private async scanFileWithFallback(filePath: string, content: string): Promise<AiScanFinding[]> {
        for (const provider of this.providers) {
            try {
                return await provider.scan(filePath, content);
            } catch (err: any) {
                logger.warn(`[AI-Scanner] Provider ${provider.name} failed for ${filePath}: ${err.message} — trying next`);
            }
        }
        logger.error(`[AI-Scanner] All providers failed for ${filePath}`);
        return [];
    }

    private async getRelevantFiles(dir: string): Promise<string[]> {
        const results: string[] = [];

        async function walk(currentDir: string) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (!IGNORE_DIRS.includes(entry.name)) await walk(fullPath);
                } else if (entry.isFile()) {
                    if (RELEVANT_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
                        results.push(fullPath);
                    }
                }
            }
        }

        await walk(dir);
        return results;
    }
}
