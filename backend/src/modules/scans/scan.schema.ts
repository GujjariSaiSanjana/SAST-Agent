import { z } from 'zod';

export const CreateScanSchema = z.object({
    repoUrl: z
        .string()
        .url()
        .refine(
            (url) => url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org'),
            { message: 'Must be a valid GitHub, GitLab, or Bitbucket URL' }
        ),
    projectId: z.string().optional(),
});

export const ScanQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'CLONING', 'SCANNING', 'PROCESSING', 'AI_ANALYSIS', 'COMPLETED', 'FAILED']).optional(),
    projectId: z.string().optional(),
});

export type CreateGithubScanDto = z.infer<typeof CreateGithubScanSchema>;
export type ScanQueryDto = z.infer<typeof ScanQuerySchema>;
