import crypto from 'crypto';
import api from '../services/api';

export async function uploadToCloudinary(file) {
    const res = await api.get('/complain/upload-signature');
    const {timestamp, folder, signature, api_key, cloud_name} = res.data;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', api_key);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const cloudUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`;

    const response = await fetch(cloudUrl, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error?.message || 'Cloudinary upload failed');
    }

    const result = await response.json();

    const fileName = file?.name?.includes('.') ? file?.name?.slice(0, file?.name?.indexOf('.')) : file?.name || crypto.randomUUID();

    return {
        public_id: result.public_id,
        file_name: fileName,
        file_type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
        file_url: result.secure_url,
    };
}