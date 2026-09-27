import {sendError} from '../utils/response.js';

const clientBuckets = new Map();

const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of clientBuckets.entries()) {
        if (now - bucket.start > bucket.windowMs) {
            clientBuckets.delete(ip);
        }
    }
}, 60000);
sweepInterval.unref();

export function rateLimiter({windowMs = 60 * 1000, max = 60} = {}) {
    return (req, res, next) => {
        const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
        const now = Date.now();

        if (!clientBuckets.has(ip)) {
            clientBuckets.set(ip, {start: now, count: 1, windowMs});
            return next();
        }

        const bucket = clientBuckets.get(ip);
        if (now - bucket.start > windowMs) {
            bucket.start = now;
            bucket.count = 1;
            bucket.windowMs = windowMs;
            return next();
        }

        bucket.count += 1;
        if (bucket.count > max) {
            return sendError(res, {
                statusCode: 429, error: 'Too many requests. Please wait a few moments before trying again.',
            });
        }
        next();
    };
}