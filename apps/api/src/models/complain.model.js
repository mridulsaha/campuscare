import { Schema, model } from 'mongoose';

const complainSchema = new Schema(
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
        ticket_number: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        ticket_type: {
            type: String,
            enum: ['DIRECT_QUERY', 'STATUTORY_GRIEVANCE'],
            default: 'STATUTORY_GRIEVANCE',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Grievance title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Grievance description is required'],
            trim: true,
        },
        target_department_id: {
            type: String,
            required: [true, 'Target department is required'],
            trim: true,
        },
        target_user_id: {
            type: String,
            default: null,
            trim: true,
            uppercase: true,
        },
        complainant_department_id: {
            type: String,
            required: [true, 'Complainant home department is required'],
            trim: true,
        },
        branch_id: {
            type: String,
            default: null,
            trim: true,
        },
        programme_id: {
            type: String,
            default: null,
            trim: true,
        },
        category_id: {
            type: String,
            required: [true, 'Grievance category is required'],
            trim: true,
        },
        subcategory_id: {
            type: String,
            required: [true, 'Grievance subcategory is required'],
            trim: true,
        },
        complainant_id: {
            type: String,
            required: [true, 'Complainant identifier is required'],
            trim: true,
        },
        complainant_role: {
            type: String,
            enum: ['student', 'faculty', 'admin'],
            required: true,
        },
        priority: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'MEDIUM',
            uppercase: true,
        },
        status: {
            type: String,
            enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'],
            default: 'PENDING',
            required: true,
        },
        status_description: {
            type: String,
            required: true,
            default: 'Grievance registered and queued for review',
        },
        is_sla_breached: {
            type: Boolean,
            default: false,
        },
        is_anonymous: {
            type: Boolean,
            required: true,
            default: false,
        },
        active_respondent_id: {
            type: String,
            default: null,
            trim: true,
        },
        resolution_details: {
            resolved_by: { type: String, default: null, trim: true },
            resolved_at: { type: Date, default: null },
            remarks: { type: String, default: null, trim: true },
        },
        rejection_details: {
            rejected_by: { type: String, default: null, trim: true },
            rejected_at: { type: Date, default: null },
            remarks: { type: String, default: null, trim: true },
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

complainSchema.index({ target_department_id: 1, status: 1, createdAt: -1 });
complainSchema.index({ target_department_id: 1, complainant_role: 1, status: 1, createdAt: -1 });
complainSchema.index({ complainant_department_id: 1, status: 1, createdAt: -1 });
complainSchema.index({ complainant_department_id: 1, complainant_role: 1, status: 1, createdAt: -1 });
complainSchema.index({ complainant_id: 1, createdAt: -1 });
complainSchema.index({ active_respondent_id: 1, status: 1, createdAt: -1 });
complainSchema.index({ status: 1, is_sla_breached: 1, createdAt: -1 });
complainSchema.index({ ticket_type: 1, status: 1, createdAt: -1 });
complainSchema.index({ category_id: 1, subcategory_id: 1, status: 1 });
complainSchema.index({ branch_id: 1, status: 1, createdAt: -1 });
complainSchema.index({ programme_id: 1, status: 1, createdAt: -1 });
complainSchema.index({ priority: 1, status: 1, createdAt: -1 });
complainSchema.index({ target_user_id: 1, createdAt: -1 }, { sparse: true });
complainSchema.index({ 'resolution_details.resolved_by': 1, status: 1 }, { sparse: true });
complainSchema.index({ 'rejection_details.rejected_by': 1, status: 1 }, { sparse: true });

complainSchema.virtual('complainant', {
    ref: 'User',
    localField: 'complainant_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('active_respondent', {
    ref: 'User',
    localField: 'active_respondent_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('target_user', {
    ref: 'User',
    localField: 'target_user_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('target_department', {
    ref: 'Department',
    localField: 'target_department_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('complainant_department', {
    ref: 'Department',
    localField: 'complainant_department_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('branch', {
    ref: 'Branch',
    localField: 'branch_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('programme', {
    ref: 'Programme',
    localField: 'programme_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('category', {
    ref: 'ComplainCategory',
    localField: 'category_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('subcategory', {
    ref: 'ComplainSubcategory',
    localField: 'subcategory_id',
    foreignField: '_id',
    justOne: true,
});

complainSchema.virtual('attachments', {
    ref: 'Attachment',
    localField: '_id',
    foreignField: 'complain_id',
});

complainSchema.virtual('assignments', {
    ref: 'ComplainAssignment',
    localField: '_id',
    foreignField: 'complain_id',
});

complainSchema.virtual('history', {
    ref: 'ComplainHistory',
    localField: '_id',
    foreignField: 'complain_id',
});

export default model('Complain', complainSchema);