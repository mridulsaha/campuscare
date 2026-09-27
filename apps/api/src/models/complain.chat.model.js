import { Schema, model } from 'mongoose';

const ChatSchema = new Schema(
    {
        _id: { type: String, required: true },
        custom_id: { type: String, required: true, index: true },
        complain_id: { type: String, required: true, index: true },
        sender_id: { type: String, required: true, index: true },
        message: { type: String, required: true, trim: true, maxlength: 3000 },
        is_system_message: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                ret.id = ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: { virtuals: true },
    }
);

ChatSchema.virtual('sender', {
    ref: 'User',
    localField: 'sender_id',
    foreignField: '_id',
    justOne: true,
});

ChatSchema.virtual('complain', {
    ref: 'Complain',
    localField: 'complain_id',
    foreignField: '_id',
    justOne: true,
});

ChatSchema.index({ complain_id: 1, createdAt: 1 });

const ComplainChat = model('ComplainChat', ChatSchema);
export default ComplainChat;