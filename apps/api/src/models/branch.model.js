import { Schema, model } from 'mongoose';

const branchSchema = new Schema(
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
        branch_code: {
            type: String,
            required: [true, 'Branch code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [2, 'Branch code must be at least 2 characters'],
            maxlength: [20, 'Branch code cannot exceed 20 characters'],
        },
        branch_name: {
            type: String,
            required: [true, 'Branch name is required'],
            trim: true,
            uppercase: true,
            minlength: [2, 'Branch name must be at least 2 characters'],
            maxlength: [150, 'Branch name cannot exceed 150 characters'],
        },
        department_id: {
            type: String,
            required: [true, 'Department ID is required'],
            trim: true,
        },
        programme_id: {
            type: String,
            required: [true, 'Programme ID is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            lowercase: true,
            required: true,
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

branchSchema.index({ department_id: 1, programme_id: 1, branch_name: 1 }, { unique: true });
branchSchema.index({ department_id: 1, status: 1 });
branchSchema.index({ programme_id: 1, status: 1 });

branchSchema.virtual('department', {
    ref: 'Department',
    localField: 'department_id',
    foreignField: '_id',
    justOne: true,
});

branchSchema.virtual('programme', {
    ref: 'Programme',
    localField: 'programme_id',
    foreignField: '_id',
    justOne: true,
});

export default model('Branch', branchSchema);