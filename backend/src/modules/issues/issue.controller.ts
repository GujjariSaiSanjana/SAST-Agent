import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { IssueService } from './issue.service';
import { sendSuccess } from '../../utils/response';

const issueService = new IssueService();

export class IssueController {
    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = parseInt(req.query.offset as string) || 0;
            const result = await issueService.list(user.id, limit, offset);
            sendSuccess(res, result);
        } catch (err) { next(err); }
    };

    get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const issue = await issueService.get(req.params.id as string, user.id);
            sendSuccess(res, issue);
        } catch (err) { next(err); }
    };

    explain = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const result = await issueService.explain(req.params.id as string, user.id);
            sendSuccess(res, result);
        } catch (err) { next(err); }
    };
}
