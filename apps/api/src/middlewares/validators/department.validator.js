import {validateCode, sanitizeString} from '../../utils/validator.js';

export function validateCreateDepartment({body = {}} = {}) {
    const rawStatus = body.status ? sanitizeString(body.status, {lowercase: true}) : 'active';
    if (!['active', 'inactive'].includes(rawStatus)) {
        throw new Error('Status must be either "active" or "inactive"');
    }

    return {
        body: {
            department_code: validateCode(body.department_code, 'department_code'),
            department_name: sanitizeString(body.department_name, {minLength: 2, maxLength: 150, uppercase: true}),
            status: rawStatus,
        },
    };
}