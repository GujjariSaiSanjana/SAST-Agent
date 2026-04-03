import { AiProvider, AiIssueInput, AiAnalysisResult } from './ai.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { NvidiaProvider } from './nvidia.provider';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const BATCH_SIZE = 5;
const CONCURRENCY = 2;

export class AiService {
    private providers: AiProvider[] = [];

    constructor() {
        if (process.env.GEMINI_API_KEY) {
            this.providers.push(new GeminiProvider());
            logger.info('[AI] Loaded provider: Gemini 1.5 Flash');
        }
        if (process.env.OPENAI_API_KEY) {
            this.providers.push(new OpenAIProvider());
            logger.info('[AI] Loaded provider: OpenAI GPT-4o-mini');
        }
        if (process.env.NVIDIA_API_KEY) {
            this.providers.push(new NvidiaProvider());
            logger.info('[AI] Loaded provider: NVIDIA NIM (Llama-3.1)');
        }

        if (this.providers.length === 0) {
            logger.warn('[AI] No AI providers configured — AI analysis will be skipped');
        }
    }

    async analyzeIssue(issue: AiIssueInput): Promise<AiAnalysisResult | null> {
        if (this.providers.length === 0) return null;

        for (const provider of this.providers) {
            try {
                return await provider.analyze(issue);
            } catch (err: any) {
                logger.warn(`[AI] Provider (${provider.name}) failed for ${issue.id}, trying next...`, err.message);
            }
        }

        logger.error(`[AI] All providers failed for issue ${issue.id}`);
        return null;
    }

    /**
     * Process CRITICAL + HIGH issues for a scan in batches
     */
    async processScanIssues(scanId: string): Promise<void> {
        const issues = await prisma.issue.findMany({
            where: {
                scanId,
                severity: { in: ['CRITICAL', 'HIGH'] },
                aiProcessed: false,
            },
            select: {
                id: true,
                ruleId: true,
                title: true,
                description: true,
                severity: true,
                category: true,
                filePath: true,
                lineStart: true,
                lineEnd: true,
                codeSnippet: true,
                cweId: true,
            },
        });

        if (!issues.length) {
            logger.info(`[AI] No CRITICAL/HIGH issues to process for scan ${scanId}`);
            return;
        }

        logger.info(`[AI] Processing ${issues.length} issues for scan ${scanId}`);

        // Process in batches
        for (let i = 0; i < issues.length; i += BATCH_SIZE) {
            const batch = issues.slice(i, i + BATCH_SIZE);
            await this.processBatch(batch);
        }

        logger.info(`[AI] Completed AI analysis for scan ${scanId}`);
    }

    private async processBatch(issues: AiIssueInput[]): Promise<void> {
        // Process with limited concurrency
        const chunks = [];
        for (let i = 0; i < issues.length; i += CONCURRENCY) {
            chunks.push(issues.slice(i, i + CONCURRENCY));
        }

        for (const chunk of chunks) {
            await Promise.all(
                chunk.map(async (issue) => {
                    try {
                        const result = await this.analyzeIssue(issue);
                        if (result) {
                            await prisma.issue.update({
                                where: { id: issue.id },
                                data: {
                                    aiExplanation: result.explanation,
                                    aiImpact: result.impact,
                                    aiRemediation: result.remediation,
                                    aiFixCode: result.fixCode,
                                    aiProcessed: true,
                                    aiProcessedAt: new Date(),
                                },
                            });
                            logger.debug(`[AI] ✅ Processed issue ${issue.id}`);
                        }
                    } catch (err) {
                        logger.error(`[AI] Failed to process issue ${issue.id}:`, err);
                        // Mark as processed to avoid infinite retries
                        await prisma.issue.update({
                            where: { id: issue.id },
                            data: { aiProcessed: true, aiProcessedAt: new Date() },
                        }).catch(() => { });
                    }
                })
            );
        }
    }
}
