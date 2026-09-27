import mongoose from 'mongoose';
import {sendSuccess, sendError} from '../utils/response.js';

export function getHealthStatus(req, res) {
    const isDbConnected = mongoose.connection.readyState === 1;
    const memoryUsage = process.memoryUsage();

    if (!isDbConnected) {
        return sendError(res, {
            statusCode: 503,
            error: 'Database Disconnected or Reconnecting',
            details: {connectionState: mongoose.connection.readyState},
        });
    }

    return sendSuccess(res, {
        statusCode: 200, message: 'Campus Care Platform operational', data: {
            uptime_seconds: Math.floor(process.uptime()),
            database: 'CONNECTED',
            replica_set: mongoose.connection.client?.topology?.description?.type || 'UNKNOWN',
            memory: {
                rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
                heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            },
            timestamp: new Date().toISOString(),
        },
    });
}