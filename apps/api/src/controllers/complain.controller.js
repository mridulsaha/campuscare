import complainService from '../services/complain.service.js';
import complainChatService from '../services/complain.chat.service.js';
import {sendSuccess} from '../utils/response.js';

export async function getComplaintFormOptions(req, res, next) {
    try {
        const options = await complainService.getComplaintFormOptions(req.user);
        return sendSuccess(res, {
            statusCode: 200, message: 'Complaint form options retrieved successfully', data: options,
        });
    } catch (err) {
        next(err);
    }
}

export async function getUploadSignature(req, res, next) {
    try {
        const signatureData = complainService.generateUploadSignature();
        return sendSuccess(res, {
            statusCode: 200, message: 'Direct upload signature generated', data: signatureData,
        });
    } catch (err) {
        next(err);
    }
}

export async function fileComplaint(req, res, next) {
    try {
        const complaint = await complainService.createComplaint(req.user, req.body, req.body.attachments || []);
        return sendSuccess(res, {
            statusCode: 201,
            message: req.body.ticket_type === 'DIRECT_QUERY' ? 'Direct inquiry submitted directly to target faculty/staff member' : 'Grievance submitted successfully and queued for review',
            data: complaint,
        });
    } catch (err) {
        next(err);
    }
}

export async function getComplaintById(req, res, next) {
    try {
        const complaint = await complainService.getById(req.params.id, req.user);
        return sendSuccess(res, {
            statusCode: 200, message: 'Complaint retrieved successfully', data: complaint,
        });
    } catch (err) {
        next(err);
    }
}

export async function getMyComplaints(req, res, next) {
    try {
        const userId = req.user.id || req.user._id || req.user.custom_id;
        const result = await complainService.getMyComplaints(userId, req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'My grievances retrieved successfully', data: result.complains, meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getUserComplains(req, res, next) {
    try {
        const result = await complainService.getUserComplains(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'User grievances retrieved successfully',
            data: result.complains || result,
            meta: result.meta || null,
        });
    } catch (err) {
        next(err);
    }
}

export async function getStudentDashboard(req, res, next) {
    try {
        const dashboard = await complainService.getStudentDashboard(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'Student dashboard retrieved successfully', data: dashboard,
        });
    } catch (err) {
        next(err);
    }
}

export async function getFacultyDashboard(req, res, next) {
    try {
        const dashboard = await complainService.getFacultyDashboard(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'Faculty task dashboard retrieved successfully', data: dashboard,
        });
    } catch (err) {
        next(err);
    }
}

export async function getFacultyAssignedComplaints(req, res, next) {
    try {
        const result = await complainService.getFacultyAssignedComplaints(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Assigned faculty tasks retrieved successfully',
            data: result.complains,
            meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getFacultyAssignmentHistory(req, res, next) {
    try {
        const result = await complainService.getFacultyAssignmentHistory(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Historical assignments retrieved successfully',
            data: result.complains,
            meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getHodDashboard(req, res, next) {
    try {
        const dashboard = await complainService.getHodDashboard(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'HOD department dashboard retrieved successfully', data: dashboard,
        });
    } catch (err) {
        next(err);
    }
}

export async function getLeadershipDashboard(req, res, next) {
    try {
        const dashboard = await complainService.getLeadershipDashboard(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'Leadership institutional dashboard retrieved successfully', data: dashboard,
        });
    } catch (err) {
        next(err);
    }
}

export async function getDepartmentInboundComplaints(req, res, next) {
    try {
        const result = await complainService.getInboundDepartmentComplaints(req.query, req.user);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Inbound department pool complaints retrieved successfully',
            data: result.complains,
            meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getDepartmentOutboundComplaints(req, res, next) {
    try {
        const result = await complainService.getOutboundDepartmentComplaints(req.query, req.user);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Outbound department complaints retrieved successfully',
            data: result.complains,
            meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getCollegeComplaints(req, res, next) {
    try {
        const result = await complainService.getCollegeComplaints(req.query, req.user);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Institution-wide complaints retrieved',
            data: result.complains,
            meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function assignComplaint(req, res, next) {
    try {
        const updated = await complainService.assignComplaint(req.user, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Complaint assigned to faculty member successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function transferComplaint(req, res, next) {
    try {
        const updated = await complainService.transferComplaint(req.user, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Complaint transferred / escalated successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function transferDepartment(req, res, next) {
    try {
        const updated = await complainService.transferDepartmentComplaint(req.user, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Complaint re-routed to new department successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function resolveComplaint(req, res, next) {
    try {
        const updated = await complainService.resolveComplaint(req.user, req.params.id, req.body.remarks);
        return sendSuccess(res, {
            statusCode: 200, message: 'Grievance resolved successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function rejectComplaint(req, res, next) {
    try {
        const updated = await complainService.rejectComplaint(req.user, req.params.id, req.body.reason || req.body.remarks);
        return sendSuccess(res, {
            statusCode: 200, message: 'Grievance rejected successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAnalyticsReport(req, res, next) {
    try {
        const report = await complainService.getAnalyticsReport(req.user, req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'Institutional analytics metrics generated', data: report,
        });
    } catch (err) {
        next(err);
    }
}

export const getComplaintChat = async (req, res, next) => {
    try {
        const data = await complainChatService.getComplaintMessages(req.params.id, req.user, req.query);
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const postComplaintChat = async (req, res, next) => {
    try {
        const data = await complainChatService.postMessage(req.params.id, req.user, req.body);
        res.status(201).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};