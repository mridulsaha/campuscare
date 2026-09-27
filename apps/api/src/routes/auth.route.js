import {Router} from 'express';
import {authenticateUser, fetchUser, logoutUser} from '../controllers/auth.controller.js';
import {authenticate} from '../middlewares/auth.middleware.js';
import {validateRequest} from '../middlewares/validate.middleware.js';
import {validateAuthRequest} from '../middlewares/validators/auth.validator.js';

const router = Router();

router.post('/google', validateRequest(validateAuthRequest), authenticateUser);

router.get('/me', authenticate, fetchUser);
router.post('/logout', authenticate, logoutUser);

export default router;