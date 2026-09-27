import {Router} from 'express';
import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import departmentRoutes from './department.route.js';
import programmeRoutes from './programme.route.js';
import branchRoutes from './branch.route.js';
import complainCategoryRoutes from './complain.category.route.js';
import complainSubcategoryRoutes from './complain.subcategory.route.js';
import complainRoutes from './complain.route.js';
import auditRoutes from './audit.route.js';
import bulkRoutes from './bulk.route.js';

const router = Router();

router.use('/bulk', bulkRoutes);
router.use('/audit', auditRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/department', departmentRoutes);
router.use('/programme', programmeRoutes);
router.use('/branch', branchRoutes);
router.use('/complain/category', complainCategoryRoutes);
router.use('/complain/subcategory', complainSubcategoryRoutes);
router.use('/complain', complainRoutes);

export default router;