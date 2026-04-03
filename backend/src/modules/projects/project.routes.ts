import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const ctrl = new ProjectController();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/scans', ctrl.getScans);

export default router;
