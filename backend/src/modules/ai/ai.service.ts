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
        if (process.env.NVIDIA_API_KEY) {
            this.providers.push(new NvidiaProvider());
            logger.info('[AI] Loaded provider: NVIDIA NIM (Llama-3.1)');
        }
        if (process.env.GEMINI_API_KEY) {
            this.providers.push(new GeminiProvider());
            logger.info('[AI] Loaded provider: Gemini 1.5 Flash');
        }
        if (process.env.OPENAI_API_KEY) {
            this.providers.push(new OpenAIProvider());
            logger.info('[AI] Loaded provider: OpenAI GPT-4o-mini');
        }

        if (this.providers.length === 0) {
            logger.warn('[AI] No AI providers configured');
        }
    }

    /** Returns all providers in priority order for fallback chains */
    getProviders(): AiProvider[] {
        return this.providers;
    }

    getProvider(name?: string): AiProvider | null {
        if (this.providers.length === 0) return null;
        if (name) return this.providers.find(p => p.name === name) || this.providers[0];
        return this.providers[0];
    }

    async analyzeIssue(issue: AiIssueInput): Promise<AiAnalysisResult | null> {
        if (this.providers.length === 0) return null;

        for (const provider of this.providers) {
            try {
                return await provider.analyze(issue);
            } catch (err: any) {
                logger.warn(`[AI] Provider ${provider.name} failed for issue ${issue.id}: ${err.message}`);
            }
        }

        logger.error(`[AI] All providers failed for issue ${issue.id}`);
        return null;
    }

    async processScanIssues(scanId: string): Promise<void> {
        const issues = await prisma.issue.findMany({
            where: { scanId, severity: { in: ['CRITICAL', 'HIGH'] }, aiProcessed: false },
            select: {
                id: true, ruleId: true, title: true, description: true,
                severity: true, category: true, filePath: true,
                lineStart: true, lineEnd: true, codeSnippet: true, cweId: true,
            },
        });

        if (!issues.length) {
            logger.info(`[AI] No unprocessed CRITICAL/HIGH issues for scan ${scanId}`);
            return;
        }

        logger.info(`[AI] Enriching ${issues.length} issues for scan ${scanId}`);

        for (let i = 0; i < issues.length; i += BATCH_SIZE) {
            await this.processBatch(issues.slice(i, i + BATCH_SIZE));
        }

        logger.info(`[AI] Enrichment complete for scan ${scanId}`);
    }

    private async processBatch(issues: AiIssueInput[]): Promise<void> {
        for (let i = 0; i < issues.length; i += CONCURRENCY) {
            await Promise.all(
                issues.slice(i, i + CONCURRENCY).map(async (issue) => {
                    try {
                        const result = await this.analyzeIssue(issue);
                        if (result) {
                            await prisma.issue.update({
                                where: { id: issue.id },
                                data: {
                                    aiExplanation: result.explanation,
                                    aiImpact: result.impact,
                                    aiProofOfConcept: result.proofOfConcept,
                                    aiRemediation: result.remediation,
                                    aiFixCode: result.fixCode,
                                    aiProcessed: true,
                                    aiProcessedAt: new Date(),
                                },
                            });
                            logger.debug(`[AI] Enriched issue ${issue.id}`);
                        }
                    } catch (err) {
                        logger.error(`[AI] Failed to enrich issue ${issue.id}:`, err);
                        await prisma.issue.update({
                            where: { id: issue.id },
                            data: { aiProcessed: true, aiProcessedAt: new Date() },
                        }).catch(() => {});
                    }
                })
            );
        }
    }
}
