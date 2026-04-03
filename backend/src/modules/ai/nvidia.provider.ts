import OpenAI from 'openai';
import {
    AiProvider,
    AiIssueInput,
    AiAnalysisResult,
    AiScanFinding,
    buildScanPrompt,
    parseScanResponse,
    buildAnalysisPrompt,
    parseAiResponse
} from './ai.interface';
import { logger } from '../../utils/logger';

export class NvidiaProvider implements AiProvider {
    name = 'nvidia';
    private client: OpenAI;

    constructor() {
        if (!process.env.NVIDIA_API_KEY) {
            throw new Error('NVIDIA_API_KEY is not configured');
        }
        // NVIDIA NIM is OpenAI-compatible
        this.client = new OpenAI({
            apiKey: process.env.NVIDIA_API_KEY,
            baseURL: 'https://integrate.api.nvidia.com/v1',
        });
    }

    async analyze(issue: AiIssueInput): Promise<AiAnalysisResult> {
        const prompt = buildAnalysisPrompt(issue);
        const model = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

        try {
            const completion = await this.client.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert security engineer. Always respond with valid JSON only.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 2048,
            });

            const text = completion.choices[0]?.message?.content || '{}';
            logger.debug(`[NVIDIA] Analysis response: ${text.slice(0, 100)}...`);
            return parseAiResponse(text);
        } catch (err: any) {
            logger.error(`[NVIDIA] Analysis failed:`, err);
            throw err;
        }
    }

    async scan(filePath: string, content: string): Promise<AiScanFinding[]> {
        const prompt = buildScanPrompt(filePath, content);
        const model = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

        try {
            const completion = await this.client.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert security researcher. Always respond with valid JSON containing a findings array.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 4096,
            });

            const text = completion.choices[0]?.message?.content || '{"findings": []}';
            logger.debug(`[NVIDIA] Scan response for ${filePath}: ${text.slice(0, 100)}...`);
            return parseScanResponse(text);
        } catch (err: any) {
            logger.error(`[NVIDIA] Scan failed for ${filePath}:`, err);
            return [];
        }
    }
}
