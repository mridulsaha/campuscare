import { Router } from 'express';
import {
    getComplaintFormOptions,
    getUploadSignature,
    fileComplaint,
    getComplaintById,
    getMyComplaints,
    getStudentDashboard,
    getFacultyDashboard,
    getFacultyAssignedComplaints,
    getFacultyAssignmentHistory,
    getHodDashboard,
    getLeadershipDashboard,
    getDepartmentInboundComplaints,
    getDepartmentOutboundComplaints,
    getCollegeComplaints,
    assignComplaint,
    transferComplaint,
    transferDepartment,
    resolveComplaint,
    rejectComplaint,
    getAnalyticsReport,
    getUserComplains,
    getComplaintChat,
    postComplaintChat,
} from '../controllers/complain.controller.js';
import {
    authenticate,
    authorizeRoles,
    authorizeLeadership,
} from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
    validateCreateComplaint,
    validateAssignComplaint,
    validateTransferComplaint,
    validateTransferDepartment,
    validateResolution,
    validateRejection,
    validateChatMessage
} from '../middlewares/validators/complain.validator.js';

const router = Router();

router.use(authenticate);

router.get('/form-options', getComplaintFormOptions);
router.get('/upload-signature', getUploadSignature);

router.post('/', validateRequest(validateCreateComplaint), fileComplaint);
router.get('/my', getMyComplaints);

router.get('/student/dashboard', authorizeRoles('student'), getStudentDashboard);
router.get('/faculty/dashboard', authorizeRoles('faculty', 'admin'), getFacultyDashboard);
router.get(
    '/hod/dashboard',
    authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    getHodDashboard
);
router.get(
    '/leadership/dashboard',
    authorizeLeadership('dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    getLeadershipDashboard
);

router.get('/faculty/tasks', authorizeRoles('faculty', 'admin'), getFacultyAssignedComplaints);
router.get('/faculty/history', authorizeRoles('faculty', 'admin'), getFacultyAssignmentHistory);
router.get(
    '/department/inbound',
    authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    getDepartmentInboundComplaints
);
router.get(
    '/department/outbound',
    authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    getDepartmentOutboundComplaints
);
router.get(
    '/college/all',
    authorizeLeadership('dean', 'director', 'pro_vice_chancellor', 'vice_chancellor'),
    getCollegeComplaints
);

router.get(
    '/analytics/report',
    authorizeLeadership('hod', 'dean', 'director', 'pro_vice_chancellor', 'vice_chancellor'),
    getAnalyticsReport
);
router.get(
    '/user',
    authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    getUserComplains
);

router.post(
    '/assign',
    authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    validateRequest(validateAssignComplaint),
    assignComplaint
);
router.post(
    '/transfer-department',
    authorizeLeadership('hod', 'dean', 'director', 'vice_chancellor', 'pro_vice_chancellor'),
    validateRequest(validateTransferDepartment),
    transferDepartment
);
router.post(
    '/transfer',
    authorizeRoles('faculty', 'admin'),
    validateRequest(validateTransferComplaint),
    transferComplaint
);

router.patch(
    '/:id/resolve',
    authorizeRoles('faculty', 'admin'),
    validateRequest(validateResolution),
    resolveComplaint
);
router.patch(
    '/:id/reject',
    authorizeRoles('faculty', 'admin'),
    validateRequest(validateRejection),
    rejectComplaint
);

router.get('/:id/chat', getComplaintChat);
router.post('/:id/chat', validateRequest(validateChatMessage), postComplaintChat);

router.get('/view/:id', getComplaintById);

export default router;