import { z } from 'zod';

export const CreateProjectSchema = z.object({
    name: z.string().min(1).max(100),
    repoUrl: z.string().url().optional().or(z.literal('')),
    description: z.string().max(500).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
