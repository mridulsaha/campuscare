import { Schema, model } from 'mongoose';
import { VALID_ROLES, VALID_DESIGNATIONS } from '../configs/auth.config.js';

const userSchema = new Schema(
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
        full_name: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            uppercase: true,
            minlength: [2, 'Full name must be at least 2 characters'],
            maxlength: [100, 'Full name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email address is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: VALID_ROLES,
            lowercase: true,
            trim: true,
            required: true,
        },
        designation: {
            type: String,
            enum: VALID_DESIGNATIONS,
            lowercase: true,
            trim: true,
            default: null,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            lowercase: true,
            required: true,
        },
        is_profile_completed: {
            type: Boolean,
            default: false,
        },
        profile_locked: {
            type: Boolean,
            default: false,
        },
        enrollment_number: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },
        admission_year: {
            type: Number,
            min: 1990,
            max: 2050,
            default: null,
        },
        department_id: {
            type: String,
            default: null,
            trim: true,
        },
        branch_id: {
            type: String,
            default: null,
            trim: true,
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

userSchema.index({ role: 1, status: 1 });
userSchema.index({ department_id: 1, role: 1, status: 1 });
userSchema.index({ branch_id: 1, role: 1, status: 1 });
userSchema.index({ admission_year: 1, branch_id: 1, role: 1 });
userSchema.index({ designation: 1, department_id: 1 }, { sparse: true });
userSchema.index(
    { enrollment_number: 1 },
    {
        unique: true,
        partialFilterExpression: {
            enrollment_number: { $type: 'string', $gt: '' },
        },
    }
);

userSchema.virtual('department', {
    ref: 'Department',
    localField: 'department_id',
    foreignField: '_id',
    justOne: true,
});

userSchema.virtual('branch', {
    ref: 'Branch',
    localField: 'branch_id',
    foreignField: '_id',
    justOne: true,
});

export default model('User', userSchema);