import {getCookie} from '../utils/cookie.js';
import jwt from '../utils/jwt.js';
import {sendError} from '../utils/response.js';

export function authenticate(req, res, next) {
    try {
        let token = getCookie(req, process.env.JWT_NAME || 'jwtToken');
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.slice(7).trim();
        }

        if (!token) {
            return sendError(res, {
                statusCode: 401, error: 'Authentication Required: No active session token found',
            });
        }

        const decoded = jwt.verifyToken(token);
        req.user = {
            id: decoded.id,
            custom_id: decoded.id,
            email: decoded.email || null,
            full_name: decoded.full_name || null,
            enrollment_number: decoded.enrollment_number || null,
            role: decoded.role ? decoded.role.toLowerCase().trim() : null,
            designation: decoded.designation ? decoded.designation.toLowerCase().trim() : null,
            department_id: decoded.department_id || null,
            branch_id: decoded.branch_id || null,
        };
        next();
    } catch (err) {
        return sendError(res, {
            statusCode: 401, error: 'Authentication Failed: Invalid or expired token session',
        });
    }
}

export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return sendError(res, {statusCode: 401, error: 'Authentication Required'});
        }

        const normalizedRole = req.user.role.trim().toLowerCase();
        const targets = allowedRoles.map((r) => r.trim().toLowerCase());

        if (!targets.includes(normalizedRole)) {
            return sendError(res, {
                statusCode: 403, error: `Access Denied: Role "${req.user.role}" does not have required permissions`,
            });
        }
        next();
    };
}

export function authorizeLeadership(...allowedDesignations) {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, {statusCode: 401, error: 'Authentication Required'});
        }

        if (req.user.role === 'admin') {
            return next();
        }

        const userDesignation = req.user.designation ? req.user.designation.trim().toLowerCase() : null;
        const targets = allowedDesignations.map((d) => d.trim().toLowerCase());

        if (!userDesignation || !targets.includes(userDesignation)) {
            return sendError(res, {
                statusCode: 403,
                error: `Access Denied: Requires leadership privilege. Current: "${userDesignation || 'None'}"`,
            });
        }
        next();
    };
}