import auditService from '../services/audit.service.js';
import {sendSuccess} from '../utils/response.js';

export async function getComplaintAuditTrail(req, res, next) {
    try {
        const auditTrail = await auditService.getComplaintAuditTrail(req.params.complainId || req.params.id, req.user);
        return sendSuccess(res, {
            statusCode: 200, message: 'Audit trail retrieved successfully', data: auditTrail,
        });
    } catch (err) {
        next(err);
    }
}