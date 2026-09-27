import {sendError} from '../utils/response.js';

function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
            continue;
        }
        if (typeof value === 'object' && value !== null) {
            clean[key] = sanitizeObject(value);
        } else {
            clean[key] = value;
        }
    }
    return clean;
}

export function validateRequest(validationFn) {
    return (req, res, next) => {
        try {
            if (req.body) req.body = sanitizeObject(req.body);
            if (req.query) req.query = sanitizeObject(req.query);
            if (req.params) req.params = sanitizeObject(req.params);

            if (validationFn) {
                const validated = validationFn(req);
                if (validated && typeof validated === 'object') {
                    if (validated.body !== undefined) req.body = validated.body;
                    if (validated.query !== undefined) req.query = validated.query;
                    if (validated.params !== undefined) req.params = validated.params;
                }
            }
            next();
        } catch (err) {
            return sendError(res, {
                statusCode: 400, error: err.message || 'Validation Error: Invalid input supplied',
            });
        }
    };
}