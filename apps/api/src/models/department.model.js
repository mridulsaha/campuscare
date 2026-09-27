import { Schema, model } from 'mongoose';

const departmentSchema = new Schema(
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
        department_code: {
            type: String,
            required: [true, 'Department code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [2, 'Department code must be at least 2 characters'],
            maxlength: [20, 'Department code cannot exceed 20 characters'],
        },
        department_name: {
            type: String,
            required: [true, 'Department name is required'],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [2, 'Department name must be at least 2 characters'],
            maxlength: [150, 'Department name cannot exceed 150 characters'],
        },
        department_head_id: {
            type: String,
            default: null,
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

departmentSchema.index({ status: 1, department_name: 1 });
departmentSchema.index({ department_head_id: 1 }, { sparse: true });

departmentSchema.virtual('department_head', {
    ref: 'User',
    localField: 'department_head_id',
    foreignField: '_id',
    justOne: true,
});

departmentSchema.virtual('branches', {
    ref: 'Branch',
    localField: '_id',
    foreignField: 'department_id',
});

departmentSchema.virtual('faculties', {
    ref: 'User',
    localField: '_id',
    foreignField: 'department_id',
    match: { role: { $in: ['faculty', 'hod'] } },
});

export default model('Department', departmentSchema);