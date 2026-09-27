import authService from '../services/auth.service.js';
import {setCookie, clearCookie} from '../utils/cookie.js';
import {sendSuccess} from '../utils/response.js';

export async function authenticateUser(req, res, next) {
    try {
        const {credential} = req.body || {};
        if (!credential || typeof credential !== 'string') {
            const err = new Error('Google OAuth credential token is required');
            err.statusCode = 400;
            throw err;
        }

        const {jwtToken, user} = await authService.authenticate(credential);

        setCookie(res, process.env.JWT_NAME || 'jwtToken', jwtToken, Number(process.env.COOKIE_MAX_AGE) || 604800000);

        return sendSuccess(res, {
            statusCode: 200, message: 'Signed in successfully', data: user,
        });
    } catch (err) {
        next(err);
    }
}

export async function fetchUser(req, res, next) {
    try {
        const user = await authService.getDetail(req.user);
        return sendSuccess(res, {
            statusCode: 200, message: 'User profile fetched successfully', data: user,
        });
    } catch (err) {
        next(err);
    }
}

export async function logoutUser(req, res, next) {
    try {
        clearCookie(res, process.env.JWT_NAME || 'jwtToken');
        return sendSuccess(res, {
            statusCode: 200, message: 'Signed out successfully', data: null,
        });
    } catch (err) {
        next(err);
    }
}