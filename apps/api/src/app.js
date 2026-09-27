import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mainRoutes from './routes/main.route.js';
import errorHandler from './middlewares/error.middleware.js';
import {getHealthStatus} from './controllers/health.controller.js';
import {rateLimiter} from './middlewares/rate.limiter.middleware.js';
import {httpLogger, contextMiddleware} from './middlewares/logging.middleware.js';

const app = express();

app.set('trust proxy', true);

app.use(cors({
    origin: process.env.FRONTEND_DOMAIN_NAME,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use(cookieParser());

app.use(contextMiddleware);
app.use(httpLogger);

app.get('/api/v1/health', rateLimiter({max: 100}), getHealthStatus);

app.use('/api/v1', rateLimiter({max: 100}), mainRoutes);

app.use(errorHandler);

export default app;