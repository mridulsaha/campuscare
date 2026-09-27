import ComplainHistory from '../models/complain.history.model.js';

class ComplainHistoryRepository {
    async create(payload, { session = null } = {}) {
        const [history] = await ComplainHistory.create([payload], { session });
        return history ? history.toObject({ virtuals: true }) : null;
    }

    async findByComplainId(complainId, { session = null } = {}) {
        const query = ComplainHistory.find({ complain_id: complainId })
            .sort({ createdAt: 1 })
            .populate('actor', 'custom_id full_name email role designation');
        if (session) query.session(session);
        return await query.lean({ virtuals: true });
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = { ...filter };
        const sort = options.sort || cleanFilter.sort || { createdAt: -1 };
        const page = Math.max(Number(options.page || cleanFilter.page) || 1, 1);
        const requestedLimit = Number(options.limit !== undefined ? options.limit : cleanFilter.limit);
        const select = options.select || cleanFilter.select || null;
        const session = options.session || null;

        delete cleanFilter.populate;
        delete cleanFilter.limit;
        delete cleanFilter.page;
        delete cleanFilter.sort;
        delete cleanFilter.select;

        const dataQuery = ComplainHistory.find(cleanFilter).sort(sort).select(select);
        let safeLimit = 0;

        if (requestedLimit > 0) {
            safeLimit = Math.min(requestedLimit, 500);
            const skip = (page - 1) * safeLimit;
            dataQuery.skip(skip).limit(safeLimit);
        }

        dataQuery.populate('actor', 'custom_id full_name email role designation');
        if (session) dataQuery.session(session);

        const countQuery = ComplainHistory.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const history = await dataQuery.lean({ virtuals: true });
        const total = await countQuery;

        return {
            history,
            meta: {
                total,
                page,
                limit: safeLimit || total,
                total_pages: safeLimit > 0 ? Math.ceil(total / safeLimit) || 1 : 1,
            },
        };
    }

    async deleteMany(filter = {}, { session = null } = {}) {
        return await ComplainHistory.deleteMany(filter, { session });
    }
}

export default new ComplainHistoryRepository();