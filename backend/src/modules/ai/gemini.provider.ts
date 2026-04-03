import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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

export class GeminiProvider implements AiProvider {
    name = 'gemini';
    private client: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.client.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        });
    }

    async analyze(issue: AiIssueInput): Promise<AiAnalysisResult> {
        const prompt = buildAnalysisPrompt(issue);

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            logger.debug(`[Gemini] Analysis response: ${text.slice(0, 100)}...`);
            return parseAiResponse(text);
        } catch (err: any) {
            logger.error(`[Gemini] Analysis failed:`, err);
            throw err;
        }
    }

    async scan(filePath: string, content: string): Promise<AiScanFinding[]> {
        const prompt = buildScanPrompt(filePath, content);

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            logger.debug(`[Gemini] Scan response for ${filePath}: ${text.slice(0, 100)}...`);
            return parseScanResponse(text);
        } catch (err) {
            logger.error(`[Gemini] Scan failed for ${filePath}:`, err);
            return [];
        }
    }
}
