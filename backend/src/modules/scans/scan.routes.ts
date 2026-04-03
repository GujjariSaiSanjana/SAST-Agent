import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ScanController } from './scan.controller';
import { authenticate } from '../../middleware/authenticate';
import { scanRateLimiter } from '../../middleware/rateLimiter';

const router = Router();
const ctrl = new ScanController();

// ── Multer ZIP upload config ──────────────────────────────────
const uploadDir = process.env.TEMP_DIR || '/tmp/sast-agent';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, `${uuidv4()}.zip`),
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10) * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.zip') {
            return cb(new Error('Only .zip files are allowed'));
        }
        cb(null, true);
    },
});

router.use(authenticate);

// Scan CRUD
router.post('/', scanRateLimiter, ctrl.start);
router.post('/upload', scanRateLimiter, upload.single('file'), ctrl.uploadZip);
router.get('/', ctrl.list);
router.get('/:id/summary', ctrl.getSummary);
router.get('/:id/issues', ctrl.getIssues);
router.get('/:id/stream', ctrl.stream);

export default router;
