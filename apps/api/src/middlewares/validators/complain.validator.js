import { sanitizeString } from '../../utils/validator.js';

export function validateChatMessage({ body = {} } = {}) {
    const rawMessage = body.message;
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
        const err = new Error('Message content cannot be empty');
        err.statusCode = 400;
        throw err;
    }

    return {
        body: {
            message: sanitizeString(rawMessage, { minLength: 1, maxLength: 3000 }),
        },
    };
}

export function validateCreateComplaint({ body = {} } = {}) {
    const rawType = body.ticket_type ? sanitizeString(body.ticket_type, { uppercase: true }) : 'STATUTORY_GRIEVANCE';
    const ticketType = ['DIRECT_QUERY', 'STATUTORY_GRIEVANCE'].includes(rawType) ? rawType : 'STATUTORY_GRIEVANCE';

    const isDirect = ticketType === 'DIRECT_QUERY';

    if (isDirect && !body.target_user_id) {
        throw new Error('A targeted respondent (target_user_id) is required for direct inquiries');
    }

    const validatedAttachments = [];
    if (Array.isArray(body.attachments)) {
        if (body.attachments.length > 5) {
            throw new Error('A maximum of 5 attachments are permitted');
        }
        for (const att of body.attachments) {
            if (!att.public_id || !att.file_url) {
                throw new Error('Every attachment must provide a public_id and file_url');
            }
            validatedAttachments.push({
                file_name: sanitizeString(att.file_name || 'attachment', { maxLength: 150 }),
                file_type: sanitizeString(att.file_type || 'FILE', { uppercase: true }),
                file_url: sanitizeString(att.file_url),
                public_id: sanitizeString(att.public_id),
            });
        }
    }

    return {
        body: {
            title: sanitizeString(body.title, { minLength: 5, maxLength: 200 }),
            description: sanitizeString(body.description, { minLength: 10, maxLength: 5000 }),
            ticket_type: ticketType,
            target_department_id: sanitizeString(body.target_department_id, { uppercase: true }),
            target_user_id: body.target_user_id ? sanitizeString(body.target_user_id, { uppercase: true }) : null,
            category_id: sanitizeString(body.category_id, { uppercase: true }),
            subcategory_id: sanitizeString(body.subcategory_id, { uppercase: true }),
            priority: body.priority ? sanitizeString(body.priority, { uppercase: true }) : null,
            is_anonymous: isDirect ? false : Boolean(body.is_anonymous),
            attachments: validatedAttachments,
        },
    };
}

export function validateAssignComplaint({ body = {} } = {}) {
    return {
        body: {
            complain_id: sanitizeString(body.complain_id, { uppercase: true }),
            respondent_id: sanitizeString(body.respondent_id, { uppercase: true }),
            description: sanitizeString(body.description, { minLength: 5, maxLength: 5000 }),
        },
    };
}

export function validateTransferComplaint({ body = {} } = {}) {
    return {
        body: {
            complain_id: sanitizeString(body.complain_id, { uppercase: true }),
            new_respondent_id: sanitizeString(body.new_respondent_id, { uppercase: true }),
            reason: sanitizeString(body.reason, { minLength: 5, maxLength: 5000 }),
        },
    };
}

export function validateTransferDepartment({ body = {} } = {}) {
    return {
        body: {
            complain_id: sanitizeString(body.complain_id, { uppercase: true }),
            new_department_id: sanitizeString(body.new_department_id, { uppercase: true }),
            reason: sanitizeString(body.reason, { minLength: 5, maxLength: 5000 }),
        },
    };
}

export function validateResolution({ body = {} } = {}) {
    return {
        body: {
            remarks: sanitizeString(body.remarks, { minLength: 5, maxLength: 5000 }),
        },
    };
}

export function validateRejection({ body = {} } = {}) {
    const rawReason = body.reason || body.remarks;
    return {
        body: {
            reason: sanitizeString(rawReason, { minLength: 5, maxLength: 5000 }),
        },
    };
}