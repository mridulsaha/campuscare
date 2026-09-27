import mongoose from 'mongoose';
import branchRepository from '../repositories/branch.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import programmeRepository from '../repositories/programme.repository.js';
import userRepository from '../repositories/user.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import {generateCustomId} from '../utils/id.generator.js';
import {sanitizeString, validateCode} from '../utils/validator.js';

class BranchService {
    #buildBranchQueryFilter(baseFilter = {}, query = {}) {
        const filter = {...baseFilter};

        if (query.branch_code || query.code) {
            filter.branch_code = sanitizeString(query.branch_code || query.code, {uppercase: true});
        }

        if (query.department_id) {
            filter.department_id = sanitizeString(query.department_id, {uppercase: true});
        }

        if (query.programme_id) {
            filter.programme_id = sanitizeString(query.programme_id, {uppercase: true});
        }

        if (query.status) {
            const status = sanitizeString(query.status, {lowercase: true});
            if (['active', 'inactive'].includes(status)) {
                filter.status = status;
            }
        }

        const afterDate = query.created_after || query.from_date || query.after;
        const beforeDate = query.created_before || query.to_date || query.before;

        if (afterDate || beforeDate) {
            filter.createdAt = {};
            if (afterDate) {
                const parsedAfter = new Date(afterDate);
                if (!Number.isNaN(parsedAfter.getTime())) filter.createdAt.$gte = parsedAfter;
            }
            if (beforeDate) {
                const parsedBefore = new Date(beforeDate);
                if (!Number.isNaN(parsedBefore.getTime())) filter.createdAt.$lte = parsedBefore;
            }
        }

        return filter;
    }

    #buildSortOrder(query = {}) {
        let sort = {branch_code: 1};

        if (query.sort_by) {
            const direction = query.order?.toLowerCase() === 'desc' || query.sort_order?.toLowerCase() === 'desc' ? -1 : 1;

            switch (query.sort_by.toLowerCase()) {
                case 'code':
                case 'branch_code':
                    sort = {branch_code: direction};
                    break;
                case 'name':
                case 'branch_name':
                    sort = {branch_name: direction};
                    break;
                case 'department':
                case 'department_id':
                    sort = {department_id: direction, branch_code: 1};
                    break;
                case 'programme':
                case 'programme_id':
                    sort = {programme_id: direction, branch_code: 1};
                    break;
                case 'status':
                    sort = {status: direction, branch_code: 1};
                    break;
                case 'newest':
                case 'time_desc':
                    sort = {createdAt: -1};
                    break;
                case 'oldest':
                case 'time_asc':
                    sort = {createdAt: 1};
                    break;
                case 'updated':
                    sort = {updatedAt: direction};
                    break;
                default:
                    sort = {[query.sort_by]: direction};
                    break;
            }
        }

        return sort;
    }

    async create(payload) {
        const code = validateCode(payload.branch_code, 'Branch code');
        const name = sanitizeString(payload.branch_name, {minLength: 2, maxLength: 150, uppercase: true});
        const departmentId = sanitizeString(payload.department_id, {uppercase: true});
        const programmeId = sanitizeString(payload.programme_id, {uppercase: true});

        const [branchCodeExists, deptExists, progExists, nameExistsInDeptAndProg] = await Promise.all([branchRepository.existsByCode(code), departmentRepository.existsById(departmentId), programmeRepository.existsById(programmeId), branchRepository.existsByNameInDepartmentAndProgramme(departmentId, programmeId, name),]);

        if (branchCodeExists) {
            const err = new Error(`Branch with code "${code}" already exists`);
            err.statusCode = 409;
            throw err;
        }

        if (!deptExists) {
            const err = new Error(`Department "${departmentId}" does not exist`);
            err.statusCode = 404;
            throw err;
        }

        if (!progExists) {
            const err = new Error(`Programme "${programmeId}" does not exist`);
            err.statusCode = 404;
            throw err;
        }

        if (nameExistsInDeptAndProg) {
            const err = new Error(`Branch name "${name}" already exists in the selected Department and Programme`);
            err.statusCode = 409;
            throw err;
        }

        const generatedId = await generateCustomId('BRN');

        return await branchRepository.create({
            _id: generatedId,
            custom_id: generatedId,
            branch_code: code,
            branch_name: name,
            department_id: departmentId,
            programme_id: programmeId,
            status: payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase()) ? payload.status.toLowerCase() : 'active',
        });
    }

    async getById(id, options = {}) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const branch = await branchRepository.findById(cleanId, options);
        if (!branch) {
            const err = new Error(`Branch "${cleanId}" not found`);
            err.statusCode = 404;
            throw err;
        }
        return branch;
    }

    async getAll(query = {}, options = {}) {
        const filter = this.#buildBranchQueryFilter({}, query);
        const sort = options.sort || this.#buildSortOrder(query);

        return await branchRepository.find(filter, {
            page: query.page || options.page,
            limit: query.limit !== undefined ? query.limit : (options.limit !== undefined ? options.limit : 0),
            sort,
            select: options.select || null,
            populate: query.populate === 'true' || options.populate === true,
            session: options.session || null,
        });
    }

    async updateById(id, payload) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const existingBranch = await this.getById(cleanId);

        const updateDoc = {};

        if (payload.branch_name) {
            const name = sanitizeString(payload.branch_name, {minLength: 2, maxLength: 150, uppercase: true});
            if (name !== existingBranch.branch_name) {
                const nameTaken = await branchRepository.existsByNameInDepartmentAndProgramme(existingBranch.department_id, existingBranch.programme_id, name);
                if (nameTaken) {
                    const err = new Error(`Branch name "${name}" already exists in this Department and Programme`);
                    err.statusCode = 409;
                    throw err;
                }
                updateDoc.branch_name = name;
            }
        }

        let isStatusChanging = false;
        let newStatus = null;

        if (payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase())) {
            newStatus = payload.status.toLowerCase();
            if (newStatus !== existingBranch.status) {
                isStatusChanging = true;
                updateDoc.status = newStatus;
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (isStatusChanging) {
                await userRepository.updateMany({branch_id: cleanId}, {status: newStatus}, {session});
            }

            const updatedBranch = await branchRepository.updateById(cleanId, updateDoc, {session});

            await session.commitTransaction();
            return updatedBranch;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async cascadeDeleteBranch(id) {
        const cleanId = sanitizeString(id, {uppercase: true});
        await this.getById(cleanId);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await userRepository.updateMany({branch_id: cleanId}, {
                branch_id: null, is_profile_completed: false, profile_locked: false,
            }, {session});

            await complainRepository.updateMany({branch_id: cleanId}, {branch_id: null}, {session});

            await branchRepository.deleteById(cleanId, {session});

            await session.commitTransaction();
            return {deleted_branch_id: cleanId};
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }
}

export default new BranchService();