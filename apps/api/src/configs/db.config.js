import mongoose from 'mongoose';

export default async function connectDB() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('FATAL: MONGO_URI is not defined in environment variables.');
    }
    await mongoose.connect(mongoUri, {
        autoIndex: true,
    });
}