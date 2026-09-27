import googleService from './google.service.js';
import userService from './user.service.js';
import jwt from '../utils/jwt.js';
import {NON_STUDENT_EMAIL_DOMAINS, STUDENT_EMAIL_DOMAINS} from '../configs/auth.config.js';

class AuthService {
    async authenticate(credential) {
        if (!credential || typeof credential !== 'string') {
            const err = new Error('OAuth credential is required');
            err.statusCode = 400;
            throw err;
        }

        const payload = await googleService.verifyToken(credential);
        const email = payload.email.trim().toLowerCase();
        const atIndex = email.lastIndexOf('@');
        if (atIndex === -1) {
            const err = new Error('Invalid email address structure received from Google identity');
            err.statusCode = 400;
            throw err;
        }

        const emailDomain = email.slice(atIndex + 1).trim().toLowerCase();
        const isStudentDomain = STUDENT_EMAIL_DOMAINS.has(emailDomain);
        const isNonStudentDomain = NON_STUDENT_EMAIL_DOMAINS.has(emailDomain);

        if (!isStudentDomain && !isNonStudentDomain) {
            const err = new Error(`Access Denied: Domain @${emailDomain} is unauthorized`);
            err.statusCode = 403;
            throw err;
        }

        const user = await userService.findOrCreateOAuthUser({
            email, rawName: payload.name || '', isStudentDomain, isNonStudentDomain,
        });

        if (user.status === 'inactive') {
            const err = new Error('Your account has been deactivated. Contact university administration.');
            err.statusCode = 403;
            throw err;
        }

        const jwtToken = jwt.generateToken({
            id: user.id || user.custom_id || user._id,
            role: user.role,
            email: email,
            full_name: user.full_name || null,
            enrollment_number: user.enrollment_number || null,
            designation: user.designation || null,
            department_id: user.department_id || null,
            branch_id: user.branch_id || null,
        });

        return {
            jwtToken, user,
        };
    }

    async getDetail(decodedUser) {
        if (!decodedUser || !decodedUser.id) {
            const err = new Error('Unauthorized session token');
            err.statusCode = 401;
            throw err;
        }

        const user = await userService.getById(decodedUser.id, {populate: true});
        if (!user || user.status === 'inactive') {
            const err = new Error('Session invalid or account deactivated');
            err.statusCode = 401;
            throw err;
        }

        return user;
    }
}

export default new AuthService();