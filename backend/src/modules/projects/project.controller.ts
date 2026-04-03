import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { ProjectService } from './project.service';
import { CreateProjectSchema, UpdateProjectSchema } from './project.schema';
import { sendSuccess } from '../../utils/response';

const projectService = new ProjectService();

export class ProjectController {
    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const projects = await projectService.list(user.id);
            sendSuccess(res, projects);
        } catch (err) { next(err); }
    };

    get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const project = await projectService.get(req.params.id as string, user.id);
            sendSuccess(res, project);
        } catch (err) { next(err); }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const dto = CreateProjectSchema.parse(req.body);
            const project = await projectService.create(user.id, dto);
            sendSuccess(res, project, 201);
        } catch (err) { next(err); }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const dto = UpdateProjectSchema.parse(req.body);
            const project = await projectService.update(req.params.id as string, user.id, dto);
            sendSuccess(res, project);
        } catch (err) { next(err); }
    };

    remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            await projectService.remove(req.params.id as string, user.id);
            res.status(204).send();
        } catch (err) { next(err); }
    };

    getScans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as User;
            const scans = await projectService.getScans(req.params.id as string, user.id);
            sendSuccess(res, scans);
        } catch (err) { next(err); }
    };
}
