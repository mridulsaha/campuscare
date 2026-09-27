import { Schema, model } from 'mongoose';

const programmeSchema = new Schema(
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
        programme_code: {
            type: String,
            required: [true, 'Programme code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [2, 'Programme code must be at least 2 characters'],
            maxlength: [20, 'Programme code cannot exceed 20 characters'],
        },
        programme_name: {
            type: String,
            required: [true, 'Programme name is required'],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [2, 'Programme name must be at least 2 characters'],
            maxlength: [150, 'Programme name cannot exceed 150 characters'],
        },
        duration_year: {
            type: Number,
            required: [true, 'Programme duration in years is required'],
            min: 1,
            max: 10,
        },
        total_semester: {
            type: Number,
            required: [true, 'Total semesters count is required'],
            min: 1,
            max: 20,
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

programmeSchema.index({ status: 1, programme_name: 1 });

programmeSchema.virtual('branches', {
    ref: 'Branch',
    localField: '_id',
    foreignField: 'programme_id',
});

export default model('Programme', programmeSchema);