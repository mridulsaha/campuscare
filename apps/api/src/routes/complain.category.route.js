import {Router} from 'express';
import {
    createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory,
} from '../controllers/complain.category.controller.js';
import {authenticate, authorizeRoles} from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllCategories);
router.post('/', authorizeRoles('admin'), createCategory);
router.patch('/:id', authorizeRoles('admin'), updateCategory);
router.delete('/:id', authorizeRoles('admin'), deleteCategory);
router.get('/:id', getCategoryById);

export default router;