import jwt from 'jsonwebtoken';

class JWTService {
    generateToken(payload) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is missing from environment variables.');
        }

        const options = {
            expiresIn: process.env.JWT_EXPIRY || '7d', issuer: process.env.DOMAIN_NAME || 'mitsgwalior.in',
        };

        const cleanPayload = {
            id: payload.custom_id || payload.id || payload._id,
            email: payload.email || null,
            full_name: payload.full_name || null,
            enrollment_number: payload.enrollment_number || null,
            role: payload.role,
            designation: payload.designation || null,
            department_id: payload.department_id || null,
            branch_id: payload.branch_id || null,
        };

        return jwt.sign(cleanPayload, secret, options);
    }

    verifyToken(token) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is missing from environment variables.');
        }

        const options = {
            issuer: process.env.DOMAIN_NAME || 'mitsgwalior.in',
        };

        return jwt.verify(token, secret, options);
    }
}

export default new JWTService();