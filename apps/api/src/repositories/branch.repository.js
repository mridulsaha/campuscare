import Branch from '../models/branch.model.js';

class BranchRepository {
    async create(payload, {session = null} = {}) {
        const [branch] = await Branch.create([payload], {session});
        return branch ? branch.toObject({virtuals: true}) : null;
    }

    async findByCustomId(customId, {session = null, select = null, populate = false} = {}) {
        const query = Branch.findOne({
            $or: [{custom_id: customId}, {_id: customId}],
        }).select(select);
        if (populate) query.populate('department').populate('programme');
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async findByCode(code, {session = null, select = null} = {}) {
        const query = Branch.findOne({branch_code: code.toUpperCase().trim()}).select(select);
        if (session) query.session(session);
        return await query.lean({virtuals: true});
    }

    async existsByCustomId(customId, {session = null} = {}) {
        return Boolean(await Branch.exists({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session));
    }

    async existsByCode(code, {session = null} = {}) {
        return Boolean(await Branch.exists({branch_code: code.toUpperCase().trim()}).session(session));
    }

    async existsByNameInDepartmentAndProgramme(departmentId, programmeId, branchName, {session = null} = {}) {
        return Boolean(await Branch.exists({
            department_id: departmentId, programme_id: programmeId, branch_name: branchName.toUpperCase().trim(),
        }).session(session));
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = {...filter};
        const sort = options.sort || cleanFilter.sort || {branch_code: 1};
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

        const dataQuery = Branch.find(cleanFilter).sort(sort).select(select);
        let safeLimit = 0;

        if (requestedLimit > 0) {
            safeLimit = Math.min(requestedLimit, 500);
            const skip = (page - 1) * safeLimit;
            dataQuery.skip(skip).limit(safeLimit);
        }

        if (populate) dataQuery.populate('department').populate('programme');
        if (session) dataQuery.session(session);

        const countQuery = Branch.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const branches = await dataQuery.lean({virtuals: true});
        const total = await countQuery;

        return {
            branches, meta: {
                total,
                page,
                limit: safeLimit || total,
                total_pages: safeLimit > 0 ? Math.ceil(total / safeLimit) || 1 : 1,
            },
        };
    }

    async updateByCustomId(customId, payload, {session = null, select = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};

        const query = Branch.findOneAndUpdate({$or: [{custom_id: customId}, {_id: customId}]}, updateDoc, {
            returnDocument: 'after', runValidators: true, session
        }).select(select);
        return await query.lean({virtuals: true});
    }

    async updateById(id, payload, options = {}) {
        return await this.updateByCustomId(id, payload, options);
    }

    async updateMany(filter = {}, payload = {}, {session = null} = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : {$set: payload};
        return await Branch.updateMany(filter, updateDoc, {session});
    }

    async deleteByCustomId(customId, {session = null} = {}) {
        return await Branch.findOneAndDelete({
            $or: [{custom_id: customId}, {_id: customId}],
        }).session(session).lean();
    }

    async deleteById(id, options = {}) {
        return await this.deleteByCustomId(id, options);
    }

    async deleteMany(filter = {}, {session = null} = {}) {
        return await Branch.deleteMany(filter, {session});
    }
}

export default new BranchRepository();