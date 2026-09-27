import Programme from '../models/programme.model.js';

class ProgrammeRepository {
    async create(payload, {session = null} = {}) {
        const [programme] = await Programme.create([payload], {session});
        return programme ? programme.toObject({virtuals: true}) : null;
    }

    async findByCustomId(customId, {session = null, select = null, populate = false} = {}) {
        const query = Programme.findOne({
            $or: [{custom_id: customId}, {_id: customId}],
        }).select(select);
        if (populate) query.populate('branches');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async findByCode(code, {session = null, select = null} = {}) {
        const query = Programme.findOne({programme_code: code.toUpperCase().trim()}).select(select);
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findByName(name, {session = null, select = null} = {}) {
        const query = Programme.findOne({programme_name: name.toUpperCase().trim()}).select(select);
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async existsByCustomId(customId, {session = null} = {}) {
        return Boolean(await Programme.exists({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session));
    }

    async existsById(id, {session = null} = {}) {
        return await this.existsByCustomId(id, {session});
    }

    async existsByCode(code, {session = null} = {}) {
        return Boolean(await Programme.exists({programme_code: code.toUpperCase().trim()}).session(session));
    }

    async existsByName(name, {session = null} = {}) {
        return Boolean(await Programme.exists({programme_name: name.toUpperCase().trim()}).session(session));
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = {...filter};
        const sort = options.sort || cleanFilter.sort || {programme_code: 1};
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

        const dataQuery = Programme.find(cleanFilter).sort(sort).select(select);
        let safeLimit = 0;

        if (requestedLimit > 0) {
            safeLimit = Math.min(requestedLimit, 500);
            const skip = (page - 1) * safeLimit;
            dataQuery.skip(skip).limit(safeLimit);
        }

        if (populate) dataQuery.populate('branches');
        if (session) dataQuery.session(session);

        const countQuery = Programme.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const programmes = await dataQuery.lean({virtuals: true});
        const total = await countQuery;

        return {
            programmes, meta: {
                total,
                page,
                limit: safeLimit || total,
                total_pages: safeLimit > 0 ? Math.ceil(total / safeLimit) || 1 : 1,
            },
        };
    }

    async updateByCustomId(customId, payload, {session = null, select = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};

        const query = Programme.findOneAndUpdate({$or: [{custom_id: customId}, {_id: customId}]}, updateDoc, {
            returnDocument: 'after',
            runValidators: true,
            session
        }).select(select);
        return await query.lean({virtuals: true});
    }

    async updateById(id, payload, options = {}) {
        return await this.updateByCustomId(id, payload, options);
    }

    async deleteByCustomId(customId, {session = null} = {}) {
        return await Programme.findOneAndDelete({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session).lean();
    }

    async deleteById(id, options = {}) {
        return await this.deleteByCustomId(id, options);
    }
}

export default new ProgrammeRepository();