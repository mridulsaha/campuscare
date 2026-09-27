import nodemailer from 'nodemailer';
import {logger} from './logger.js';

let transporter = null;

function getTransporter() {
    if (!transporter) {
        const {SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE} = process.env;

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            console.warn('Email service requested but SMTP credentials are incomplete in environment variables.');
            logger.warn('Email service requested but SMTP credentials are incomplete in environment variables.');
            return null;
        }

        const port = Number(SMTP_PORT) || 587;
        const secure = SMTP_SECURE !== undefined ? SMTP_SECURE === 'true' : port === 465;

        transporter = nodemailer.createTransport({
            host: SMTP_HOST, port, secure, auth: {
                user: SMTP_USER, pass: SMTP_PASS,
            },
        });
    }
    return transporter;
}

export function sendEmailAsync({to, subject, html, text}) {
    if (!to) {
        console.warn('sendEmailAsync called without recipient address');
        logger.warn('sendEmailAsync called without recipient address');
        return;
    }

    if (process.env.ENABLE_EMAIL !== 'true') {
        return;
    }

    setImmediate(async () => {
        try {
            const client = getTransporter();
            if (!client) return;

            const info = await client.sendMail({
                from: process.env.EMAIL_FROM || `"Campus Care" <${process.env.SMTP_USER}>`,
                to,
                subject,
                text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
                html,
            });
            console.info({messageId: info.messageId, to, subject}, 'Email dispatched successfully');
            logger.info({messageId: info.messageId, to, subject}, 'Email dispatched successfully');
        } catch (err) {
            console.log({err, to, subject}, 'Failed to dispatch async email notification');
            logger.error({err, to, subject}, 'Failed to dispatch async email notification');
        }
    });
}