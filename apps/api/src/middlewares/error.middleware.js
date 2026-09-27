import multer from 'multer';
import {sendError} from '../utils/response.js';
import {logger} from '../utils/logger.js';

export default function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    if (err instanceof multer.MulterError) {
        return sendError(res, {
            statusCode: 400, error: `File Upload Error: ${err.message}`,
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        statusCode = 409;
        message = `Conflict: Duplicate value for unique field "${field}".`;
    }

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid data format for attribute: ${err.path}`;
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError' || err.message?.toLowerCase().includes('jwt')) {
        statusCode = 401;
        message = 'Invalid authentication token. Please sign in again.';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Session expired. Please sign in again.';
    }

    if (statusCode >= 500) {
        logger.error({
            err, url: req.originalUrl, method: req.method, user: req.user?.id || req.user?.custom_id || 'anonymous',
        }, 'Unhandled application exception');
    } else {
        logger.warn({
            message: err.message, statusCode, url: req.originalUrl, method: req.method,
        }, 'Client error encountered');
    }

    return sendError(res, {
        statusCode,
        error: message,
        details: process.env.NODE_ENV !== 'production' ? err.details || null : null,
        stack: process.env.NODE_ENV !== 'production' ? err.stack || null : null,
    });
}