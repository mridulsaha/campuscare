import crypto from 'crypto';
import cloudinary from '../configs/cloudinary.config.js';

export function generateDirectUploadSignature(folder = 'campuscare/attachments') {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
        const err = new Error('Cloudinary credentials are not configured in environment');
        err.statusCode = 500;
        throw err;
    }

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    return {
        timestamp, folder, signature, api_key: apiKey, cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'campuscare',
    };
}

export async function deleteCloudinaryAssets(publicIds = []) {
    if (!Array.isArray(publicIds) || publicIds.length === 0) return;

    const chunks = [];
    for (let i = 0; i < publicIds.length; i += 100) {
        chunks.push(publicIds.slice(i, i + 100));
    }

    for (const chunk of chunks) {
        await Promise.allSettled([cloudinary.api.delete_resources(chunk, {
            resource_type: 'image', invalidate: true
        }), cloudinary.api.delete_resources(chunk, {resource_type: 'raw', invalidate: true}),]);
    }
}