import { Schema, model } from 'mongoose';

const complainSubcategorySchema = new Schema(
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
        title: {
            type: String,
            required: [true, 'Subcategory title is required'],
            uppercase: true,
            trim: true,
        },
        category_id: {
            type: String,
            required: [true, 'Category ID is required'],
            trim: true,
        },
        target_audience: {
            type: String,
            enum: ['student', 'faculty', 'all'],
            required: [true, 'Target audience is required'],
            lowercase: true,
            trim: true,
            default: 'all',
        },
        default_priority: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'MEDIUM',
            uppercase: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
            maxlength: [500, 'Description cannot exceed 500 characters'],
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

complainSubcategorySchema.index(
    { category_id: 1, title: 1, target_audience: 1 },
    { unique: true }
);
complainSubcategorySchema.index({ category_id: 1, status: 1, target_audience: 1 });
complainSubcategorySchema.index({ status: 1, title: 1 });

complainSubcategorySchema.virtual('category', {
    ref: 'ComplainCategory',
    localField: 'category_id',
    foreignField: '_id',
    justOne: true,
});

export default model('ComplainSubcategory', complainSubcategorySchema);