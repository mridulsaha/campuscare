import googleClient from '../configs/google.config.js';

class GoogleService {
    async verifyToken(token) {
        const ticket = await googleClient.verifyIdToken({
            idToken: token, audience: googleClient._clientId || process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email_verified) {
            const err = new Error('Google email identity could not be verified.');
            err.statusCode = 401;
            throw err;
        }

        return {
            email: payload.email.toLowerCase().trim(), name: payload.name || '',
        };
    }
}

export default new GoogleService();