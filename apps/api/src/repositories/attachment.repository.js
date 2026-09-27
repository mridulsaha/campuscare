import Attachment from '../models/attachment.model.js';

class AttachmentRepository {
    async create(payload, {session = null} = {}) {
        const [attachment] = await Attachment.create([payload], {session});
        return attachment ? attachment.toObject({virtuals: true}) : null;
    }

    async insertMany(payloads = [], {session = null} = {}) {
        return await Attachment.insertMany(payloads, {session});
    }

    async find(filter = {}, {session = null} = {}) {
        const query = Attachment.find(filter);
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findByComplainId(complainId, {session = null} = {}) {
        const filter = Array.isArray(complainId) ? {complain_id: {$in: complainId}} : {complain_id: complainId};

        const query = Attachment.find(filter);
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async deleteMany(filter = {}, {session = null} = {}) {
        return await Attachment.deleteMany(filter, {session});
    }
}

export default new AttachmentRepository();