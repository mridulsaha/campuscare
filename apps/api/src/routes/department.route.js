import {Router} from 'express';
import {
    createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment,
} from '../controllers/department.controller.js';
import {authenticate, authorizeRoles} from '../middlewares/auth.middleware.js';
import {validateRequest} from '../middlewares/validate.middleware.js';
import {validateCreateDepartment} from '../middlewares/validators/department.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllDepartments);
router.post('/', authorizeRoles('admin'), validateRequest(validateCreateDepartment), createDepartment);
router.patch('/:id', authorizeRoles('admin'), updateDepartment);
router.delete('/:id', authorizeRoles('admin'), deleteDepartment);
router.get('/:id', getDepartmentById);

export default router;