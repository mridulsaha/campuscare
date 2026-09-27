import mongoose from 'mongoose';
import departmentRepository from '../repositories/department.repository.js';
import branchRepository from '../repositories/branch.repository.js';
import userRepository from '../repositories/user.repository.js';
import complainService from './complain.service.js';
import complainRepository from '../repositories/complain.repository.js';
import complainAssignmentRepository from '../repositories/complain.assignment.repository.js';
import complainHistoryRepository from '../repositories/complain.history.repository.js';
import {generateCustomId} from '../utils/id.generator.js';
import {validateCode, sanitizeString} from '../utils/validator.js';
import {TOP_LEVEL_MANAGEMENT} from '../configs/auth.config.js';

class DepartmentService {
    async create(payload) {
        const code = validateCode(payload.department_code, 'department_code');
        const name = sanitizeString(payload.department_name, {minLength: 2, maxLength: 150, uppercase: true});
        const status = payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase()) ? payload.status.toLowerCase() : 'active';

        const codeExists = await departmentRepository.existsByCode(code);
        const nameExists = await departmentRepository.existsByName(name);

        if (codeExists) {
            const err = new Error(`Department code "${code}" is already registered`);
            err.statusCode = 409;
            throw err;
        }

        if (nameExists) {
            const err = new Error(`Department name "${name}" is already registered`);
            err.statusCode = 409;
            throw err;
        }

        const generatedId = await generateCustomId('DEP');
        return await departmentRepository.create({
            _id: generatedId, custom_id: generatedId, department_code: code, department_name: name, status,
        });
    }

    async getById(id, options = {}) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const department = await departmentRepository.findById(cleanId, options);
        if (!department) {
            const err = new Error(`Department "${cleanId}" not found`);
            err.statusCode = 404;
            throw err;
        }
        return department;
    }

    async getAll(options = {}) {
        return await departmentRepository.find({}, {
            ...options, limit: options.limit !== undefined ? options.limit : 0, page: options.page || 1,
        });
    }

    async updateById(id, payload) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const existingDept = await this.getById(cleanId);

        const updateDoc = {};
        let isHeadChanging = false;
        const oldHeadId = existingDept.department_head_id;
        let newHeadId = null;

        if (payload.department_name) {
            const name = sanitizeString(payload.department_name, {minLength: 2, maxLength: 150, uppercase: true});
            const nameExists = await departmentRepository.existsByName(name);
            if (nameExists) {
                const existing = await departmentRepository.findByName(name);
                if (existing && (existing._id || existing.id || existing.custom_id) !== cleanId) {
                    const err = new Error(`Department name "${name}" already exists`);
                    err.statusCode = 409;
                    throw err;
                }
            }
            updateDoc.department_name = name;
        }

        let isStatusChanging = false;
        let newStatus = null;
        if (payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase())) {
            newStatus = payload.status.toLowerCase();
            if (newStatus !== existingDept.status) {
                isStatusChanging = true;
                updateDoc.status = newStatus;
            }
        }

        if (payload.department_head_id !== undefined) {
            if (payload.department_head_id) {
                if (newStatus === 'inactive' || (!isStatusChanging && existingDept.status === 'inactive')) {
                    const err = new Error('Cannot assign a department head to an inactive department');
                    err.statusCode = 400;
                    throw err;
                }

                newHeadId = sanitizeString(payload.department_head_id, {uppercase: true});
                const head = await userRepository.findById(newHeadId);
                if (!head || head.role !== 'faculty' || head.status !== 'active') {
                    const err = new Error('Department head must be an active faculty member');
                    err.statusCode = 400;
                    throw err;
                }
                if (head.department_id !== cleanId) {
                    const err = new Error(`Department head must belong to department "${cleanId}"`);
                    err.statusCode = 400;
                    throw err;
                }
                updateDoc.department_head_id = newHeadId;
            } else {
                updateDoc.department_head_id = null;
            }

            if (oldHeadId !== newHeadId) {
                isHeadChanging = true;
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (isStatusChanging) {
                await branchRepository.updateMany({department_id: cleanId}, {status: newStatus}, {session});

                await userRepository.updateMany({department_id: cleanId}, {status: newStatus}, {session});

                if (newStatus === 'inactive') {
                    updateDoc.department_head_id = null;
                    isHeadChanging = Boolean(oldHeadId);

                    const deptUsers = await userRepository.find({department_id: cleanId}, {limit: 0, session});
                    const userRecords = deptUsers.users || [];
                    const deptUserIds = userRecords.map((u) => u._id || u.id || u.custom_id);

                    const inFlightComplaints = await complainRepository.find({
                        $or: [{
                            active_respondent_id: {$in: deptUserIds}, status: 'UNDER_REVIEW'
                        }, {target_department_id: cleanId, status: 'UNDER_REVIEW'}]
                    }, {limit: 0, session});
                    const complaintList = inFlightComplaints.complains || [];

                    if (deptUserIds.length > 0) {
                        await complainAssignmentRepository.updateMany({
                            respondent_id: {$in: deptUserIds}, is_active: true
                        }, {is_active: false}, {session});
                    }

                    for (const ticket of complaintList) {
                        const ticketId = ticket._id || ticket.id || ticket.custom_id;
                        const historyId = await generateCustomId('HIS', session);

                        await complainHistoryRepository.create({
                            _id: historyId,
                            custom_id: historyId,
                            complain_id: ticketId,
                            actor_id: 'SYSTEM',
                            action: 'STATUS_UPDATED',
                            previous_status: 'UNDER_REVIEW',
                            new_status: 'PENDING',
                            remarks: `Department ${cleanId} was set to inactive. Reviewer unassigned and ticket returned to PENDING.`,
                        }, {session});
                    }

                    if (complaintList.length > 0) {
                        const complaintIds = complaintList.map((c) => c._id || c.id || c.custom_id);
                        await complainRepository.updateMany({_id: {$in: complaintIds}}, {
                            status: 'PENDING',
                            active_respondent_id: null,
                            status_description: 'Department marked inactive. Grievance held in queue pending administrative reassignment.',
                        }, {session});
                    }
                }
            }

            if (isHeadChanging && oldHeadId) {
                const oldHeadUser = await userRepository.findById(oldHeadId, {session});
                if (oldHeadUser && oldHeadUser.designation === 'hod') {
                    const shouldPreserveLeadership = TOP_LEVEL_MANAGEMENT.includes(oldHeadUser.designation);
                    if (!shouldPreserveLeadership) {
                        await userRepository.updateById(oldHeadId, {designation: 'professor'}, {session});
                    }
                }

                if (!isStatusChanging || newStatus !== 'inactive') {
                    const assignedComplaints = await complainRepository.find({
                        active_respondent_id: oldHeadId, status: 'UNDER_REVIEW'
                    }, {limit: 0, session});
                    const complaintList = assignedComplaints.complains || [];

                    await complainAssignmentRepository.updateMany({
                        respondent_id: oldHeadId, is_active: true
                    }, {is_active: false}, {session});

                    for (const ticket of complaintList) {
                        const ticketId = ticket._id || ticket.id || ticket.custom_id;
                        const historyId = await generateCustomId('HIS', session);

                        await complainHistoryRepository.create({
                            _id: historyId,
                            custom_id: historyId,
                            complain_id: ticketId,
                            actor_id: newHeadId || 'SYSTEM',
                            action: 'STATUS_UPDATED',
                            previous_status: 'UNDER_REVIEW',
                            new_status: 'PENDING',
                            remarks: `Department Head transitioned. Returned to Department ${ticket.target_department_id} intake pool.`,
                        }, {session});
                    }

                    if (complaintList.length > 0) {
                        await complainRepository.updateMany({active_respondent_id: oldHeadId, status: 'UNDER_REVIEW'}, {
                            status: 'PENDING',
                            active_respondent_id: null,
                            status_description: 'Department Head transitioned. Grievance returned to intake pool for reassignment.',
                        }, {session});
                    }
                }
            }

            if (newHeadId && (!isStatusChanging || newStatus === 'active')) {
                const newHeadUser = await userRepository.findById(newHeadId, {session});
                if (newHeadUser && !TOP_LEVEL_MANAGEMENT.includes(newHeadUser.designation)) {
                    await userRepository.updateById(newHeadId, {designation: 'hod'}, {session});
                }
            }

            const updatedDepartment = await departmentRepository.updateById(cleanId, updateDoc, {session});

            await session.commitTransaction();
            return updatedDepartment;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async cascadeDeleteDepartment(id) {
        const cleanId = sanitizeString(id, {uppercase: true});
        await this.getById(cleanId);

        const branchesResult = await branchRepository.find({department_id: cleanId}, {limit: 0});
        const branchList = branchesResult.branches || [];
        const branchIds = branchList.map((b) => b._id || b.id || b.custom_id);

        const complaintsResult = await complainRepository.find({$or: [{target_department_id: cleanId}, {complainant_department_id: cleanId}]}, {limit: 0});
        const complaintList = complaintsResult.complains || [];

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (const ticket of complaintList) {
                const ticketId = ticket._id || ticket.id || ticket.custom_id;
                await complainService.deleteComplaintWithDependencies(ticketId, session);
            }

            if (branchIds.length > 0) {
                await branchRepository.deleteMany({department_id: cleanId}, {session});
            }

            await userRepository.updateMany({department_id: cleanId}, {
                department_id: null, branch_id: null, is_profile_completed: false, profile_locked: false,
            }, {session});

            await departmentRepository.deleteById(cleanId, {session});

            await session.commitTransaction();
            return {
                deleted_department_id: cleanId,
                cascaded_branches_count: branchIds.length,
                cascaded_complaints_count: complaintList.length,
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

export default new DepartmentService();