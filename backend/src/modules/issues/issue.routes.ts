import { Router } from 'express';
import { IssueController } from './issue.controller';
import { authenticate } from '../../middleware/authenticate';
import { aiExplainRateLimiter } from '../../middleware/rateLimiter';

const router = Router();
const controller = new IssueController();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/:id/explain', aiExplainRateLimiter, controller.explain);

export default router;
