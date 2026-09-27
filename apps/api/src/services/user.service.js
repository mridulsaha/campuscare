import mongoose from 'mongoose';
import userRepository from '../repositories/user.repository.js';
import branchRepository from '../repositories/branch.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import complainAssignmentRepository from '../repositories/complain.assignment.repository.js';
import complainHistoryRepository from '../repositories/complain.history.repository.js';
import attachmentRepository from '../repositories/attachment.repository.js';
import { generateCustomId } from '../utils/id.generator.js';
import { deleteCloudinaryAssets } from '../utils/cloudinary.util.js';
import {
    validateEmail,
    validateEnrollmentNumber,
    sanitizeString,
} from '../utils/validator.js';
import {
    VALID_DESIGNATIONS,
    SUB_HOD_DESIGNATIONS,
    TOP_LEVEL_MANAGEMENT,
    LEADERSHIP_AND_ABOVE,
} from '../configs/auth.config.js';

class UserService {
    #extractId(entity) {
        if (!entity) return null;
        return (entity._id || entity.id || entity.custom_id || entity).toString();
    }

    #extractAllUserIds(userOrId) {
        if (!userOrId) return [];
        if (typeof userOrId === 'string') return [userOrId];
        const ids = new Set();
        if (userOrId._id) ids.add(userOrId._id.toString());
        if (userOrId.id) ids.add(userOrId.id.toString());
        if (userOrId.custom_id) ids.add(userOrId.custom_id.toString());
        if (ids.size === 0 && typeof userOrId.toString === 'function') {
            const str = userOrId.toString();
            if (str && str !== '[object Object]') ids.add(str);
        }
        return Array.from(ids);
    }

    #isTopManagement(user) {
        if (!user || !user.designation) return false;
        const des = String(user.designation).toLowerCase().trim();
        return TOP_LEVEL_MANAGEMENT.some((d) => String(d).toLowerCase().trim() === des);
    }

    async findOrCreateOAuthUser({ email, rawName, isStudentDomain, isNonStudentDomain }, options = {}) {
        const cleanEmail = validateEmail(email);
        const existing = await userRepository.findByEmail(cleanEmail, options);
        if (existing) return existing;

        const session = options.session || null;
        const generatedId = await generateCustomId('USR', session);
        const userDoc = {
            _id: generatedId,
            custom_id: generatedId,
            email: cleanEmail,
            status: 'active',
        };

        if (isStudentDomain) {
            const cleanRaw = (rawName || '').trim();
            const tokenMatch = cleanRaw.match(/^([A-Za-z0-9]+)\s+(.+)$/);

            let enrollment;
            let fullName;

            if (tokenMatch) {
                enrollment = validateEnrollmentNumber(tokenMatch[1]);
                fullName = sanitizeString(tokenMatch[2], { minLength: 2, maxLength: 100, uppercase: true });
            } else {
                enrollment = validateEnrollmentNumber(cleanEmail.split('@')[0].toUpperCase());
                fullName = sanitizeString(cleanRaw || cleanEmail.split('@')[0], {
                    minLength: 2,
                    maxLength: 100,
                    uppercase: true,
                });
            }

            const branchCode = enrollment.slice(0, 4);
            const branch = await branchRepository.findByCode(branchCode);

            let admissionYear = new Date().getFullYear();
            const yearPrefix = Number(cleanEmail.slice(0, 2));
            if (!Number.isNaN(yearPrefix) && yearPrefix >= 0 && yearPrefix <= 99) {
                const parsedYear = Number(`20${yearPrefix < 10 ? `0${yearPrefix}` : yearPrefix}`);
                if (parsedYear >= 1990 && parsedYear <= 2050) {
                    admissionYear = parsedYear;
                }
            }

            userDoc.role = 'student';
            userDoc.enrollment_number = enrollment;
            userDoc.full_name = fullName;
            userDoc.admission_year = admissionYear;

            if (branch) {
                userDoc.branch_id = branch.custom_id || branch._id || branch.id;
                userDoc.department_id = branch.department_id;
                userDoc.is_profile_completed = true;
                userDoc.profile_locked = true;
            } else {
                userDoc.is_profile_completed = false;
                userDoc.profile_locked = false;
            }
        } else if (isNonStudentDomain) {
            userDoc.role = 'faculty';
            userDoc.full_name =
                sanitizeString(rawName, {
                    minLength: 2,
                    maxLength: 100,
                    uppercase: true,
                }) || 'FACULTY MEMBER';
            userDoc.is_profile_completed = false;
            userDoc.profile_locked = false;
        }

        return await userRepository.create(userDoc, options);
    }

    async completeUserProfile(userId, data = {}) {
        const cleanId = sanitizeString(userId, { uppercase: true });
        const user = await userRepository.findById(cleanId);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        if (user.profile_locked) {
            const err = new Error('Profile is locked. Subsequent modifications must be requested through Department HOD or System Admin.');
            err.statusCode = 403;
            throw err;
        }

        const updateDoc = {
            is_profile_completed: true,
            profile_locked: true,
        };

        if (data.full_name) {
            updateDoc.full_name = sanitizeString(data.full_name, { minLength: 2, maxLength: 100, uppercase: true });
        }

        let isDeptChanging = false;
        let isBranchChanging = false;
        let newDeptId = null;
        let newBranchId = null;

        if (user.role === 'student') {
            if (!user.branch_id && !data.branch_id) {
                const err = new Error('Academic branch is required to complete student profile');
                err.statusCode = 400;
                throw err;
            }

            if (data.enrollment_number) {
                const enrollment = validateEnrollmentNumber(data.enrollment_number);

                if (enrollment !== user.enrollment_number) {
                    const existingRecord = await userRepository.findByEnrollmentNumber(enrollment);
                    if (existingRecord) {
                        const existingId = this.#extractId(existingRecord);
                        if (existingId && existingId.toUpperCase() !== cleanId.toUpperCase()) {
                            const err = new Error(`Enrollment number "${enrollment}" is already registered`);
                            err.statusCode = 409;
                            throw err;
                        }
                    }
                    updateDoc.enrollment_number = enrollment;
                }
            }

            if (data.branch_id) {
                const branchId = sanitizeString(data.branch_id, { uppercase: true });
                const branch = await branchRepository.findById(branchId);
                if (!branch) {
                    const err = new Error('Referenced branch does not exist');
                    err.statusCode = 404;
                    throw err;
                }

                newBranchId = branch._id || branch.id || branch.custom_id;
                if (newBranchId !== user.branch_id) {
                    isBranchChanging = true;
                    updateDoc.branch_id = newBranchId;
                }

                updateDoc.department_id = branch.department_id;
                if (updateDoc.department_id !== user.department_id) {
                    isDeptChanging = true;
                    newDeptId = updateDoc.department_id;
                }
            }

            if (data.admission_year !== undefined && data.admission_year !== null && data.admission_year !== '') {
                const year = Number(data.admission_year);
                if (Number.isNaN(year) || year < 1990 || year > 2050) {
                    const err = new Error('Admission year must be valid between 1990 and 2050');
                    err.statusCode = 400;
                    throw err;
                }
                updateDoc.admission_year = year;
            }
        } else if (user.role === 'faculty') {
            if (!user.department_id && !data.department_id) {
                const err = new Error('Department is required to complete faculty profile');
                err.statusCode = 400;
                throw err;
            }

            if (data.department_id) {
                const deptId = sanitizeString(data.department_id, { uppercase: true });
                const dept = await departmentRepository.findById(deptId);
                if (!dept) {
                    const err = new Error('Referenced department does not exist');
                    err.statusCode = 404;
                    throw err;
                }

                newDeptId = dept._id || dept.id || dept.custom_id;
                if (newDeptId !== user.department_id) {
                    isDeptChanging = true;
                    updateDoc.department_id = newDeptId;
                }
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (isDeptChanging || isBranchChanging) {
                const complainantUpdateDoc = {};
                if (isDeptChanging && newDeptId) complainantUpdateDoc.complainant_department_id = newDeptId;
                if (isBranchChanging && newBranchId) complainantUpdateDoc.branch_id = newBranchId;

                if (Object.keys(complainantUpdateDoc).length > 0) {
                    await complainRepository.updateMany({ complainant_id: cleanId }, complainantUpdateDoc, { session });
                }

                if (user.role === 'faculty' && isDeptChanging) {
                    const assignedComplaints = await complainRepository.find({
                        active_respondent_id: cleanId,
                        status: 'UNDER_REVIEW',
                    }, { limit: 0, session });
                    const complaintList = assignedComplaints.complains || [];

                    await complainAssignmentRepository.updateMany({
                        respondent_id: cleanId,
                        is_active: true,
                    }, { is_active: false }, { session });

                    for (const ticket of complaintList) {
                        const ticketId = ticket._id || ticket.id || ticket.custom_id;
                        const historyId = await generateCustomId('HIS', session);

                        await complainHistoryRepository.create({
                            _id: historyId,
                            custom_id: historyId,
                            complain_id: ticketId,
                            actor_id: cleanId,
                            action: 'STATUS_UPDATED',
                            previous_status: 'UNDER_REVIEW',
                            new_status: 'PENDING',
                            remarks: `Assigned reviewer transitioned to Department ${newDeptId}. Grievance returned to Department ${ticket.target_department_id} intake pool.`,
                        }, { session });
                    }

                    if (complaintList.length > 0) {
                        await complainRepository.updateMany({ active_respondent_id: cleanId, status: 'UNDER_REVIEW' }, {
                            status: 'PENDING',
                            active_respondent_id: null,
                            status_description: 'Reviewer transferred during profile update. Grievance returned to department intake pool.',
                        }, { session });
                    }
                }
            }

            const updatedUser = await userRepository.updateById(cleanId, updateDoc, { session });
            await session.commitTransaction();
            return updatedUser;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async adminUpdateUser(updater, targetUserId, data = {}) {
        const cleanTargetId = sanitizeString(targetUserId, { uppercase: true });
        const targetUser = await userRepository.findById(cleanTargetId);
        if (!targetUser) {
            const err = new Error(`User "${cleanTargetId}" does not exist`);
            err.statusCode = 404;
            throw err;
        }

        const updaterId = this.#extractId(updater);
        const isUpdaterAdmin = updater.role === 'admin';
        const isUpdaterHod = String(updater.designation || '').toLowerCase().trim() === 'hod';
        const isUpdaterTopManagement = this.#isTopManagement(updater);

        if (!isUpdaterAdmin && !isUpdaterHod && !isUpdaterTopManagement) {
            const err = new Error('Access Denied: Unauthorized modification scope');
            err.statusCode = 403;
            throw err;
        }

        const targetUserDeptId = this.#extractId(targetUser.department_id);
        const updaterDeptId = this.#extractId(updater.department_id);

        if (!isUpdaterAdmin) {
            if (targetUser.role === 'admin') {
                const err = new Error('Access Denied: Administrator accounts can only be modified by a System Administrator');
                err.statusCode = 403;
                throw err;
            }

            if (this.#isTopManagement(targetUser)) {
                const err = new Error('Access Denied: Executive leadership profiles can only be modified by a System Administrator');
                err.statusCode = 403;
                throw err;
            }

            if (isUpdaterHod && !isUpdaterTopManagement) {
                const isTargetHod = String(targetUser.designation || '').toLowerCase().trim() === 'hod';
                if (isTargetHod && cleanTargetId !== updaterId) {
                    const err = new Error('Access Denied: Head of Department profiles can only be modified by a System Administrator');
                    err.statusCode = 403;
                    throw err;
                }

                if (!targetUserDeptId || targetUserDeptId !== updaterDeptId) {
                    const err = new Error('Access Denied: HOD authority is strictly restricted to members within their own department');
                    err.statusCode = 403;
                    throw err;
                }
            }

            if (data.role && data.role.toLowerCase().trim() !== targetUser.role) {
                const err = new Error('Access Denied: Only a System Administrator can change user roles');
                err.statusCode = 403;
                throw err;
            }
        }

        const updateDoc = {};
        let isRoleChanging = false;
        let newRole = targetUser.role;

        if (data.role && data.role.toLowerCase().trim() !== targetUser.role) {
            newRole = data.role.toLowerCase().trim();
            if (!['student', 'faculty', 'admin'].includes(newRole)) {
                const err = new Error('Invalid role specified. Allowed roles: "student", "faculty", "admin"');
                err.statusCode = 400;
                throw err;
            }
            isRoleChanging = true;
            updateDoc.role = newRole;

            if (newRole === 'student') {
                updateDoc.designation = null;
            } else if (newRole === 'faculty') {
                updateDoc.branch_id = null;
                updateDoc.enrollment_number = null;
                updateDoc.admission_year = null;
                if (!data.designation) {
                    updateDoc.designation = 'assistant_professor';
                }
            } else if (newRole === 'admin') {
                updateDoc.branch_id = null;
                updateDoc.enrollment_number = null;
                updateDoc.admission_year = null;
            }
        }

        const effectiveRole = isRoleChanging ? newRole : targetUser.role;

        if (data.full_name) {
            updateDoc.full_name = sanitizeString(data.full_name, { minLength: 2, maxLength: 100, uppercase: true });
        }

        if (effectiveRole === 'student' && data.admission_year !== undefined && data.admission_year !== null && data.admission_year !== '') {
            const year = Number(data.admission_year);
            if (Number.isNaN(year) || year < 1990 || year > 2050) {
                const err = new Error('Admission year must be valid between 1990 and 2050');
                err.statusCode = 400;
                throw err;
            }
            updateDoc.admission_year = year;
        }

        const isStatusChanging = data.status && data.status.toLowerCase() !== targetUser.status;
        const willBeInactive = data.status && data.status.toLowerCase() === 'inactive';
        if (data.status && ['active', 'inactive'].includes(data.status.toLowerCase())) {
            updateDoc.status = data.status.toLowerCase();
        }

        if (data.designation !== undefined) {
            if (effectiveRole === 'student') {
                if (data.designation) {
                    const err = new Error('Access Denied: Designations cannot be assigned to student profiles');
                    err.statusCode = 400;
                    throw err;
                }
                updateDoc.designation = null;
            } else {
                const rawDesig = data.designation ? String(data.designation).toLowerCase().trim() : null;
                if (!rawDesig) {
                    updateDoc.designation = null;
                } else if (!isUpdaterAdmin) {
                    if (rawDesig !== '' && !SUB_HOD_DESIGNATIONS.includes(rawDesig)) {
                        const err = new Error(
                            `Access Denied: Department Heads and Leadership can only assign teaching designations (${SUB_HOD_DESIGNATIONS.join(', ')}) or clear designations. HOD and executive designations can only be assigned by a System Administrator.`
                        );
                        err.statusCode = 403;
                        throw err;
                    }
                    updateDoc.designation = rawDesig;
                } else {
                    if (!VALID_DESIGNATIONS.includes(rawDesig)) {
                        const err = new Error(`Invalid designation "${rawDesig}"`);
                        err.statusCode = 400;
                        throw err;
                    }
                    updateDoc.designation = rawDesig;
                }
            }
        }

        let isDeptChanging = false;
        let isBranchChanging = false;
        let newDeptId = null;
        let newBranchId = null;

        if (data.branch_id) {
            if (effectiveRole !== 'student') {
                const err = new Error('Branch reassignments can only be applied to student accounts');
                err.statusCode = 400;
                throw err;
            }

            const branchId = sanitizeString(data.branch_id, { uppercase: true });
            const branch = await branchRepository.findById(branchId);
            if (!branch) {
                const err = new Error(`Branch "${branchId}" does not exist`);
                err.statusCode = 404;
                throw err;
            }

            const branchDeptId = this.#extractId(branch.department_id);
            if (isUpdaterHod && !isUpdaterAdmin && !isUpdaterTopManagement) {
                if (branchDeptId !== updaterDeptId) {
                    const err = new Error('Access Denied: HOD can only assign branches within their own department');
                    err.statusCode = 403;
                    throw err;
                }
            }

            newBranchId = branch._id || branch.id || branch.custom_id;
            if (newBranchId !== targetUser.branch_id) {
                isBranchChanging = true;
                updateDoc.branch_id = newBranchId;
            }

            if (branchDeptId && branchDeptId !== targetUserDeptId) {
                isDeptChanging = true;
                newDeptId = branchDeptId;
                updateDoc.department_id = branchDeptId;
            }
        }

        if (data.department_id && !updateDoc.department_id) {
            if (effectiveRole === 'student' && !data.branch_id) {
                const err = new Error('Student departments are derived strictly from their branch. Please assign a branch instead.');
                err.statusCode = 400;
                throw err;
            }

            const deptId = sanitizeString(data.department_id, { uppercase: true });
            const dept = await departmentRepository.findById(deptId);
            if (!dept) {
                const err = new Error(`Department "${deptId}" does not exist`);
                err.statusCode = 404;
                throw err;
            }

            const verifiedDeptId = dept._id || dept.id || dept.custom_id;
            if (verifiedDeptId !== targetUserDeptId) {
                isDeptChanging = true;
                newDeptId = verifiedDeptId;
                updateDoc.department_id = verifiedDeptId;
                if (effectiveRole !== 'student') {
                    updateDoc.branch_id = null;
                }
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (isStatusChanging && willBeInactive) {
                await departmentRepository.updateMany({ department_head_id: cleanTargetId }, { department_head_id: null }, { session });

                const assignedComplaints = await complainRepository.find({
                    active_respondent_id: cleanTargetId,
                    status: 'UNDER_REVIEW',
                }, { limit: 0, session });
                const complaintList = assignedComplaints.complains || [];

                await complainAssignmentRepository.updateMany({
                    respondent_id: cleanTargetId,
                    is_active: true,
                }, { is_active: false }, { session });

                for (const ticket of complaintList) {
                    const ticketId = ticket._id || ticket.id || ticket.custom_id;
                    const historyId = await generateCustomId('HIS', session);

                    await complainHistoryRepository.create({
                        _id: historyId,
                        custom_id: historyId,
                        complain_id: ticketId,
                        actor_id: updaterId,
                        action: 'STATUS_UPDATED',
                        previous_status: 'UNDER_REVIEW',
                        new_status: 'PENDING',
                        remarks: `Assigned reviewer (${targetUser.full_name}) was deactivated. Grievance returned to Department ${ticket.target_department_id} intake pool for reassignment.`,
                    }, { session });
                }

                if (complaintList.length > 0) {
                    await complainRepository.updateMany({ active_respondent_id: cleanTargetId, status: 'UNDER_REVIEW' }, {
                        status: 'PENDING',
                        active_respondent_id: null,
                        status_description: 'Assigned reviewer was deactivated. Grievance returned to department intake pool.',
                    }, { session });
                }

                await complainRepository.updateMany({
                    target_user_id: cleanTargetId,
                    status: { $in: ['PENDING', 'UNDER_REVIEW'] },
                }, { target_user_id: null }, { session });
            }

            if ((isDeptChanging && newDeptId) || (isBranchChanging && newBranchId)) {
                const complainantUpdateDoc = {};
                if (isDeptChanging && newDeptId) complainantUpdateDoc.complainant_department_id = newDeptId;
                if (isBranchChanging && newBranchId) complainantUpdateDoc.branch_id = newBranchId;

                if (Object.keys(complainantUpdateDoc).length > 0) {
                    await complainRepository.updateMany({ complainant_id: cleanTargetId }, complainantUpdateDoc, { session });
                }

                if (targetUser.role !== 'student' && isDeptChanging) {
                    await departmentRepository.updateMany({ department_head_id: cleanTargetId }, { department_head_id: null }, { session });

                    const assignedComplaints = await complainRepository.find({
                        active_respondent_id: cleanTargetId,
                        status: 'UNDER_REVIEW',
                    }, { limit: 0, session });
                    const complaintList = assignedComplaints.complains || [];

                    await complainAssignmentRepository.updateMany({
                        respondent_id: cleanTargetId,
                        is_active: true,
                    }, { is_active: false }, { session });

                    for (const ticket of complaintList) {
                        const ticketId = ticket._id || ticket.id || ticket.custom_id;
                        const historyId = await generateCustomId('HIS', session);

                        await complainHistoryRepository.create({
                            _id: historyId,
                            custom_id: historyId,
                            complain_id: ticketId,
                            actor_id: updaterId,
                            action: 'STATUS_UPDATED',
                            previous_status: 'UNDER_REVIEW',
                            new_status: 'PENDING',
                            remarks: `Assigned reviewer (${targetUser.full_name}) was transferred to Department ${newDeptId}. Grievance returned to Department ${ticket.target_department_id} intake pool.`,
                        }, { session });
                    }

                    if (complaintList.length > 0) {
                        await complainRepository.updateMany({
                            active_respondent_id: cleanTargetId,
                            status: 'UNDER_REVIEW',
                        }, {
                            status: 'PENDING',
                            active_respondent_id: null,
                            status_description: 'Assigned reviewer was transferred out of department. Grievance queued in department pool for reassignment.',
                        }, { session });
                    }
                }
            }

            const updatedUser = await userRepository.updateById(cleanTargetId, updateDoc, { session });
            await session.commitTransaction();
            return updatedUser;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async cascadeDeleteUser(updater, targetUserId) {
        const cleanTargetId = sanitizeString(targetUserId, { uppercase: true });
        const targetUser = await userRepository.findById(cleanTargetId);
        if (!targetUser) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        const updaterId = this.#extractId(updater);

        if (updaterId === cleanTargetId) {
            const err = new Error('Access Denied: You cannot delete your own account');
            err.statusCode = 403;
            throw err;
        }

        const isUpdaterAdmin = updater.role === 'admin';
        const isUpdaterHod = String(updater.designation || '').toLowerCase().trim() === 'hod';
        const isUpdaterTopManagement = this.#isTopManagement(updater);

        if (!isUpdaterAdmin && !isUpdaterHod && !isUpdaterTopManagement) {
            const err = new Error('Access Denied: Only Department Heads (HOD) and higher institutional leadership can delete accounts');
            err.statusCode = 403;
            throw err;
        }

        const isTargetLeadership = LEADERSHIP_AND_ABOVE.includes(targetUser.designation) || targetUser.role === 'admin';
        if (isTargetLeadership && !isUpdaterAdmin) {
            const err = new Error('Access Denied: Accounts with designation of HOD or higher can only be deleted by a System Admin');
            err.statusCode = 403;
            throw err;
        }

        if (isUpdaterHod && !isUpdaterAdmin) {
            const targetUserDeptId = this.#extractId(targetUser.department_id);
            const updaterDeptId = this.#extractId(updater.department_id);
            if (targetUserDeptId !== updaterDeptId) {
                const err = new Error('Access Denied: HODs can only delete users belonging to their own department');
                err.statusCode = 403;
                throw err;
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const userComplaints = await complainRepository.find({ complainant_id: cleanTargetId }, { limit: 0, session });
            const complaintRecords = userComplaints.complains || [];
            const complaintIds = complaintRecords.map((c) => c._id || c.id || c.custom_id);

            if (complaintIds.length > 0) {
                const attachments = await attachmentRepository.findByComplainId(complaintIds, { session });
                const publicIds = Array.isArray(attachments) ? attachments.map((att) => att.public_id).filter(Boolean) : [];

                await attachmentRepository.deleteMany({ complain_id: { $in: complaintIds } }, { session });
                await complainAssignmentRepository.deleteMany({ complain_id: { $in: complaintIds } }, { session });
                await complainHistoryRepository.deleteMany({ complain_id: { $in: complaintIds } }, { session });
                await complainRepository.deleteMany({ _id: { $in: complaintIds } }, { session });

                if (publicIds.length > 0) {
                    deleteCloudinaryAssets(publicIds).catch(() => {});
                }
            }

            const assignedComplaints = await complainRepository.find({
                active_respondent_id: cleanTargetId,
                status: 'UNDER_REVIEW',
            }, { limit: 0, session });
            const assignedList = assignedComplaints.complains || [];

            await complainAssignmentRepository.updateMany({
                respondent_id: cleanTargetId,
                is_active: true,
            }, { is_active: false }, { session });

            for (const ticket of assignedList) {
                const ticketId = ticket._id || ticket.id || ticket.custom_id;
                const historyId = await generateCustomId('HIS', session);

                await complainHistoryRepository.create({
                    _id: historyId,
                    custom_id: historyId,
                    complain_id: ticketId,
                    actor_id: updaterId,
                    action: 'STATUS_UPDATED',
                    previous_status: 'UNDER_REVIEW',
                    new_status: 'PENDING',
                    remarks: `Assigned faculty member (${targetUser.full_name}) was deleted from the institution. Grievance returned to Department ${ticket.target_department_id} intake pool.`,
                }, { session });
            }

            if (assignedList.length > 0) {
                await complainRepository.updateMany({ active_respondent_id: cleanTargetId, status: 'UNDER_REVIEW' }, {
                    status: 'PENDING',
                    active_respondent_id: null,
                    status_description: 'Assigned faculty was removed from system. Grievance returned to department intake pool.',
                }, { session });
            }

            await complainRepository.updateMany({ target_user_id: cleanTargetId }, { target_user_id: null }, { session });
            await departmentRepository.updateMany({ department_head_id: cleanTargetId }, { department_head_id: null }, { session });
            await userRepository.deleteById(cleanTargetId, { session });

            await session.commitTransaction();
            return {
                deleted_user_id: cleanTargetId,
                removed_complaints_count: complaintIds.length,
                requeued_assigned_complaints_count: assignedList.length,
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

    async getById(id, options = {}) {
        const cleanId = sanitizeString(id, { uppercase: true });
        const user = await userRepository.findById(cleanId, options);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        return user;
    }

    async getMany(...args) {
        let currentUser = null;
        let filters = {};
        let options = {};

        if (args[0] && (args[0].role || args[0]._id || args[0].custom_id) && typeof args[0] === 'object' && !args[0].page && !args[0].limit) {
            currentUser = args[0];
            filters = args[1] || {};
            options = args[2] || {};
        } else {
            filters = args[0] || {};
            options = args[1] || {};
            currentUser = options.currentUser || filters.currentUser || null;
        }

        const cleanFilters = { ...filters };
        delete cleanFilters.currentUser;

        if (cleanFilters.admission_year !== undefined && cleanFilters.admission_year !== '') {
            const year = Number(cleanFilters.admission_year);
            if (!Number.isNaN(year)) {
                cleanFilters.admission_year = year;
            } else {
                delete cleanFilters.admission_year;
            }
        }

        if (currentUser) {
            const isHod = String(currentUser.designation || '').toLowerCase().trim() === 'hod';
            const isAdmin = currentUser.role === 'admin';
            const isTopMgmt = this.#isTopManagement(currentUser);

            if (isHod && !isAdmin && !isTopMgmt) {
                const deptId = this.#extractId(currentUser.department_id);
                if (deptId) {
                    cleanFilters.department_id = deptId;
                }
            }
        }

        return await userRepository.find(cleanFilters, options);
    }
}

export default new UserService();