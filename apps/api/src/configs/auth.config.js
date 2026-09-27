function createList(str = '') {
    if (!str || typeof str !== 'string') return [];
    return str
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

export const VALID_ROLES = ['student', 'faculty', 'admin'];

export const SUB_HOD_DESIGNATIONS = ['professor', 'associate_professor', 'assistant_professor', 'adhoc_faculty',];

export const HOD_DESIGNATION = 'hod';

export const TOP_LEVEL_MANAGEMENT = ['director', 'vice_chancellor', 'pro_vice_chancellor', 'dean',];

export const LEADERSHIP_AND_ABOVE = [...TOP_LEVEL_MANAGEMENT, HOD_DESIGNATION,];

export const VALID_DESIGNATIONS = createList(process.env.VALID_DESIGNATIONS || [...TOP_LEVEL_MANAGEMENT, HOD_DESIGNATION, ...SUB_HOD_DESIGNATIONS].join(','));

export const STUDENT_EMAIL_DOMAINS = new Set(createList(process.env.STUDENT_EMAIL_DOMAINS || 'mitsgwl.ac.in'));

export const NON_STUDENT_EMAIL_DOMAINS = new Set(createList(process.env.NON_STUDENT_EMAIL_DOMAINS || 'mitsgwalior.in'));

export const ADMIN_EMAILS = new Set(createList(process.env.ADMIN_EMAILS || ''));

export const ADMINISTRATION_DEPARTMENT_CODE = 'ADMIN_CELL';

export const ADMINISTRATION_DEPARTMENT_NAME = 'ADMINISTRATION';