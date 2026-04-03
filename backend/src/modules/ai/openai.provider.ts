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

export class OpenAIProvider implements AiProvider {
    name = 'openai';
    private client: OpenAI;

    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async analyze(issue: AiIssueInput): Promise<AiAnalysisResult> {
        const prompt = buildAnalysisPrompt(issue);

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert security engineer. Always respond with valid JSON only.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 2048,
                response_format: { type: 'json_object' },
            });

            const text = completion.choices[0]?.message?.content || '{}';
            logger.debug(`[OpenAI] Analysis response: ${text.slice(0, 100)}...`);
            return parseAiResponse(text);
        } catch (err: any) {
            logger.error(`[OpenAI] Analysis failed:`, err);
            throw err;
        }
    }

    async scan(filePath: string, content: string): Promise<AiScanFinding[]> {
        const prompt = buildScanPrompt(filePath, content);

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert security researcher. Always respond with valid JSON containing a findings array.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
            });

            const text = completion.choices[0]?.message?.content || '{"findings": []}';
            logger.debug(`[OpenAI] Scan response for ${filePath}: ${text.slice(0, 100)}...`);
            return parseScanResponse(text);
        } catch (err: any) {
            logger.error(`[OpenAI] Scan failed for ${filePath}:`, err);
            return [];
        }
    }
}
