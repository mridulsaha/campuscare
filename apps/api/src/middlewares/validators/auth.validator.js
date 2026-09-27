import {sanitizeString} from '../../utils/validator.js';

export function validateAuthRequest({body = {}} = {}) {
    if (!body.credential) {
        throw new Error('Google identity credential token is required');
    }
    return {
        body: {
            credential: sanitizeString(body.credential, {minLength: 1, maxLength: 4096}),
        },
    };
}