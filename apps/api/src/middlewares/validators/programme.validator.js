import {validateCode, sanitizeString} from '../../utils/validator.js';

export function validateCreateProgramme({body = {}} = {}) {
    const duration = Number(body.duration_year);
    const semesters = Number(body.total_semester);
    const rawStatus = body.status ? sanitizeString(body.status, {lowercase: true}) : 'active';

    if (Number.isNaN(duration) || duration < 1 || duration > 10) {
        throw new Error('duration_year must be an integer between 1 and 10');
    }

    if (Number.isNaN(semesters) || semesters < 1 || semesters > 20) {
        throw new Error('total_semester must be an integer between 1 and 20');
    }

    if (!['active', 'inactive'].includes(rawStatus)) {
        throw new Error('Status must be either "active" or "inactive"');
    }

    return {
        body: {
            programme_code: validateCode(body.programme_code, 'programme_code'),
            programme_name: sanitizeString(body.programme_name, {minLength: 2, maxLength: 150, uppercase: true}),
            duration_year: duration,
            total_semester: semesters,
            status: rawStatus,
        },
    };
}