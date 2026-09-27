import {Router} from 'express';
import {getComplaintAuditTrail} from '../controllers/audit.controller.js';
import {authenticate} from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/complaint/:complainId', getComplaintAuditTrail);

export default router;