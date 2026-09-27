import {Schema, model} from 'mongoose';

const attachmentSchema = new Schema({
    _id: {
        type: String, required: true,
    }, complain_id: {
        type: String, required: true, ref: 'Complain', index: true,
    }, file_name: {
        type: String, trim: true, required: true,
    }, file_type: {
        type: String, trim: true, uppercase: true, required: true,
    }, file_url: {
        type: String, trim: true, required: true,
    }, public_id: {
        type: String, required: [true, 'Cloudinary public_id is required'], trim: true,
    },
}, {
    timestamps: true, toJSON: {
        virtuals: true, transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret.__v;
            return ret;
        },
    }, toObject: {virtuals: true},
});

export default model('Attachment', attachmentSchema);