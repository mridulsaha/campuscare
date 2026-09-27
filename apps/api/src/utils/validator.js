const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ENROLLMENT_REGEX = /^[A-Z0-9]{8,20}$/;
const CODE_REGEX = /^[A-Z0-9_-]+$/;
const CUSTOM_ID_REGEX = /^[A-Z]{3,4}-\d{4}-\d{6}$/;

export function sanitizeString(val, {minLength = 1, maxLength = 5000, uppercase = false, lowercase = false} = {}) {
    if (val === undefined || val === null) return null;
    if (typeof val !== 'string') {
        throw new Error('Expected a string value');
    }
    let sanitized = val.trim();
    if (uppercase) sanitized = sanitized.toUpperCase();
    if (lowercase) sanitized = sanitized.toLowerCase();

    if (sanitized.length < minLength) {
        throw new Error(`Length must be at least ${minLength} characters`);
    }
    if (sanitized.length > maxLength) {
        throw new Error(`Length cannot exceed ${maxLength} characters`);
    }
    return sanitized;
}

export function validateEmail(email) {
    const sanitized = sanitizeString(email, {minLength: 5, maxLength: 100, lowercase: true});
    if (!EMAIL_REGEX.test(sanitized)) {
        throw new Error('Please provide a valid email address');
    }
    return sanitized;
}

export function validateCode(code, fieldName = 'Code') {
    const sanitized = sanitizeString(code, {minLength: 2, maxLength: 20, uppercase: true});
    if (!CODE_REGEX.test(sanitized)) {
        throw new Error(`${fieldName} can only contain uppercase letters, numbers, hyphens, and underscores`);
    }
    return sanitized;
}

export function validateCustomId(id, fieldName = 'ID') {
    if (!id || typeof id !== 'string') {
        throw new Error(`${fieldName} must be a valid identifier`);
    }
    const cleanId = id.trim().toUpperCase();
    if (!CUSTOM_ID_REGEX.test(cleanId)) {
        throw new Error(`Invalid format for ${fieldName}. Expected pattern: XXX-YYYY-000000`);
    }
    return cleanId;
}

export function validateEnrollmentNumber(enrollment) {
    const sanitized = sanitizeString(enrollment, {minLength: 8, maxLength: 20, uppercase: true});
    if (!ENROLLMENT_REGEX.test(sanitized)) {
        throw new Error('Invalid enrollment number format');
    }
    return sanitized;
}