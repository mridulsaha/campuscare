import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, {recursive: true});
}

const sensitiveKeys = ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token', 'body.jwtToken', 'body.refreshToken', 'body.secret', 'body.credential', 'password', 'token', 'authorization',];

const transport = pino.transport({
    targets: [{
        target: 'pino-pretty', level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'), options: {
            colorize: !isProduction, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', ignore: 'pid,hostname',
        },
    }, {
        target: 'pino/file', level: 'info', options: {
            destination: path.join(logDir, 'app.log'), mkdir: true,
        },
    },],
});

export const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'), redact: {
        paths: sensitiveKeys, censor: '[REDACTED]',
    },
}, transport);