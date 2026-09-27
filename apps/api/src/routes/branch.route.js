import {Router} from 'express';
import {
    createBranch, getAllBranches, getBranchById, updateBranch, deleteBranch,
} from '../controllers/branch.controller.js';
import {authenticate, authorizeRoles} from '../middlewares/auth.middleware.js';
import {validateRequest} from '../middlewares/validate.middleware.js';
import {validateCreateBranch} from '../middlewares/validators/branch.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllBranches);
router.post('/', authorizeRoles('admin'), validateRequest(validateCreateBranch), createBranch);
router.patch('/:id', authorizeRoles('admin'), updateBranch);
router.delete('/:id', authorizeRoles('admin'), deleteBranch);
router.get('/:id', getBranchById);

export default router;