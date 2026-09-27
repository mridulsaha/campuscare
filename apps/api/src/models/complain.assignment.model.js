import { Schema, model } from 'mongoose';

const complainAssignmentSchema = new Schema(
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
            required: [true, 'Complaint ID is required'],
            trim: true,
        },
        assigner_id: {
            type: String,
            required: [true, 'Assigner ID is required'],
            trim: true,
        },
        respondent_id: {
            type: String,
            required: [true, 'Respondent ID is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Assignment note or operational delegation instructions required'],
            trim: true,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
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

complainAssignmentSchema.index({ respondent_id: 1, is_active: 1, createdAt: -1 });
complainAssignmentSchema.index({ complain_id: 1, is_active: 1 });
complainAssignmentSchema.index({ complain_id: 1, createdAt: -1 });
complainAssignmentSchema.index({ assigner_id: 1, createdAt: -1 });

complainAssignmentSchema.virtual('complain', {
    ref: 'Complain',
    localField: 'complain_id',
    foreignField: '_id',
    justOne: true,
});

complainAssignmentSchema.virtual('assigner', {
    ref: 'User',
    localField: 'assigner_id',
    foreignField: '_id',
    justOne: true,
});

complainAssignmentSchema.virtual('respondent', {
    ref: 'User',
    localField: 'respondent_id',
    foreignField: '_id',
    justOne: true,
});

export default model('ComplainAssignment', complainAssignmentSchema);