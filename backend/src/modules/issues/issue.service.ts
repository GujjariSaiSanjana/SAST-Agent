import { prisma } from '../../config/database';
import { AiService } from '../ai/ai.service';
import { logger } from '../../utils/logger';

const aiService = new AiService();

export class IssueService {
    async list(userId: string, limit = 10, offset = 0) {
        const [issues, total] = await Promise.all([
            prisma.issue.findMany({
                where: { scan: { userId } },
                include: {
                    scan: {
                        select: {
                            id: true,
                            inputRef: true,
                            project: { select: { name: true } },
                        },
                    },
                },
                orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
                take: limit,
                skip: offset,
            }),
            prisma.issue.count({ where: { scan: { userId } } }),
        ]);

        return { issues, total };
    }

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

        if (issue.aiProcessed && issue.aiExplanation) {
            return issue;
        }

        logger.info(`[Issue] Manual AI explain for ${id}`);

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

        if (!aiResult) throw new Error('AI analysis failed — all providers exhausted');

        return prisma.issue.update({
            where: { id },
            data: {
                aiExplanation: aiResult.explanation,
                aiImpact: aiResult.impact,
                aiProofOfConcept: aiResult.proofOfConcept,
                aiRemediation: aiResult.remediation,
                aiFixCode: aiResult.fixCode,
                aiProcessed: true,
                aiProcessedAt: new Date(),
            },
        });
    }
}
