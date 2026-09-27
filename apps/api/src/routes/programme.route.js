import {Router} from 'express';
import {
    createProgramme, getAllProgrammes, getProgrammeById, updateProgramme, deleteProgramme,
} from '../controllers/programme.controller.js';
import {authenticate, authorizeRoles} from '../middlewares/auth.middleware.js';
import {validateRequest} from '../middlewares/validate.middleware.js';
import {validateCreateProgramme} from '../middlewares/validators/programme.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllProgrammes);
router.post('/', authorizeRoles('admin'), validateRequest(validateCreateProgramme), createProgramme);
router.patch('/:id', authorizeRoles('admin'), updateProgramme);
router.delete('/:id', authorizeRoles('admin'), deleteProgramme);
router.get('/:id', getProgrammeById);

export default router;