import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './configs/db.config.js';
import {startupSeed} from './scripts/startup.js';
import {startEscalationCron} from './cron/escalation.cron.js';
import {startStudentLifecycleCron} from './cron/student.lifecycle.cron.js';
import {startDailyDigestCron} from './cron/daily.digest.cron.js';

const PORT = Number(process.env.PORT) || 3000;
let serverInstance = null;
let isShuttingDown = false;

async function startServer() {
    try {
        await connectDB();
        await startupSeed();

        if (process.env.RUN_CRON !== 'false') {
            startEscalationCron();
            startStudentLifecycleCron();
            startDailyDigestCron();
        }

        serverInstance = app.listen(PORT, () => {
            console.log(`[Campus Care API] Server operational on port ${PORT}`);
        });
    } catch (err) {
        console.error('[Campus Care API] Fatal error during startup:', err);
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    const forceExitTimeout = setTimeout(() => {
        process.exit(1);
    }, 10000);
    forceExitTimeout.unref();

    if (serverInstance) {
        serverInstance.close(async () => {
            try {
                await mongoose.connection.close(false);
                process.exit(0);
            } catch (err) {
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('[Campus Care API] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Campus Care API] Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

await startServer();