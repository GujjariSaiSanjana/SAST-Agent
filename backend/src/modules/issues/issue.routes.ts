import { Router } from 'express';
import { IssueController } from './issue.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const controller = new IssueController();

// All issue routes require authentication
router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/:id/explain', controller.explain);

export default router;
