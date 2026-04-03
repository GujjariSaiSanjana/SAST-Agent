import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { ScanService } from './scan.service';
import { CreateScanSchema } from './scan.schema';
import { sendSuccess } from '../../utils/response';
import { logger } from '../../utils/logger';

const scanService = new ScanService();

export class ScanController {
    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const limit = parseInt(req.query.limit as string) || 10;
            const page = parseInt(req.query.page as string) || 1;
            const result = await scanService.list(user.id, limit, (page - 1) * limit);
            sendSuccess(res, result);
        } catch (err) { next(err); }
    };

    getSummary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const summary = await scanService.getSummary(req.params.id as string, user.id);
            sendSuccess(res, summary);
        } catch (err) { next(err); }
    };

    getIssues = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const limit = parseInt(req.query.limit as string) || 50;
            const page = parseInt(req.query.page as string) || 1;
            const result = await scanService.getIssues(req.params.id as string, user.id, limit, (page - 1) * limit);
            sendSuccess(res, result);
        } catch (err) { next(err); }
    };

    start = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const dto = CreateScanSchema.parse(req.body);
            const scan = await scanService.startScan(user.id, dto.repoUrl, dto.projectId);
            sendSuccess(res, scan, 201);
        } catch (err) { next(err); }
    };

    uploadZip = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new Error('No file uploaded');
            const user = req.user as User;
            const projectId = req.body.projectId as string | undefined;
            const scan = await scanService.startZipScan(user.id, req.file.path, projectId);
            sendSuccess(res, scan, 201);
        } catch (err) { next(err); }
    };

    stream = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as User;
            const scanId = req.params.id as string;

            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const onProgress = (data: any) => {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            };

            const cleanup = await scanService.subscribeToScan(scanId, user.id, onProgress);

            req.on('close', () => {
                cleanup();
                res.end();
            });
        } catch (err) {
            logger.error('Streaming error:', err);
            res.end();
        }
    };
}
