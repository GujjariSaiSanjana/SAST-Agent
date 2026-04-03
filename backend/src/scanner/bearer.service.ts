import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

export interface BearerScanResult {
    raw: string;
    findings: BearerFinding[];
    success: boolean;
    errorMsg?: string;
}

export interface BearerFinding {
    rule_id: string;
    rule: {
        id: string;
        name: string;
        description: string;
        cwe_ids?: string[];
        remediation_message?: string;
        documentation_url?: string;
    };
    severity: string;
    filename: string;
    line_number: number;
    column_number?: number;
    full_filename: string;
    description: string;
    snippet: string;
    code_extract?: string;
    title?: string;
    category_groups?: string[];
}

export interface BearerJsonOutput {
    findings?: BearerFinding[];
    high?: BearerFinding[];
    critical?: BearerFinding[];
    medium?: BearerFinding[];
    low?: BearerFinding[];
    warnings?: BearerFinding[];
}

export class BearerService {
    private readonly bearerPath: string;

    constructor() {
        this.bearerPath = process.env.BEARER_CLI_PATH || 'bearer';
    }

    async scan(targetDir: string, scanId: string): Promise<BearerScanResult> {
        const outputFile = path.join(
            process.env.TEMP_DIR || '/tmp/sast-agent',
            `scan-${scanId}.json`
        );

        try {
            // Ensure output dir exists
            await fs.mkdir(path.dirname(outputFile), { recursive: true });

            logger.info(`[Bearer] Starting scan for scanId=${scanId}, target=${targetDir}`);

            const args = [
                'scan',
                '--format', 'json',
                '--output', outputFile,
                '--quiet',
                '--no-banner',
                '--exit-code', '0', // don't fail on findings
                targetDir,
            ];

            const { stdout, stderr } = await execFileAsync(this.bearerPath, args, {
                timeout: 5 * 60 * 1000, // 5 min
                maxBuffer: 50 * 1024 * 1024, // 50MB
                env: {
                    ...process.env,
                    HOME: process.env.HOME || '/tmp',
                },
            });

            if (stderr && !stderr.includes('Completed successfully')) {
                logger.warn(`[Bearer] stderr: ${stderr.slice(0, 500)}`);
            }
            if (stdout) {
                logger.debug(`[Bearer] stdout: ${stdout.slice(0, 500)}`);
            }

            // Read the JSON output file
            const rawJson = await fs.readFile(outputFile, 'utf-8').catch(() => '{}');
            const parsed: BearerJsonOutput = JSON.parse(rawJson);

            const findings = this.flattenFindings(parsed);

            logger.info(`[Bearer] Scan complete: ${findings.length} findings for scanId=${scanId}`);

            return {
                raw: rawJson,
                findings,
                success: true,
            };
        } catch (err) {
            const error = err as NodeJS.ErrnoException & { code?: string; killed?: boolean };
            logger.error(`[Bearer] Scan failed for scanId=${scanId}:`, error.message);

            // Try to read output anyway (partial results)
            let partial: BearerFinding[] = [];
            try {
                const rawJson = await fs.readFile(outputFile, 'utf-8');
                const parsed: BearerJsonOutput = JSON.parse(rawJson);
                partial = this.flattenFindings(parsed);
            } catch {
                // no partial results
            }

            return {
                raw: '',
                findings: partial,
                success: false,
                errorMsg: error.killed
                    ? 'Scan timed out after 5 minutes'
                    : error.message,
            };
        } finally {
            // Clean up output file
            await fs.unlink(outputFile).catch(() => { });
        }
    }

    private flattenFindings(output: BearerJsonOutput): BearerFinding[] {
        const findings: BearerFinding[] = [];

        if (Array.isArray(output.findings)) {
            findings.push(...output.findings);
        }

        // Bearer may output severity-keyed arrays
        const severities = ['critical', 'high', 'medium', 'low', 'warnings'] as const;
        for (const sev of severities) {
            if (Array.isArray(output[sev])) {
                const items = output[sev] as BearerFinding[];
                for (const item of items) {
                    // Tag severity if not present
                    if (!item.severity) {
                        item.severity = sev === 'warnings' ? 'warning' : sev;
                    }
                    findings.push(item);
                }
            }
        }

        return findings;
    }

    async checkInstallation(): Promise<{ installed: boolean; version?: string }> {
        try {
            const { stdout } = await execFileAsync(this.bearerPath, ['version'], { timeout: 5000 });
            const version = stdout.trim().split('\n')[0];
            logger.info(`[Bearer] Found: ${version}`);
            return { installed: true, version };
        } catch {
            logger.warn('[Bearer] CLI not found or not executable');
            return { installed: false };
        }
    }
}
