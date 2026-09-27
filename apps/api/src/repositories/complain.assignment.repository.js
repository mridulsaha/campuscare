import ComplainAssignment from '../models/complain.assignment.model.js';

class ComplainAssignmentRepository {
    _populate(query) {
        query
            .populate('complain')
            .populate('assigner', 'custom_id full_name email role designation')
            .populate('respondent', 'custom_id full_name email role designation department_id');
    }

    async create(payload, { session = null } = {}) {
        const [assignment] = await ComplainAssignment.create([payload], { session });
        return assignment ? assignment.toObject({ virtuals: true }) : null;
    }

    async findByCustomId(customId, { session = null, select = null, populate = false } = {}) {
        const query = ComplainAssignment.findOne({
            $or: [{ custom_id: customId }, { _id: customId }],
        }).select(select);
        if (populate) this._populate(query);
        if (session) query.session(session);
        return await query.lean({ virtuals: true });
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async findActiveByComplainId(complainId, { session = null, select = null, populate = false } = {}) {
        const query = ComplainAssignment.findOne({ complain_id: complainId, is_active: true }).select(select);
        if (populate) this._populate(query);
        if (session) query.session(session);
        return await query.lean({ virtuals: true });
    }

    async findDistinctComplainIds(respondentIds = []) {
        if (!respondentIds || respondentIds.length === 0) return [];
        return await ComplainAssignment.distinct('complain_id', {
            respondent_id: { $in: respondentIds },
        });
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = { ...filter };
        const sort = options.sort || cleanFilter.sort || { createdAt: -1 };
        const select = options.select || cleanFilter.select || null;
        const session = options.session || null;
        const populate = options.populate !== undefined ? Boolean(options.populate) : Boolean(cleanFilter.populate);

        const safePage = Math.max(1, Number(options.page || cleanFilter.page) || 1);
        const rawLimit = options.limit !== undefined ? Number(options.limit) : Number(cleanFilter.limit);
        const safeLimit = Math.max(1, Math.min(isNaN(rawLimit) ? 20 : rawLimit, 100));

        delete cleanFilter.populate;
        delete cleanFilter.limit;
        delete cleanFilter.page;
        delete cleanFilter.sort;
        delete cleanFilter.select;

        const skip = (safePage - 1) * safeLimit;
        const dataQuery = ComplainAssignment.find(cleanFilter)
            .sort(sort)
            .select(select)
            .skip(skip)
            .limit(safeLimit);

        if (populate) this._populate(dataQuery);
        if (session) dataQuery.session(session);

        const countQuery = ComplainAssignment.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const [assignments, total] = await Promise.all([
            dataQuery.lean({ virtuals: true }),
            countQuery,
        ]);

        return {
            assignments,
            meta: {
                total,
                page: safePage,
                limit: safeLimit,
                total_pages: Math.ceil(total / safeLimit) || 1,
            },
        };
    }

    async updateMany(filter = {}, payload = {}, { session = null } = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : { $set: payload };
        return await ComplainAssignment.updateMany(filter, updateDoc, { session });
    }

    async deleteMany(filter = {}, { session = null } = {}) {
        return await ComplainAssignment.deleteMany(filter, { session });
    }
}

export default new ComplainAssignmentRepository();