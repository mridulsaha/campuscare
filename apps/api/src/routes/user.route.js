import {Router} from 'express';
import {
    completeUserProfile, getUsers, adminUpdateUser, deleteUser, getUserById,
} from '../controllers/user.controller.js';
import {authenticate, authorizeRoles, authorizeLeadership} from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.patch('/profile/complete', completeUserProfile);
router.get('/', authorizeRoles('faculty', 'admin'), getUsers);
router.get('/:id', authorizeRoles('faculty', 'admin'), getUserById);
router.patch('/:id', authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'), adminUpdateUser);
router.delete('/:id', authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'), deleteUser);

export default router;