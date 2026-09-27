import mongoose from 'mongoose';
import programmeRepository from '../repositories/programme.repository.js';
import branchRepository from '../repositories/branch.repository.js';
import userRepository from '../repositories/user.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import {generateCustomId} from '../utils/id.generator.js';
import {validateCode, sanitizeString} from '../utils/validator.js';

class ProgrammeService {
    async create(payload) {
        const code = validateCode(payload.programme_code, 'programme_code');
        const name = sanitizeString(payload.programme_name, {minLength: 2, maxLength: 150, uppercase: true});
        const duration = Number(payload.duration_year);
        const semesters = Number(payload.total_semester);
        const status = payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase()) ? payload.status.toLowerCase() : 'active';

        if (Number.isNaN(duration) || duration < 1 || duration > 10) {
            const err = new Error('duration_year must be between 1 and 10');
            err.statusCode = 400;
            throw err;
        }

        if (Number.isNaN(semesters) || semesters < 1 || semesters > 20) {
            const err = new Error('total_semester must be between 1 and 20');
            err.statusCode = 400;
            throw err;
        }

        const codeExists = await programmeRepository.existsByCode(code);
        const nameExists = await programmeRepository.existsByName(name);

        if (codeExists) {
            const err = new Error(`Programme code "${code}" already exists`);
            err.statusCode = 409;
            throw err;
        }

        if (nameExists) {
            const err = new Error(`Programme name "${name}" already exists`);
            err.statusCode = 409;
            throw err;
        }

        const generatedId = await generateCustomId('PRG');
        return await programmeRepository.create({
            _id: generatedId,
            custom_id: generatedId,
            programme_code: code,
            programme_name: name,
            duration_year: duration,
            total_semester: semesters,
            status,
        });
    }

    async getById(id, options = {}) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const prog = await programmeRepository.findById(cleanId, options);
        if (!prog) {
            const err = new Error(`Programme "${cleanId}" not found`);
            err.statusCode = 404;
            throw err;
        }
        return prog;
    }

    async getAll(options = {}) {
        return await programmeRepository.find({}, {
            ...options, limit: options.limit !== undefined ? options.limit : 0, page: options.page || 1,
        });
    }

    async updateById(id, payload) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const existingProg = await this.getById(cleanId);

        const updateDoc = {};

        if (payload.programme_name) {
            const name = sanitizeString(payload.programme_name, {minLength: 2, maxLength: 150, uppercase: true});
            const nameExists = await programmeRepository.existsByName(name);
            if (nameExists) {
                const existing = await programmeRepository.findByName(name);
                if (existing && (existing._id || existing.id || existing.custom_id) !== cleanId) {
                    const err = new Error(`Programme name "${name}" already exists`);
                    err.statusCode = 409;
                    throw err;
                }
            }
            updateDoc.programme_name = name;
        }

        if (payload.duration_year !== undefined) {
            const dur = Number(payload.duration_year);
            if (Number.isNaN(dur) || dur < 1 || dur > 10) {
                const err = new Error('duration_year must be between 1 and 10');
                err.statusCode = 400;
                throw err;
            }
            updateDoc.duration_year = dur;
        }

        if (payload.total_semester !== undefined) {
            const sem = Number(payload.total_semester);
            if (Number.isNaN(sem) || sem < 1 || sem > 20) {
                const err = new Error('total_semester must be between 1 and 20');
                err.statusCode = 400;
                throw err;
            }
            updateDoc.total_semester = sem;
        }

        let isStatusChanging = false;
        let newStatus = null;

        if (payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase())) {
            newStatus = payload.status.toLowerCase();
            if (newStatus !== existingProg.status) {
                isStatusChanging = true;
                updateDoc.status = newStatus;
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (isStatusChanging) {
                await branchRepository.updateMany({programme_id: cleanId}, {status: newStatus}, {session});
            }

            const updatedProg = await programmeRepository.updateById(cleanId, updateDoc, {session});

            await session.commitTransaction();
            return updatedProg;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async cascadeDeleteProgramme(id) {
        const cleanId = sanitizeString(id, {uppercase: true});
        await this.getById(cleanId);

        const branchesResult = await branchRepository.find({programme_id: cleanId}, {limit: 0});
        const branchList = branchesResult.branches || [];
        const branchIds = branchList.map((b) => b._id || b.id || b.custom_id);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (branchIds.length > 0) {
                await branchRepository.deleteMany({programme_id: cleanId}, {session});

                await userRepository.updateMany({branch_id: {$in: branchIds}}, {
                    branch_id: null, is_profile_completed: false, profile_locked: false,
                }, {session});

                await complainRepository.updateMany({branch_id: {$in: branchIds}}, {branch_id: null}, {session});
            }

            await programmeRepository.deleteById(cleanId, {session});

            await session.commitTransaction();
            return {
                deleted_programme_id: cleanId, cascaded_branches_count: branchIds.length,
            };
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

export default new ProgrammeService();