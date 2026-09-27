import {Router} from 'express';
import multer from 'multer';
import {
    importDepartments,
    importProgrammes,
    importBranches,
    importCategoriesAndSubcategories,
    importStudents,
    importFaculty,
    exportComplianceData,
} from '../controllers/bulk.controller.js';
import {authenticate, authorizeRoles, authorizeLeadership} from '../middlewares/auth.middleware.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(), limits: {fileSize: 10 * 1024 * 1024}, fileFilter: (req, file, cb) => {
        const isCsvMime = file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel';
        const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
        if (isCsvMime || isCsvExt) {
            cb(null, true);
        } else {
            const err = new Error('Invalid file format. Only RFC-compliant CSV files are permitted.');
            err.statusCode = 400;
            cb(err, false);
        }
    },
});

router.use(authenticate);

router.post('/departments/import', authorizeRoles('admin'), upload.single('file'), importDepartments);
router.post('/programmes/import', authorizeRoles('admin'), upload.single('file'), importProgrammes);
router.post('/branches/import', authorizeRoles('admin'), upload.single('file'), importBranches);
router.post('/categories/import', authorizeRoles('admin'), upload.single('file'), importCategoriesAndSubcategories);
router.post('/students/import', authorizeRoles('admin'), upload.single('file'), importStudents);
router.post('/faculty/import', authorizeRoles('admin'), upload.single('file'), importFaculty);

router.get('/compliance/export', authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'), exportComplianceData);

export default router;