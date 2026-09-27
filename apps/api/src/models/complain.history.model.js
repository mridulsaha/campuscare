import { Schema, model } from 'mongoose';

const complainHistorySchema = new Schema(
    {
        _id: {
            type: String,
            required: true,
        },
        custom_id: {
            type: String,
            default: function () {
                return this._id;
            },
            trim: true,
            uppercase: true,
            unique: true,
        },
        complain_id: {
            type: String,
            required: true,
            trim: true,
        },
        actor_id: {
            type: String,
            required: true,
            trim: true,
        },
        action: {
            type: String,
            enum: ['SUBMITTED', 'ASSIGNED', 'TRANSFERRED', 'STATUS_UPDATED', 'RESOLVED', 'REJECTED'],
            required: true,
        },
        previous_status: {
            type: String,
            default: null,
        },
        new_status: {
            type: String,
            default: null,
        },
        remarks: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
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

complainHistorySchema.index({ complain_id: 1, createdAt: 1 });
complainHistorySchema.index({ actor_id: 1, createdAt: -1 });

complainHistorySchema.virtual('complain', {
    ref: 'Complain',
    localField: 'complain_id',
    foreignField: '_id',
    justOne: true,
});

complainHistorySchema.virtual('actor', {
    ref: 'User',
    localField: 'actor_id',
    foreignField: '_id',
    justOne: true,
});

export default model('ComplainHistory', complainHistorySchema);