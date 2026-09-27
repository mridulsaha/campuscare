import {Router} from 'express';
import {
    createSubcategory, getAllSubcategories, getSubcategoryById, updateSubcategory, deleteSubcategory,
} from '../controllers/complain.subcategory.controller.js';
import {authenticate, authorizeRoles} from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllSubcategories);
router.post('/', authorizeRoles('admin'), createSubcategory);
router.patch('/:id', authorizeRoles('admin'), updateSubcategory);
router.delete('/:id', authorizeRoles('admin'), deleteSubcategory);
router.get('/:id', getSubcategoryById);

export default router;