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

export type CreateScanDto = z.infer<typeof CreateScanSchema>;
