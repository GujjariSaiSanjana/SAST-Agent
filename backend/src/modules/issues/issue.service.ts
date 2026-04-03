import { prisma } from '../../config/database';
import { AiService } from '../ai/ai.service';
import { logger } from '../../utils/logger';

const aiService = new AiService();

export class IssueService {
    async get(id: string, userId: string) {
        return prisma.issue.findFirstOrThrow({
            where: { id, scan: { userId } },
            include: { scan: { select: { status: true, source: true } } },
        });
    }

    async explain(id: string, userId: string) {
        const issue = await prisma.issue.findFirstOrThrow({
            where: { id, scan: { userId } },
        });

        // Trigger AI analysis if not already processed
        if (issue.aiProcessed && issue.aiExplanation) {
            return issue;
        }

        logger.info(`[Issue] Requesting manual AI explanation for ${id}`);

        const aiResult = await aiService.analyzeIssue({
            id: issue.id,
            ruleId: issue.ruleId,
            title: issue.title,
            description: issue.description,
            severity: issue.severity,
            category: issue.category,
            filePath: issue.filePath,
            lineStart: issue.lineStart,
            lineEnd: issue.lineEnd,
            codeSnippet: issue.codeSnippet,
            cweId: issue.cweId,
        });

        if (!aiResult) throw new Error('AI analysis failed');

        const updated = await prisma.issue.update({
            where: { id },
            data: {
                aiExplanation: aiResult.explanation,
                aiImpact: aiResult.impact,
                aiRemediation: aiResult.remediation,
                aiFixCode: aiResult.fixCode,
                aiProcessed: true,
                aiProcessedAt: new Date(),
            },
        });

        return updated;
    }
}
