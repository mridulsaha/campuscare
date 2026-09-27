import ComplainCategory from '../models/complain.category.model.js';

class ComplainCategoryRepository {
    async create(payload, {session = null} = {}) {
        const [category] = await ComplainCategory.create([payload], {session});
        return category ? category.toObject({virtuals: true}) : null;
    }

    async findByCustomId(customId, {session = null, select = null, populate = false} = {}) {
        const query = ComplainCategory.findOne({
            $or: [{custom_id: customId}, {_id: customId}],
        }).select(select);
        if (populate) query.populate('subcategories');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async existsByCustomId(customId, {session = null} = {}) {
        return Boolean(await ComplainCategory.exists({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session));
    }

    async existsByTitle(title, {session = null} = {}) {
        return Boolean(await ComplainCategory.exists({
            title: title.toUpperCase().trim(),
        }).session(session));
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = {...filter};
        const sort = options.sort || cleanFilter.sort || {title: 1};
        const select = options.select || cleanFilter.select || null;
        const session = options.session || null;
        const populate = options.populate !== undefined ? Boolean(options.populate) : Boolean(cleanFilter.populate);

        delete cleanFilter.populate;
        delete cleanFilter.limit;
        delete cleanFilter.page;
        delete cleanFilter.sort;
        delete cleanFilter.select;

        const query = ComplainCategory.find(cleanFilter).select(select).sort(sort);
        if (populate) query.populate('subcategories');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async updateByCustomId(customId, payload, {session = null, select = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};

        const query = ComplainCategory.findOneAndUpdate({$or: [{custom_id: customId}, {_id: customId}]}, updateDoc, {
            returnDocument: 'after',
            runValidators: true,
            session
        }).select(select);
        return await query.lean({virtuals: true});
    }

    async updateById(id, payload, options = {}) {
        return await this.updateByCustomId(id, payload, options);
    }

    async updateMany(filter = {}, payload = {}, {session = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};
        return await ComplainCategory.updateMany(filter, updateDoc, {session});
    }

    async deleteByCustomId(customId, {session = null} = {}) {
        return await ComplainCategory.findOneAndDelete({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session).lean();
    }

    async deleteById(id, options = {}) {
        return await this.deleteByCustomId(id, options);
    }

    async deleteMany(filter = {}, {session = null} = {}) {
        return await ComplainCategory.deleteMany(filter, {session});
    }
}

export default new ComplainCategoryRepository();