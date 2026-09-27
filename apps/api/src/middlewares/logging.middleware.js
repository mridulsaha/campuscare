import crypto from 'node:crypto';
import pinoHttp from 'pino-http';
import {logger} from '../utils/logger.js';
import {requestContext} from '../utils/context.js';

export function contextMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);

    requestContext.run({requestId}, () => {
        next();
    });
}

export const httpLogger = pinoHttp({
    logger,
    genReqId: (req) => req.id || req.headers['x-request-id'] || crypto.randomUUID(),
    customProps: (req) => {
        const store = requestContext.getStore();
        return {
            requestId: store?.requestId || req.id,
        };
    },
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl || req.url} completed with ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.originalUrl || req.url} failed: ${err.message}`,
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                ip: req.ip || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            };
        }, res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
});