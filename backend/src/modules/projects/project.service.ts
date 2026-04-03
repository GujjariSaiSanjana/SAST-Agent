import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { CreateProjectDto, UpdateProjectDto } from './project.schema';

export class ProjectService {
    async list(userId: string) {
        return prisma.project.findMany({
            where: { userId },
            include: {
                _count: { select: { scans: true } },
                scans: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, status: true, riskScore: true, createdAt: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async get(id: string, userId: string) {
        const project = await prisma.project.findFirst({
            where: { id, userId },
            include: {
                _count: { select: { scans: true } },
                scans: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        status: true,
                        riskScore: true,
                        totalIssues: true,
                        criticalCount: true,
                        highCount: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
        return project;
    }

    async create(userId: string, dto: CreateProjectDto) {
        return prisma.project.create({
            data: {
                name: dto.name,
                repoUrl: dto.repoUrl || null,
                description: dto.description || null,
                userId,
            },
        });
    }

    async update(id: string, userId: string, dto: UpdateProjectDto) {
        await this.get(id, userId); // ownership check
        return prisma.project.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string, userId: string) {
        await this.get(id, userId); // ownership check
        await prisma.project.delete({ where: { id } });
    }

    async getScans(projectId: string, userId: string) {
        await this.get(projectId, userId); // ownership check
        return prisma.scan.findMany({
            where: { projectId, userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { issues: true } },
            },
        });
    }
}
