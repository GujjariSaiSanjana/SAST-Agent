import OpenAI from 'openai';
import { AiProvider, AiIssueInput, AiAnalysisResult, buildAnalysisPrompt, parseAiResponse } from './ai.interface';
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

        try {
            const completion = await this.client.chat.completions.create({
                // Using a common high-performance model available on NIM
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert security engineer. Always respond with valid JSON only.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 2048,
                // Some NIM models might not support json_object yet or need specific prompts, 
                // but the prompt already asks for JSON.
            });

            const text = completion.choices[0]?.message?.content || '{}';
            logger.debug(`[NVIDIA] Response for issue ${issue.id}: ${text.slice(0, 100)}...`);
            return parseAiResponse(text);
        } catch (err: any) {
            logger.error(`[NVIDIA] Analysis failed for issue ${issue.id}:`, err);
            throw err;
        }
    }
}
