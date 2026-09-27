import User from '../models/user.model.js';

class UserRepository {
    async create(payload, {session = null} = {}) {
        const [user] = await User.create([payload], {session});
        return user ? user.toObject({virtuals: true}) : null;
    }

    async findByCustomId(customId, {session = null, select = null, populate = false} = {}) {
        if (!customId) return null;
        const query = User.findOne({
            $or: [{custom_id: customId}, {_id: customId}],
        }).select(select);
        if (populate) query.populate('department').populate('branch');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async findByEmail(email, {session = null, select = null, populate = false} = {}) {
        if (!email) return null;
        const query = User.findOne({email: email.toLowerCase().trim()}).select(select);
        if (populate) query.populate('department').populate('branch');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findByEnrollmentNumber(enrollment, {session = null, select = null, populate = false} = {}) {
        if (!enrollment) return null;
        const query = User.findOne({enrollment_number: enrollment.toUpperCase().trim()}).select(select);
        if (populate) query.populate('department').populate('branch');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async existsByCustomId(customId, {session = null} = {}) {
        if (!customId) return false;
        return Boolean(await User.exists({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session));
    }

    async existsByEmail(email, {session = null} = {}) {
        if (!email) return false;
        return Boolean(await User.exists({email: email.toLowerCase().trim()}).session(session));
    }

    async existsByEnrollmentNumber(enrollment, {session = null} = {}) {
        if (!enrollment) return false;
        return Boolean(await User.exists({enrollment_number: enrollment.toUpperCase().trim()}).session(session));
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = {...filter};
        const sort = options.sort || cleanFilter.sort || {createdAt: -1};
        const page = Math.max(Number(options.page || cleanFilter.page) || 1, 1);
        const requestedLimit = Number(options.limit !== undefined ? options.limit : cleanFilter.limit);
        const select = options.select || cleanFilter.select || null;
        const session = options.session || null;
        const populate = options.populate !== undefined ? Boolean(options.populate) : Boolean(cleanFilter.populate);

        delete cleanFilter.populate;
        delete cleanFilter.limit;
        delete cleanFilter.page;
        delete cleanFilter.sort;
        delete cleanFilter.select;

        const dataQuery = User.find(cleanFilter).sort(sort).select(select);
        let safeLimit = 0;

        if (requestedLimit > 0) {
            safeLimit = Math.min(requestedLimit, 500);
            const skip = (page - 1) * safeLimit;
            dataQuery.skip(skip).limit(safeLimit);
        }

        if (populate) dataQuery.populate('department').populate('branch');
        if (session) dataQuery.session(session);

        const countQuery = User.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const users = await dataQuery.lean({virtuals: true});
        const total = await countQuery;

        return {
            users, meta: {
                total,
                page,
                limit: safeLimit || total,
                total_pages: safeLimit > 0 ? Math.ceil(total / safeLimit) || 1 : 1,
            },
        };
    }

    async updateByCustomId(customId, payload, {session = null, select = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};

        const query = User.findOneAndUpdate({$or: [{custom_id: customId}, {_id: customId}]}, updateDoc, {
            new: true, returnDocument: 'after', runValidators: true, session
        }).select(select);
        return await query.lean({virtuals: true});
    }

    async updateById(id, payload, options = {}) {
        return await this.updateByCustomId(id, payload, options);
    }

    async updateMany(filter = {}, payload = {}, {session = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};
        return await User.updateMany(filter, updateDoc, {session});
    }

    async deleteByCustomId(customId, {session = null} = {}) {
        return await User.findOneAndDelete({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session).lean();
    }

    async deleteById(id, options = {}) {
        return await this.deleteByCustomId(id, options);
    }

    async deleteMany(filter = {}, {session = null} = {}) {
        return await User.deleteMany(filter, {session});
    }
}

export default new UserRepository();