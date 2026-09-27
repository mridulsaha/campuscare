import ComplainSubcategory from '../models/complain.subcategory.model.js';

class ComplainSubcategoryRepository {
    async create(payload, {session = null} = {}) {
        const [subcategory] = await ComplainSubcategory.create([payload], {session});
        return subcategory ? subcategory.toObject({virtuals: true}) : null;
    }

    async findByCustomId(customId, {session = null, select = null, populate = false} = {}) {
        const query = ComplainSubcategory.findOne({
            $or: [{custom_id: customId}, {_id: customId}],
        }).select(select);
        if (populate) query.populate('category');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async existsByCustomId(customId, {session = null} = {}) {
        return Boolean(await ComplainSubcategory.exists({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session));
    }

    async existsByCategoryIdAndTitle(categoryId, title, {session = null} = {}) {
        return Boolean(await ComplainSubcategory.exists({
            category_id: categoryId, title: title.toUpperCase().trim(),
        }).session(session));
    }

    async existsByCategoryIdTitleAndAudience(categoryId, title, audience, {session = null} = {}) {
        return Boolean(await ComplainSubcategory.exists({
            category_id: categoryId, title: title.toUpperCase().trim(), target_audience: audience.toLowerCase().trim(),
        }).session(session));
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = {...filter};
        const sort = options.sort || cleanFilter.sort || {title: 1};
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

        const dataQuery = ComplainSubcategory.find(cleanFilter).select(select).sort(sort);
        let safeLimit = 0;

        if (requestedLimit > 0) {
            safeLimit = Math.min(requestedLimit, 500);
            const skip = (page - 1) * safeLimit;
            dataQuery.skip(skip).limit(safeLimit);
        }

        if (populate) dataQuery.populate('category');
        if (session) dataQuery.session(session);

        const countQuery = ComplainSubcategory.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const subcategories = await dataQuery.lean({virtuals: true});
        const total = await countQuery;

        return {
            subcategories, meta: {
                total,
                page,
                limit: safeLimit || total,
                total_pages: safeLimit > 0 ? Math.ceil(total / safeLimit) || 1 : 1,
            },
        };
    }

    async updateByCustomId(customId, payload, {session = null, select = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};

        const query = ComplainSubcategory.findOneAndUpdate({$or: [{custom_id: customId}, {_id: customId}]}, updateDoc, {
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
        return await ComplainSubcategory.updateMany(filter, updateDoc, {session});
    }

    async deleteByCustomId(customId, {session = null} = {}) {
        return await ComplainSubcategory.findOneAndDelete({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session).lean();
    }

    async deleteById(id, options = {}) {
        return await this.deleteByCustomId(id, options);
    }

    async deleteMany(filter = {}, {session = null} = {}) {
        return await ComplainSubcategory.deleteMany(filter, {session});
    }
}

export default new ComplainSubcategoryRepository();