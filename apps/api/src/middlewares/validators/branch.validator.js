import {validateCode, sanitizeString} from '../../utils/validator.js';

export function validateCreateBranch({body = {}} = {}) {
    const rawStatus = body.status ? sanitizeString(body.status, {lowercase: true}) : 'active';
    if (!['active', 'inactive'].includes(rawStatus)) {
        throw new Error('Status must be either "active" or "inactive"');
    }

    return {
        body: {
            branch_code: validateCode(body.branch_code, 'branch_code'),
            branch_name: sanitizeString(body.branch_name, {minLength: 2, maxLength: 150, uppercase: true}),
            department_id: sanitizeString(body.department_id, {uppercase: true}),
            programme_id: sanitizeString(body.programme_id, {uppercase: true}),
            status: rawStatus,
        },
    };
}