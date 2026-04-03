import OpenAI from 'openai';
import { AiProvider, AiIssueInput, AiAnalysisResult, buildAnalysisPrompt, parseAiResponse } from './ai.interface';
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
            logger.debug(`[OpenAI] Response for issue ${issue.id}: ${text.slice(0, 100)}...`);
            return parseAiResponse(text);
        } catch (err) {
            logger.error(`[OpenAI] Analysis failed for issue ${issue.id}:`, err);
            throw err;
        }
    }
}
