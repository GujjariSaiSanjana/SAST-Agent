import { Router } from 'express';
import { IssueController } from './issue.controller';

const router = Router();
const controller = new IssueController();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/:id/explain', controller.explain);

export default router;
