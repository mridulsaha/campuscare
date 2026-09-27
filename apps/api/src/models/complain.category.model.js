import { Schema, model } from 'mongoose';

const complainCategorySchema = new Schema(
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
            required: [true, 'Category title is required'],
            uppercase: true,
            trim: true,
            unique: true,
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

complainCategorySchema.index({ status: 1, title: 1 });

complainCategorySchema.virtual('subcategories', {
    ref: 'ComplainSubcategory',
    localField: '_id',
    foreignField: 'category_id',
});

export default model('ComplainCategory', complainCategorySchema);