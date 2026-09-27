import mongoose from 'mongoose';
import complainRepository from '../repositories/complain.repository.js';
import complainAssignmentRepository from '../repositories/complain.assignment.repository.js';
import complainHistoryRepository from '../repositories/complain.history.repository.js';
import attachmentRepository from '../repositories/attachment.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import complainCategoryRepository from '../repositories/complain.category.repository.js';
import complainSubcategoryRepository from '../repositories/complain.subcategory.repository.js';
import userRepository from '../repositories/user.repository.js';
import branchRepository from '../repositories/branch.repository.js';
import Counter from '../models/counter.model.js';
import { generateCustomId } from '../utils/id.generator.js';
import { sanitizeString } from '../utils/validator.js';
import { generateDirectUploadSignature, deleteCloudinaryAssets } from '../utils/cloudinary.util.js';
import { sendEmailAsync } from '../utils/mail.util.js';
import { buildNotificationEmail, buildAmpNotificationEmail } from '../utils/email.template.js';
import { TOP_LEVEL_MANAGEMENT, ADMINISTRATION_DEPARTMENT_CODE } from '../configs/auth.config.js';

class ComplainService {
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

    #isLeadership(user) {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!user.designation) return false;
        const des = String(user.designation).toLowerCase().trim();
        return TOP_LEVEL_MANAGEMENT.some((d) => String(d).toLowerCase().trim() === des);
    }

    #formatTitle(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/[_-]+/g, ' ')
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    #isTargetOfStatutoryGrievance(complaint, userOrId) {
        if (!complaint || !userOrId) return false;
        if (complaint.ticket_type !== 'STATUTORY_GRIEVANCE') return false;
        if (!complaint.target_user_id) return false;

        const targetIds = this.#extractAllUserIds(complaint.target_user_id);
        const userIds = this.#extractAllUserIds(userOrId);

        return targetIds.some((id) => userIds.includes(id));
    }

    #getStatutoryExclusionFilter(userOrId) {
        const ids = this.#extractAllUserIds(userOrId);
        if (!ids.length) return {};

        const matchTargets = [];
        for (const id of ids) {
            matchTargets.push(id);
            if (mongoose.Types.ObjectId.isValid(id)) {
                matchTargets.push(new mongoose.Types.ObjectId(id));
            }
        }

        return {
            $nor: [
                {
                    ticket_type: 'STATUTORY_GRIEVANCE',
                    target_user_id: { $in: matchTargets },
                },
            ],
        };
    }

    #buildCommonQueryFilter(query = {}) {
        const filter = {};

        if (query.status) {
            const statuses = String(query.status)
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
            if (statuses.length === 1) {
                filter.status = statuses[0];
            } else if (statuses.length > 1) {
                filter.status = { $in: statuses };
            }
        }

        if (query.priority) {
            const priorities = String(query.priority)
                .split(',')
                .map((p) => p.trim().toUpperCase())
                .filter(Boolean);
            if (priorities.length === 1) {
                filter.priority = priorities[0];
            } else if (priorities.length > 1) {
                filter.priority = { $in: priorities };
            }
        }

        if (query.ticket_type) {
            const types = String(query.ticket_type)
                .split(',')
                .map((t) => t.trim().toUpperCase())
                .filter(Boolean);
            if (types.length === 1) {
                filter.ticket_type = types[0];
            } else if (types.length > 1) {
                filter.ticket_type = { $in: types };
            }
        }

        if (query.role || query.complainant_role) {
            const roles = String(query.role || query.complainant_role)
                .split(',')
                .map((r) => r.trim().toLowerCase())
                .filter(Boolean);
            if (roles.length === 1) {
                filter.complainant_role = roles[0];
            } else if (roles.length > 1) {
                filter.complainant_role = { $in: roles };
            }
        }

        if (query.category_id) {
            filter.category_id = sanitizeString(query.category_id, { uppercase: true });
        }

        if (query.subcategory_id) {
            filter.subcategory_id = sanitizeString(query.subcategory_id, { uppercase: true });
        }

        const fromDateRaw = query.start_date || query.from_date || query.startDate;
        const toDateRaw = query.end_date || query.to_date || query.endDate;

        if (fromDateRaw || toDateRaw) {
            filter.createdAt = {};
            if (fromDateRaw) {
                const cleanFrom = String(fromDateRaw).split('T')[0];
                const start = new Date(`${cleanFrom}T00:00:00.000Z`);
                if (!isNaN(start.getTime())) {
                    filter.createdAt.$gte = start;
                }
            }
            if (toDateRaw) {
                const cleanTo = String(toDateRaw).split('T')[0];
                const end = new Date(`${cleanTo}T23:59:59.999Z`);
                if (!isNaN(end.getTime())) {
                    filter.createdAt.$lte = end;
                }
            }
            if (Object.keys(filter.createdAt).length === 0) {
                delete filter.createdAt;
            }
        }

        const search = (query.search || query.q || '').trim();
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { ticket_number: { $regex: escaped, $options: 'i' } },
                { custom_id: { $regex: escaped, $options: 'i' } },
            ];
        }

        return filter;
    }

    #buildSortConfig(query = {}) {
        const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'priority', 'status', 'ticket_number'];
        let sortConfig = { createdAt: -1 };

        const sortParam = query.sort || query.sort_by || query.sortBy;

        if (sortParam) {
            if (typeof sortParam === 'object') {
                return sortParam;
            }

            const sortStr = String(sortParam).trim();

            if (sortStr === 'newest') return { createdAt: -1 };
            if (sortStr === 'oldest') return { createdAt: 1 };
            if (sortStr === 'priority') return { priority: -1 };

            const [field, dir] = sortStr.split(':');
            const isExplicitDesc = dir ? dir.toLowerCase() === 'desc' : sortStr.startsWith('-');
            const cleanField = field.replace(/^[-+]/, '').trim();

            if (allowedSortFields.includes(cleanField)) {
                const orderDir = query.sort_order || query.sortOrder || query.order;
                if (orderDir) {
                    const isAsc = String(orderDir).toLowerCase() === 'asc' || String(orderDir) === '1';
                    return { [cleanField]: isAsc ? 1 : -1 };
                }
                return { [cleanField]: isExplicitDesc ? -1 : 1 };
            }
        }

        return sortConfig;
    }

    async #generateTicketNumber(session = null) {
        const year = new Date().getFullYear();
        const key = `ticket_${year}`;

        const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });

        const seq = doc?.seq || 1;
        return `TKT-${year}-${String(seq).padStart(6, '0')}`;
    }

    generateUploadSignature() {
        return generateDirectUploadSignature('campuscare/attachments');
    }

    async createComplaint(user, payload, attachments = []) {
        const title = sanitizeString(payload.title, { minLength: 5, maxLength: 200 });
        const description = sanitizeString(payload.description, { minLength: 10, maxLength: 5000 });
        let targetDepartmentId = sanitizeString(payload.target_department_id, { uppercase: true });
        const categoryId = sanitizeString(payload.category_id, { uppercase: true });
        const subcategoryId = sanitizeString(payload.subcategory_id, { uppercase: true });
        const userId = this.#extractId(user);
        const userIds = this.#extractAllUserIds(user);
        const isDirect = payload.ticket_type === 'DIRECT_QUERY';

        const targetDept = await departmentRepository.findById(targetDepartmentId);
        if (!targetDept || targetDept.status !== 'active') {
            const err = new Error('The selected department could not be found or is currently inactive');
            err.statusCode = 404;
            throw err;
        }

        if (String(targetDept.department_head_id) === String(userId)) {
            const err = new Error('You cannot submit a complaint against yourself or the department you manage');
            err.statusCode = 400;
            throw err;
        }

        let targetUser = null;
        let isConflictOfInterests = false;

        if (payload.target_user_id) {
            const targetUserId = sanitizeString(payload.target_user_id, { uppercase: true });
            if (userIds.includes(targetUserId)) {
                const err = new Error('You cannot submit a complaint against yourself');
                err.statusCode = 400;
                throw err;
            }

            targetUser = await userRepository.findById(targetUserId);
            if (!targetUser || targetUser.status !== 'active') {
                const err = new Error('The selected person could not be found or their account is inactive');
                err.statusCode = 404;
                throw err;
            }

            if (targetUser.role === 'student') {
                const err = new Error('Complaints and direct inquiries can only be addressed to faculty or staff members');
                err.statusCode = 400;
                throw err;
            }

            if (!isDirect && String(targetDept.department_head_id) === String(targetUserId)) {
                isConflictOfInterests = true;
                targetDepartmentId = ADMINISTRATION_DEPARTMENT_CODE;
            }
        }

        const category = await complainCategoryRepository.findById(categoryId);
        if (!category || category.status !== 'active') {
            const err = new Error('The selected category could not be found or is currently inactive');
            err.statusCode = 400;
            throw err;
        }

        const subcategory = await complainSubcategoryRepository.findById(subcategoryId);
        if (!subcategory || String(subcategory.category_id) !== String(categoryId) || subcategory.status !== 'active') {
            const err = new Error('The selected subcategory does not belong to this category');
            err.statusCode = 400;
            throw err;
        }

        const subAudience = (subcategory.target_audience || 'all').toLowerCase();
        if (user.role === 'student') {
            if (!['student', 'all'].includes(subAudience)) {
                const err = new Error(`The category "${subcategory.title}" is available for faculty complaints only`);
                err.statusCode = 403;
                throw err;
            }
        } else if (user.role === 'faculty') {
            if (!['faculty', 'all'].includes(subAudience)) {
                const err = new Error(`The category "${subcategory.title}" is available for student complaints only`);
                err.statusCode = 403;
                throw err;
            }
        }

        let derivedPriority = 'MEDIUM';
        if (payload.priority && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(payload.priority.toUpperCase())) {
            derivedPriority = payload.priority.toUpperCase();
        } else if (subcategory.default_priority) {
            derivedPriority = subcategory.default_priority;
        } else if (category.default_priority) {
            derivedPriority = category.default_priority;
        }

        let complainantDeptId = this.#extractId(user.department_id);
        if (!complainantDeptId && user.branch_id) {
            const branch = await branchRepository.findById(this.#extractId(user.branch_id));
            if (branch) complainantDeptId = this.#extractId(branch.department_id);
        }
        if (!complainantDeptId) {
            complainantDeptId = targetDepartmentId;
        }

        const initialStatus = isDirect ? 'UNDER_REVIEW' : 'PENDING';
        const activeRespondentId = isDirect ? this.#extractId(targetUser) : null;

        const session = await mongoose.startSession();
        session.startTransaction();

        let generatedId = null;
        let ticketNumber = null;

        try {
            ticketNumber = await this.#generateTicketNumber(session);
            generatedId = await generateCustomId('CMP', session);

            const complainDoc = {
                _id: generatedId,
                custom_id: generatedId,
                ticket_number: ticketNumber,
                ticket_type: isDirect ? 'DIRECT_QUERY' : 'STATUTORY_GRIEVANCE',
                title,
                description,
                target_department_id: targetDepartmentId,
                complainant_department_id: complainantDeptId,
                branch_id: user.role === 'student' ? (this.#extractId(user.branch_id) || null) : null,
                programme_id: user.role === 'student' ? (this.#extractId(user.programme_id) || null) : null,
                category_id: categoryId,
                subcategory_id: subcategoryId,
                complainant_id: userId,
                complainant_role: user.role,
                target_user_id: targetUser ? this.#extractId(targetUser) : null,
                priority: derivedPriority,
                is_anonymous: isDirect ? false : Boolean(payload.is_anonymous),
                status: initialStatus,
                status_description: isDirect ? `Inquiry sent directly to ${targetUser.full_name}` : (isConflictOfInterests ? 'Forwarded to Central Administration for independent review.' : 'Complaint submitted and awaiting department review.'),
                active_respondent_id: activeRespondentId,
            };

            await complainRepository.create(complainDoc, { session });

            const historyRemarks = isDirect ? `Inquiry submitted to ${targetUser.full_name}` : (isConflictOfInterests ? 'Forwarded to Central Administration for independent review' : `Complaint submitted with ${derivedPriority.toLowerCase()} priority`);

            const historyId = await generateCustomId('HIS', session);
            await complainHistoryRepository.create({
                _id: historyId,
                custom_id: historyId,
                complain_id: generatedId,
                actor_id: userId,
                action: 'SUBMITTED',
                previous_status: null,
                new_status: initialStatus,
                remarks: historyRemarks,
            }, { session });

            if (isDirect) {
                const assignmentId = await generateCustomId('ASN', session);
                await complainAssignmentRepository.create({
                    _id: assignmentId,
                    custom_id: assignmentId,
                    complain_id: generatedId,
                    assigner_id: userId,
                    respondent_id: activeRespondentId,
                    description: `Inquiry submitted by ${user.full_name || 'a campus member'}`,
                    is_active: true,
                }, { session });
            }

            if (Array.isArray(attachments) && attachments.length > 0) {
                if (attachments.length > 5) {
                    const err = new Error('You can upload a maximum of 5 attachments');
                    err.statusCode = 400;
                    throw err;
                }
                const attachmentDocs = [];
                for (const att of attachments) {
                    const attId = await generateCustomId('ATT', session);
                    if (!att.public_id || typeof att.public_id !== 'string') {
                        const err = new Error('File upload incomplete. Please re-attach your documents.');
                        err.statusCode = 400;
                        throw err;
                    }

                    attachmentDocs.push({
                        _id: attId,
                        complain_id: generatedId,
                        file_name: sanitizeString(att.file_name || 'attachment', { maxLength: 150 }),
                        file_type: sanitizeString(att.file_type || 'FILE', { uppercase: true }),
                        file_url: sanitizeString(att.file_url),
                        public_id: sanitizeString(att.public_id),
                    });
                }
                await attachmentRepository.insertMany(attachmentDocs, { session });
            }

            await session.commitTransaction();
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }

        const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';

        if (user.email) {
            const emailParams = {
                recipientName: user.full_name || 'Campus Member',
                badgeText: isDirect ? 'Inquiry Received' : 'Complaint Submitted',
                badgeColor: '#2563EB',
                headline: `${isDirect ? 'Inquiry' : 'Complaint'} Received`,
                introText: `Your ${isDirect ? 'inquiry' : 'complaint'} has been received and added to our system.`,
                details: [
                    { label: 'Reference Number', value: ticketNumber },
                    { label: 'Subject', value: title },
                    { label: 'Department', value: targetDept.department_name },
                    { label: 'Type', value: isDirect ? 'General Inquiry' : 'Formal Complaint' },
                    { label: 'Priority', value: derivedPriority },
                    { label: 'Status', value: isDirect ? 'In Review' : 'Pending' },
                ],
                actionNote: isDirect ? `Your inquiry has been sent to ${targetUser?.full_name}. You will be notified once they respond.` : 'Your complaint is currently with the department and will be assigned for review shortly.',
                expandableDetails: {
                    title: 'View Description',
                    content: description,
                },
                ctaLabel: 'Track Status on Portal',
                ctaUrl: `${portalUrl}/complaints/my`,
            };

            sendEmailAsync({
                to: user.email,
                subject: `${ticketNumber}: ${title}`,
                html: buildNotificationEmail(emailParams),
                amp: buildAmpNotificationEmail(emailParams),
            });
        }

        if (isDirect && targetUser?.email) {
            const targetEmailParams = {
                recipientName: targetUser.full_name,
                badgeText: 'Action Required',
                badgeColor: '#4F46E5',
                headline: 'New Inquiry Assigned',
                introText: `You have received an inquiry from ${user.full_name || 'a campus member'}.`,
                details: [
                    { label: 'Reference Number', value: ticketNumber },
                    { label: 'Subject', value: title },
                    { label: 'Submitted By', value: this.#formatTitle(user.role) },
                    { label: 'Priority', value: derivedPriority },
                ],
                actionNote: 'Please review the details in the portal and provide your response.',
                expandableDetails: {
                    title: 'Inquiry Details',
                    content: description,
                },
                ctaLabel: 'Open Portal',
                ctaUrl: `${portalUrl}/complaints/assigned`,
            };

            sendEmailAsync({
                to: targetUser.email,
                subject: `Action Required: Inquiry ${ticketNumber}`,
                html: buildNotificationEmail(targetEmailParams),
                amp: buildAmpNotificationEmail(targetEmailParams),
            });
        }

        if (derivedPriority === 'CRITICAL') {
            try {
                const emailedUserIds = new Set(userIds);
                const emailedAddresses = new Set();

                if (user.email) {
                    emailedAddresses.add(user.email.toLowerCase().trim());
                }

                if (isDirect && targetUser) {
                    this.#extractAllUserIds(targetUser).forEach((id) => emailedUserIds.add(id));
                    if (targetUser.email) {
                        emailedAddresses.add(targetUser.email.toLowerCase().trim());
                    }
                }

                let complainantHodUser = null;
                if (complainantDeptId) {
                    const compDept = (complainantDeptId === targetDepartmentId) ? targetDept : await departmentRepository.findById(complainantDeptId);
                    if (compDept?.department_head_id) {
                        complainantHodUser = await userRepository.findById(compDept.department_head_id);
                    }
                }

                const leadershipDesignations = ['director', 'vice_chancellor', 'pro_vice_chancellor', 'dean', 'DIRECTOR', 'VICE_CHANCELLOR', 'PRO_VICE_CHANCELLOR', 'DEAN'];
                const leadershipResult = await userRepository.find({
                    designation: { $in: leadershipDesignations },
                    status: 'active',
                }, { limit: 0 });

                const leadershipUsers = Array.isArray(leadershipResult) ? leadershipResult : (leadershipResult?.users || []);
                const criticalRecipients = [];
                const registerRecipient = (candidate) => {
                    if (!candidate || !candidate.email || candidate.status !== 'active') return;
                    const cleanEmail = candidate.email.toLowerCase().trim();
                    const candidateIds = this.#extractAllUserIds(candidate);

                    const alreadyDispatched = candidateIds.some((id) => emailedUserIds.has(id)) || emailedAddresses.has(cleanEmail);
                    if (!alreadyDispatched) {
                        candidateIds.forEach((id) => emailedUserIds.add(id));
                        emailedAddresses.add(cleanEmail);
                        criticalRecipients.push(candidate);
                    }
                };

                if (complainantHodUser) registerRecipient(complainantHodUser);
                for (const leader of leadershipUsers) registerRecipient(leader);

                for (const recipient of criticalRecipients) {
                    const criticalAlertParams = {
                        recipientName: recipient.full_name || 'Staff Member',
                        badgeText: 'Urgent Notice',
                        badgeColor: '#DC2626',
                        headline: `Urgent ${isDirect ? 'Inquiry' : 'Complaint'} Received`,
                        introText: `A complaint marked with <strong>Critical</strong> priority has been submitted and forwarded for immediate review.`,
                        details: [
                            { label: 'Reference Number', value: ticketNumber },
                            { label: 'Subject', value: title },
                            { label: 'Department', value: targetDept.department_name },
                            { label: 'Type', value: isDirect ? 'General Inquiry' : 'Formal Complaint' },
                            { label: 'Submitted By', value: this.#formatTitle(user.role) },
                            { label: 'Priority', value: derivedPriority },
                            { label: 'Status', value: isDirect ? 'In Review' : 'Pending' },
                        ],
                        expandableDetails: {
                            title: 'Complaint Description',
                            content: description,
                        },
                        actionNote: 'This urgent complaint has been forwarded to department leadership for immediate review.',
                        ctaLabel: 'View Details',
                        ctaUrl: `${portalUrl}/complaints/assigned`,
                    };

                    sendEmailAsync({
                        to: recipient.email,
                        subject: `${ticketNumber}: ${title}`,
                        html: buildNotificationEmail(criticalAlertParams),
                        amp: buildAmpNotificationEmail(criticalAlertParams),
                    });
                }
            } catch (critMailErr) {
                console.error('[ComplainService] Failed to send critical escalation emails:', critMailErr);
            }
        }

        return await complainRepository.findById(generatedId, { populate: true, viewerRole: user.role, viewerUser: user });
    }

    async getById(id, currentUser) {
        const cleanId = sanitizeString(id, { uppercase: true });

        const complaint = await complainRepository.findById(cleanId, {
            populate: true,
            deep: true,
        });

        if (!complaint) {
            const err = new Error(`Complaint "${cleanId}" could not be found`);
            err.statusCode = 404;
            throw err;
        }

        if (this.#isTargetOfStatutoryGrievance(complaint, currentUser)) {
            const err = new Error('You do not have permission to view a complaint submitted against you');
            err.statusCode = 403;
            throw err;
        }

        const userIds = this.#extractAllUserIds(currentUser);
        const userDeptId = this.#extractId(currentUser.department_id);

        const complainantIds = this.#extractAllUserIds(complaint.complainant_id || complaint.complainant);
        const activeRespondentIds = this.#extractAllUserIds(complaint.active_respondent_id || complaint.active_respondent);
        const targetUserIds = this.#extractAllUserIds(complaint.target_user_id || complaint.target_user);
        const targetDeptId = this.#extractId(complaint.target_department_id) || this.#extractId(complaint.target_department);
        const complainantDeptId = this.#extractId(complaint.complainant_department_id) || this.#extractId(complaint.complainant_department);

        const isComplainant = complainantIds.some((id) => userIds.includes(id));
        const isActiveRespondent = activeRespondentIds.some((id) => userIds.includes(id));
        const isTargetUser = targetUserIds.some((id) => userIds.includes(id));
        const isLeadership = this.#isLeadership(currentUser);

        const isTargetHod = currentUser.designation === 'hod' && targetDeptId === userDeptId && !isTargetUser;
        const isComplainantHod = currentUser.designation === 'hod' && complainantDeptId === userDeptId && !isTargetUser;

        let isPreviousAssignee = false;
        if (!isComplainant && !isActiveRespondent && !isTargetHod && !isComplainantHod && !isLeadership) {
            const previousAssignment = await complainAssignmentRepository.find({
                complain_id: cleanId,
                respondent_id: { $in: userIds },
            });
            isPreviousAssignee = (previousAssignment.assignments || []).length > 0;
        }

        if (!isComplainant && !isActiveRespondent && !isTargetHod && !isComplainantHod && !isLeadership && !isPreviousAssignee) {
            const err = new Error('You do not have permission to view this complaint');
            err.statusCode = 403;
            throw err;
        }

        if (complaint.is_anonymous && !isComplainant && currentUser.role !== 'admin') {
            return complainRepository.maskComplainant(complaint, currentUser.role, currentUser);
        }

        return complaint;
    }

    async getMyComplaints(userOrId, query = {}) {
        const userId = this.#extractId(userOrId);
        const viewerRole = userOrId?.role || null;

        const filter = {
            complainant_id: userId,
            ...this.#buildCommonQueryFilter(query),
            ...this.#getStatutoryExclusionFilter(userId),
        };

        const targetDept = query.target_department_id || query.department_id;
        if (targetDept) {
            filter.target_department_id = sanitizeString(targetDept, { uppercase: true });
        }

        const safeLimit = query.limit !== undefined ? Math.max(0, Math.min(Number(query.limit) || 12, 100)) : 12;
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole,
            viewerUser: userOrId,
        });
    }

    async getStudentDashboard(user, query = {}) {
        const userId = this.#extractId(user);
        const conflictFilter = this.#getStatutoryExclusionFilter(user);

        const [complaintsResult, pendingCount, underReviewCount, resolvedCount, rejectedCount] = await Promise.all([
            complainRepository.find({ complainant_id: userId, ...conflictFilter }, {
                page: 1,
                limit: query.limit || 2,
                populate: true,
                viewerRole: user.role,
                viewerUser: user,
            }),
            complainRepository.find({
                complainant_id: userId, status: 'PENDING', ...conflictFilter
            }, { limit: 0 }),
            complainRepository.find({
                complainant_id: userId, status: 'UNDER_REVIEW', ...conflictFilter
            }, { limit: 0 }),
            complainRepository.find({
                complainant_id: userId, status: 'RESOLVED', ...conflictFilter
            }, { limit: 0 }),
            complainRepository.find({
                complainant_id: userId, status: 'REJECTED', ...conflictFilter
            }, { limit: 0 }),
        ]);

        return {
            total_cases: complaintsResult.meta.total,
            pending_count: pendingCount.meta.total,
            under_review_count: underReviewCount.meta.total,
            resolved_count: resolvedCount.meta.total,
            rejected_count: rejectedCount.meta.total,
            complaints: complaintsResult.complains,
            meta: complaintsResult.meta,
        };
    }

    async getFacultyDashboard(user, query = {}) {
        const userId = this.#extractId(user);
        const conflictFilter = this.#getStatutoryExclusionFilter(user);

        const [activeTasks, resolvedTasks, rejectedTasks, allTasks] = await Promise.all([
            complainRepository.find({
                active_respondent_id: userId, status: 'UNDER_REVIEW', ...conflictFilter
            }, { limit: 0, populate: true, viewerRole: user.role, viewerUser: user }),
            complainRepository.find({
                'resolution_details.resolved_by': userId, status: 'RESOLVED', ...conflictFilter
            }, { limit: 0, populate: true, viewerRole: user.role, viewerUser: user }),
            complainRepository.find({
                'rejection_details.rejected_by': userId, status: 'REJECTED', ...conflictFilter
            }, { limit: 0, populate: true, viewerRole: user.role, viewerUser: user }),
            complainAssignmentRepository.find({ respondent_id: userId }, { limit: 0 }),
        ]);

        return {
            faculty_id: userId,
            active_assigned_count: activeTasks.meta.total,
            total_resolved_count: resolvedTasks.meta.total,
            total_rejected_count: rejectedTasks.meta.total,
            lifetime_assigned_tasks_count: allTasks.meta.total,
            active_tasks: activeTasks.complains,
            resolved_tasks: resolvedTasks.complains,
            rejected_tasks: rejectedTasks.complains,
        };
    }

    async getFacultyAssignedComplaints(user, query = {}) {
        const userIds = this.#extractAllUserIds(user);
        const userTargets = [];
        for (const id of userIds) {
            userTargets.push(id);
            if (mongoose.Types.ObjectId.isValid(id)) {
                userTargets.push(new mongoose.Types.ObjectId(id));
            }
        }

        const commonFilter = this.#buildCommonQueryFilter(query);
        const statutoryFilter = this.#getStatutoryExclusionFilter(user);

        const andConditions = [
            { active_respondent_id: { $in: userTargets } },
        ];

        if (Object.keys(commonFilter).length > 0) andConditions.push(commonFilter);
        if (Object.keys(statutoryFilter).length > 0) andConditions.push(statutoryFilter);

        const filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

        if (query.target_department_id || query.department_id) {
            filter.target_department_id = sanitizeString(query.target_department_id || query.department_id, { uppercase: true });
        }

        if (!commonFilter.status && !query.status) {
            filter.status = 'UNDER_REVIEW';
        }

        const safeLimit = Math.max(1, Math.min(Number(query.limit) || 10, 100));
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole: user.role,
            viewerUser: user,
        });
    }

    async getFacultyAssignmentHistory(user, query = {}) {
        const userIds = this.#extractAllUserIds(user);
        const userTargets = [];
        for (const id of userIds) {
            userTargets.push(id);
            if (mongoose.Types.ObjectId.isValid(id)) {
                userTargets.push(new mongoose.Types.ObjectId(id));
            }
        }

        let assignedComplainIds = [];
        try {
            assignedComplainIds = await complainAssignmentRepository.findDistinctComplainIds(userTargets);
        } catch {
            assignedComplainIds = [];
        }

        const facultyConditions = [
            { active_respondent_id: { $in: userTargets } },
            { 'resolution_details.resolved_by': { $in: userTargets } },
            { 'rejection_details.rejected_by': { $in: userTargets } },
        ];

        if (Array.isArray(assignedComplainIds) && assignedComplainIds.length > 0) {
            facultyConditions.push({ _id: { $in: assignedComplainIds } });
            facultyConditions.push({ custom_id: { $in: assignedComplainIds } });
        }

        const commonFilter = this.#buildCommonQueryFilter(query);
        const statutoryFilter = this.#getStatutoryExclusionFilter(user);

        const andConditions = [
            { $or: facultyConditions },
        ];

        if (Object.keys(commonFilter).length > 0) andConditions.push(commonFilter);
        if (Object.keys(statutoryFilter).length > 0) andConditions.push(statutoryFilter);

        const filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

        if (query.target_department_id || query.department_id) {
            filter.target_department_id = sanitizeString(query.target_department_id || query.department_id, { uppercase: true });
        }

        if (!commonFilter.status && !query.status) {
            filter.status = { $in: ['RESOLVED', 'REJECTED'] };
        }

        const safeLimit = Math.max(1, Math.min(Number(query.limit) || 10, 100));
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole: user.role,
            viewerUser: user,
        });
    }

    async getHodDashboard(user, query = {}) {
        let currentUser = user;
        if (!currentUser?.department_id) {
            currentUser = await userRepository.findById(this.#extractId(user));
        }
        const deptId = this.#extractId(currentUser?.department_id);
        if (!deptId) {
            const err = new Error('HOD department not found');
            err.statusCode = 400;
            throw err;
        }

        const deptTargets = [deptId];
        if (mongoose.Types.ObjectId.isValid(deptId)) {
            deptTargets.push(new mongoose.Types.ObjectId(deptId));
        }

        const conflictFilter = this.#getStatutoryExclusionFilter(currentUser);

        const [inboundQueue, outboundQueue, metrics] = await Promise.all([
            complainRepository.find({
                target_department_id: deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets },
                status: { $in: ['PENDING', 'UNDER_REVIEW'] },
                ...conflictFilter,
            }, { limit: 0, viewerRole: currentUser.role, viewerUser: currentUser }),
            complainRepository.find({
                complainant_department_id: deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets },
                target_department_id: { $nin: deptTargets },
                ...conflictFilter,
            }, { limit: 0, viewerRole: currentUser.role, viewerUser: currentUser }),
            complainRepository.getInstitutionalMetrics({
                target_department_id: deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets },
                ...conflictFilter,
            }),
        ]);

        return {
            department_id: deptId,
            active_inbound_count: inboundQueue.meta.total,
            total_outbound_count: outboundQueue.meta.total,
            metrics: metrics.department_benchmarks?.[0] || null,
        };
    }

    async getLeadershipDashboard(user, query = {}) {
        const conflictFilter = this.#getStatutoryExclusionFilter(user);
        const metrics = await complainRepository.getInstitutionalMetrics({ ...conflictFilter });
        return {
            summary: metrics.executive_summary,
            priority_matrix: metrics.priority_matrix,
            department_benchmarks: metrics.department_benchmarks,
        };
    }

    async getUserComplains(user, query = {}) {
        const requestedUserId = query.user_id || query.userId || query.id;
        const userIds = this.#extractAllUserIds(user);
        const isLeadership = this.#isLeadership(user);
        const isAdmin = user?.role === 'admin';
        const isHod = String(user?.designation || '').toLowerCase().trim() === 'hod';
        const hodDeptId = this.#extractId(user?.department_id);

        const conflictFilter = this.#getStatutoryExclusionFilter(user);
        const commonFilter = this.#buildCommonQueryFilter(query);
        const filter = { ...commonFilter, ...conflictFilter };

        let isSelf = false;

        if (requestedUserId) {
            const cleanTargetId = sanitizeString(requestedUserId, { uppercase: true });
            isSelf = userIds.includes(cleanTargetId) || userIds.includes(requestedUserId);

            if (!isSelf && !isAdmin && !isLeadership) {
                if (!isHod) {
                    const err = new Error("You do not have permission to view this user's complaints");
                    err.statusCode = 403;
                    throw err;
                }

                if (hodDeptId) {
                    const deptTargets = [hodDeptId];
                    if (mongoose.Types.ObjectId.isValid(hodDeptId)) {
                        deptTargets.push(new mongoose.Types.ObjectId(hodDeptId));
                    }
                    filter.complainant_department_id = deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets };
                } else {
                    const err = new Error('HOD department not found');
                    err.statusCode = 400;
                    throw err;
                }
            }

            const matchTargets = [cleanTargetId];
            if (mongoose.Types.ObjectId.isValid(cleanTargetId)) {
                matchTargets.push(new mongoose.Types.ObjectId(cleanTargetId));
            }
            if (cleanTargetId !== requestedUserId) {
                matchTargets.push(requestedUserId);
                if (mongoose.Types.ObjectId.isValid(requestedUserId)) {
                    matchTargets.push(new mongoose.Types.ObjectId(requestedUserId));
                }
            }
            filter.complainant_id = matchTargets.length === 1 ? matchTargets[0] : { $in: matchTargets };
        } else {
            if (isHod && !isAdmin && !isLeadership) {
                if (hodDeptId) {
                    const deptTargets = [hodDeptId];
                    if (mongoose.Types.ObjectId.isValid(hodDeptId)) {
                        deptTargets.push(new mongoose.Types.ObjectId(hodDeptId));
                    }
                    filter.complainant_department_id = deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets };
                }
            } else {
                isSelf = true;
                const matchTargets = [];
                for (const id of userIds) {
                    matchTargets.push(id);
                    if (mongoose.Types.ObjectId.isValid(id)) {
                        matchTargets.push(new mongoose.Types.ObjectId(id));
                    }
                }
                filter.complainant_id = matchTargets.length === 1 ? matchTargets[0] : { $in: matchTargets };
            }
        }

        if (!isSelf && !isAdmin) {
            filter.is_anonymous = false;
        }

        if (query.target_department_id) {
            filter.target_department_id = sanitizeString(query.target_department_id, { uppercase: true });
        } else if (query.department_id && (isSelf || isAdmin || isLeadership)) {
            filter.target_department_id = sanitizeString(query.department_id, { uppercase: true });
        }

        if (query.complainant_department_id && (isSelf || isAdmin || isLeadership)) {
            filter.complainant_department_id = sanitizeString(query.complainant_department_id, { uppercase: true });
        }

        const safeLimit = query.limit !== undefined ? Math.max(0, Math.min(Number(query.limit) || 12, 100)) : 12;
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole: user?.role,
            viewerUser: user,
        });
    }

    async getUserComplain(user, query = {}) {
        return await this.getUserComplains(user, query);
    }

    async getInboundDepartmentComplaints(...args) {
        let query = {};
        let currentUser = {};
        let departmentId = null;

        if (typeof args[0] === 'string') {
            departmentId = args[0];
            query = args[1] || {};
            currentUser = args[2] || {};
        } else {
            query = args[0] || {};
            currentUser = args[1] || {};
            departmentId = query.target_department_id || query.department_id || currentUser?.department_id;
        }

        const isLeadership = this.#isLeadership(currentUser);
        const isAdmin = currentUser?.role === 'admin';
        const isHod = String(currentUser?.designation || '').toLowerCase().trim() === 'hod';
        const userDeptId = this.#extractId(currentUser?.department_id);

        let cleanDeptId = null;

        if (isHod && !isAdmin && !isLeadership) {
            if (!userDeptId) {
                const err = new Error('HOD department not found');
                err.statusCode = 400;
                throw err;
            }
            if (departmentId && this.#extractId(departmentId) !== userDeptId) {
                const err = new Error('You do not have permission to view complaints of another department');
                err.statusCode = 403;
                throw err;
            }
            cleanDeptId = userDeptId;
        } else {
            cleanDeptId = this.#extractId(departmentId);
            if (!cleanDeptId) {
                const err = new Error('Department identifier could not be resolved');
                err.statusCode = 400;
                throw err;
            }
        }

        const deptTargets = [cleanDeptId];
        if (mongoose.Types.ObjectId.isValid(cleanDeptId)) {
            deptTargets.push(new mongoose.Types.ObjectId(cleanDeptId));
        }

        const filter = {
            ...this.#buildCommonQueryFilter(query),
            target_department_id: deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets },
            ...this.#getStatutoryExclusionFilter(currentUser),
        };

        if (query.complainant_department_id) {
            const compDeptId = sanitizeString(query.complainant_department_id, { uppercase: true });
            const compTargets = [compDeptId];
            if (mongoose.Types.ObjectId.isValid(compDeptId)) {
                compTargets.push(new mongoose.Types.ObjectId(compDeptId));
            }
            filter.complainant_department_id = compTargets.length === 1 ? compTargets[0] : { $in: compTargets };
        }

        const safeLimit = query.limit !== undefined ? Math.max(0, Math.min(Number(query.limit) || 12, 100)) : 12;
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole: currentUser?.role,
            viewerUser: currentUser,
        });
    }

    async getOutboundDepartmentComplaints(...args) {
        let query = {};
        let currentUser = {};
        let departmentId = null;

        if (typeof args[0] === 'string') {
            departmentId = args[0];
            query = args[1] || {};
            currentUser = args[2] || {};
        } else {
            query = args[0] || {};
            currentUser = args[1] || {};
            departmentId = query.complainant_department_id || query.department_id || currentUser?.department_id;
        }

        const isLeadership = this.#isLeadership(currentUser);
        const isAdmin = currentUser?.role === 'admin';
        const isHod = String(currentUser?.designation || '').toLowerCase().trim() === 'hod';
        const userDeptId = this.#extractId(currentUser?.department_id);

        let cleanDeptId = null;

        if (isHod && !isAdmin && !isLeadership) {
            if (!userDeptId) {
                const err = new Error('HOD department not found');
                err.statusCode = 400;
                throw err;
            }
            if (departmentId && this.#extractId(departmentId) !== userDeptId) {
                const err = new Error('You do not have permission to view complaints of another department');
                err.statusCode = 403;
                throw err;
            }
            cleanDeptId = userDeptId;
        } else {
            cleanDeptId = this.#extractId(departmentId);
            if (!cleanDeptId) {
                const err = new Error('Department identifier could not be resolved');
                err.statusCode = 400;
                throw err;
            }
        }

        const deptTargets = [cleanDeptId];
        if (mongoose.Types.ObjectId.isValid(cleanDeptId)) {
            deptTargets.push(new mongoose.Types.ObjectId(cleanDeptId));
        }

        const filter = {
            ...this.#buildCommonQueryFilter(query),
            complainant_department_id: deptTargets.length === 1 ? deptTargets[0] : { $in: deptTargets },
            ...this.#getStatutoryExclusionFilter(currentUser),
        };

        if (query.target_department_id) {
            const targetDeptId = sanitizeString(query.target_department_id, { uppercase: true });
            const targetTargets = [targetDeptId];
            if (mongoose.Types.ObjectId.isValid(targetDeptId)) {
                targetTargets.push(new mongoose.Types.ObjectId(targetDeptId));
            }
            filter.target_department_id = targetTargets.length === 1 ? targetTargets[0] : { $in: targetTargets };
        } else {
            filter.target_department_id = { $nin: deptTargets };
        }

        const safeLimit = query.limit !== undefined ? Math.max(0, Math.min(Number(query.limit) || 12, 100)) : 12;
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole: currentUser?.role,
            viewerUser: currentUser,
        });
    }

    async getCollegeComplaints(query = {}, currentUser = {}) {
        const filter = {
            ...this.#buildCommonQueryFilter(query),
            ...this.#getStatutoryExclusionFilter(currentUser),
        };

        if (query.target_department_id) {
            filter.target_department_id = sanitizeString(query.target_department_id, { uppercase: true });
        }
        if (query.complainant_department_id) {
            filter.complainant_department_id = sanitizeString(query.complainant_department_id, { uppercase: true });
        }

        const safeLimit = query.limit !== undefined ? Math.max(0, Math.min(Number(query.limit) || 12, 100)) : 12;
        const safePage = Math.max(1, Number(query.page) || 1);

        return await complainRepository.find(filter, {
            page: safePage,
            limit: safeLimit,
            sort: this.#buildSortConfig(query),
            populate: query.populate === 'true' || query.populate === true,
            viewerRole: currentUser.role,
            viewerUser: currentUser,
        });
    }

    async assignComplaint(assignerUser, { complain_id, respondent_id, description }) {
        const complainId = sanitizeString(complain_id, { uppercase: true });
        const respondentId = sanitizeString(respondent_id, { uppercase: true });
        const notes = sanitizeString(description, { minLength: 5, maxLength: 5000 });
        const assignerId = this.#extractId(assignerUser);
        const assignerDeptId = this.#extractId(assignerUser.department_id);

        const complaint = await complainRepository.findById(complainId);
        if (!complaint) {
            const err = new Error('Complaint not found');
            err.statusCode = 404;
            throw err;
        }

        if (this.#isTargetOfStatutoryGrievance(complaint, assignerUser)) {
            const err = new Error('You cannot assign or manage a complaint submitted against yourself');
            err.statusCode = 403;
            throw err;
        }

        const targetIds = this.#extractAllUserIds(complaint.target_user_id);
        if (complaint.ticket_type === 'STATUTORY_GRIEVANCE' && targetIds.includes(respondentId)) {
            const err = new Error('A complaint cannot be assigned to the person it was filed against');
            err.statusCode = 400;
            throw err;
        }

        if (['RESOLVED', 'REJECTED'].includes(complaint.status)) {
            const err = new Error(`This complaint has already been ${complaint.status.toLowerCase()} and cannot be reassigned`);
            err.statusCode = 400;
            throw err;
        }

        if (assignerId === respondentId) {
            const err = new Error('You cannot assign a complaint to yourself');
            err.statusCode = 400;
            throw err;
        }

        const complainantId = this.#extractId(complaint.complainant_id) || this.#extractId(complaint.complainant);
        if (complainantId === respondentId) {
            const err = new Error('Cannot assign this complaint to the person who submitted it');
            err.statusCode = 400;
            throw err;
        }

        const activeRespondentId = this.#extractId(complaint.active_respondent_id);
        if (activeRespondentId === respondentId) {
            const err = new Error('This complaint is already assigned to this faculty member');
            err.statusCode = 400;
            throw err;
        }

        const respondent = await userRepository.findById(respondentId);
        if (!respondent || respondent.status !== 'active') {
            const err = new Error('The selected faculty member could not be found or is inactive');
            err.statusCode = 404;
            throw err;
        }

        if (respondent.role === 'student' || !['faculty', 'admin'].includes(respondent.role)) {
            const err = new Error('Complaints can only be assigned to active faculty or staff members');
            err.statusCode = 400;
            throw err;
        }

        const targetDeptId = this.#extractId(complaint.target_department_id) || this.#extractId(complaint.target_department);
        const respondentDeptId = this.#extractId(respondent.department_id);

        const targetDept = await departmentRepository.findById(targetDeptId);
        const validTargetDeptIds = new Set([targetDeptId]);
        if (targetDept) {
            if (targetDept._id) validTargetDeptIds.add(targetDept._id.toString());
            if (targetDept.id) validTargetDeptIds.add(targetDept.id.toString());
            if (targetDept.custom_id) validTargetDeptIds.add(targetDept.custom_id.toString());
            if (targetDept.department_code) validTargetDeptIds.add(targetDept.department_code.toString());
        }

        const isTargetHod = assignerUser.designation === 'hod' && targetDeptId === assignerDeptId;
        const isLeadership = this.#isLeadership(assignerUser);

        if (!isTargetHod && !isLeadership) {
            const err = new Error('You do not have permission to assign this complaint');
            err.statusCode = 403;
            throw err;
        }

        if (!respondentDeptId || !validTargetDeptIds.has(respondentDeptId)) {
            const deptName = targetDept?.department_name || targetDeptId;
            const err = new Error(`Cannot assign to ${respondent.full_name}: this faculty member does not belong to the ${deptName} department. Assignment can only be made within the same department. To change the department, use transfer department.`);
            err.statusCode = 400;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await complainAssignmentRepository.updateMany({
                complain_id: complainId, is_active: true
            }, { is_active: false }, { session });

            const assignmentId = await generateCustomId('ASN', session);
            await complainAssignmentRepository.create({
                _id: assignmentId,
                custom_id: assignmentId,
                complain_id: complainId,
                assigner_id: assignerId,
                respondent_id: respondentId,
                description: notes,
                is_active: true,
            }, { session });

            const historyRemarks = `Assigned to ${respondent.full_name}: ${notes}`;

            const historyId = await generateCustomId('HIS', session);
            await complainHistoryRepository.create({
                _id: historyId,
                custom_id: historyId,
                complain_id: complainId,
                actor_id: assignerId,
                action: 'ASSIGNED',
                previous_status: complaint.status,
                new_status: 'UNDER_REVIEW',
                remarks: historyRemarks,
            }, { session });

            await complainRepository.updateById(complainId, {
                status: 'UNDER_REVIEW',
                target_department_id: targetDeptId,
                active_respondent_id: respondentId,
                status_description: `Assigned to ${respondent.full_name} for review`,
            }, { session });

            await session.commitTransaction();

            const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';

            if (respondent.email) {
                const facEmailParams = {
                    recipientName: respondent.full_name,
                    badgeText: 'Complaint Assigned',
                    badgeColor: '#1D4ED8',
                    headline: 'Complaint Assigned for Review',
                    introText: `<strong>${assignerUser.full_name || 'Department Head'}</strong> has assigned complaint <strong>${complaint.ticket_number}</strong> to you for review.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Subject', value: complaint.title },
                        { label: 'Instructions / Notes', value: notes },
                        { label: 'Priority', value: complaint.priority },
                    ],
                    expandableDetails: {
                        title: 'Complaint Description',
                        content: complaint.description,
                    },
                    actionNote: 'Please review the details and attachments in the portal to take action.',
                    ctaLabel: 'View Assigned Complaint',
                    ctaUrl: `${portalUrl}/complaints/assigned`,
                };

                sendEmailAsync({
                    to: respondent.email,
                    subject: `Assigned Complaint: ${complaint.ticket_number}`,
                    html: buildNotificationEmail(facEmailParams),
                    amp: buildAmpNotificationEmail(facEmailParams),
                });
            }

            const complainantUser = await userRepository.findById(complainantId);
            if (complainantUser?.email) {
                const complainantParams = {
                    recipientName: complainantUser.full_name || 'Complainant',
                    badgeText: 'In Progress',
                    badgeColor: '#2563EB',
                    headline: 'Reviewer Assigned to Your Complaint',
                    introText: `Your complaint (<strong>${complaint.ticket_number}</strong>) has been reviewed and assigned to a faculty member.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Assigned To', value: respondent.full_name },
                        { label: 'Department', value: targetDept?.department_name || targetDeptId },
                        { label: 'Status', value: 'In Review' },
                    ],
                    ctaLabel: 'Track Complaint Status',
                    ctaUrl: `${portalUrl}/complaints/my`,
                };

                sendEmailAsync({
                    to: complainantUser.email,
                    subject: `In Review: ${complaint.ticket_number}`,
                    html: buildNotificationEmail(complainantParams),
                    amp: buildAmpNotificationEmail(complainantParams),
                });
            }

            return await complainRepository.findById(complainId, { populate: true, viewerRole: assignerUser.role, viewerUser: assignerUser });
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async transferComplaint(transferringUser, { complain_id, new_respondent_id, reason }) {
        const complainId = sanitizeString(complain_id, { uppercase: true });
        const newRespondentId = sanitizeString(new_respondent_id, { uppercase: true });
        const transferReason = sanitizeString(reason, { minLength: 5, maxLength: 5000 });
        const currentUserId = this.#extractId(transferringUser);
        const userDeptId = this.#extractId(transferringUser.department_id);

        const complaint = await complainRepository.findById(complainId);
        if (!complaint) {
            const err = new Error('Complaint not found');
            err.statusCode = 404;
            throw err;
        }

        if (this.#isTargetOfStatutoryGrievance(complaint, transferringUser)) {
            const err = new Error('You cannot transfer a complaint submitted against yourself');
            err.statusCode = 403;
            throw err;
        }

        const targetIds = this.#extractAllUserIds(complaint.target_user_id);
        if (complaint.ticket_type === 'STATUTORY_GRIEVANCE' && targetIds.includes(newRespondentId)) {
            const err = new Error('A complaint cannot be transferred to the person it was filed against');
            err.statusCode = 400;
            throw err;
        }

        if (['RESOLVED', 'REJECTED'].includes(complaint.status)) {
            const err = new Error(`This complaint has already been ${complaint.status.toLowerCase()} and cannot be transferred`);
            err.statusCode = 400;
            throw err;
        }

        if (currentUserId === newRespondentId) {
            const err = new Error('You cannot transfer a complaint to yourself');
            err.statusCode = 400;
            throw err;
        }

        const complainantId = this.#extractId(complaint.complainant_id) || this.#extractId(complaint.complainant);
        if (complainantId === newRespondentId) {
            const err = new Error('Cannot transfer a complaint to the person who submitted it');
            err.statusCode = 400;
            throw err;
        }

        const activeRespondentId = this.#extractId(complaint.active_respondent_id);
        if (activeRespondentId === newRespondentId) {
            const err = new Error('Complaint is already assigned to this person');
            err.statusCode = 400;
            throw err;
        }

        const newRespondent = await userRepository.findById(newRespondentId);
        if (!newRespondent || newRespondent.status !== 'active') {
            const err = new Error('The selected member could not be found or is inactive');
            err.statusCode = 404;
            throw err;
        }

        if (newRespondent.role === 'student' || !['faculty', 'admin'].includes(newRespondent.role)) {
            const err = new Error('Complaints can only be transferred to active faculty or staff members');
            err.statusCode = 400;
            throw err;
        }

        const targetDeptId = this.#extractId(complaint.target_department_id) || this.#extractId(complaint.target_department);
        const newRespondentDeptId = this.#extractId(newRespondent.department_id);

        const targetDept = await departmentRepository.findById(targetDeptId);
        const validTargetDeptIds = new Set([targetDeptId]);
        if (targetDept) {
            if (targetDept._id) validTargetDeptIds.add(targetDept._id.toString());
            if (targetDept.id) validTargetDeptIds.add(targetDept.id.toString());
            if (targetDept.custom_id) validTargetDeptIds.add(targetDept.custom_id.toString());
            if (targetDept.department_code) validTargetDeptIds.add(targetDept.department_code.toString());
        }

        const isActiveRespondent = activeRespondentId === currentUserId;
        const isTargetHod = transferringUser.designation === 'hod' && targetDeptId === userDeptId;
        const isLeadership = this.#isLeadership(transferringUser);

        if (!isActiveRespondent && !isTargetHod && !isLeadership) {
            const err = new Error('You do not have permission to transfer this complaint');
            err.statusCode = 403;
            throw err;
        }

        if (!newRespondentDeptId || !validTargetDeptIds.has(newRespondentDeptId)) {
            const deptName = targetDept?.department_name || targetDeptId;
            const err = new Error(`Cannot transfer to ${newRespondent.full_name}: this faculty member does not belong to the ${deptName} department. Transfers can only be made to members of the same department. To change department, use transfer department.`);
            err.statusCode = 400;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await complainAssignmentRepository.updateMany({
                complain_id: complainId, is_active: true
            }, { is_active: false }, { session });

            const assignmentId = await generateCustomId('ASN', session);
            await complainAssignmentRepository.create({
                _id: assignmentId,
                custom_id: assignmentId,
                complain_id: complainId,
                assigner_id: currentUserId,
                respondent_id: newRespondentId,
                description: `Transferred from ${currentUserId}. Reason: ${transferReason}`,
                is_active: true,
            }, { session });

            const historyRemarks = `Transferred to ${newRespondent.full_name}. Reason: ${transferReason}`;

            const historyId = await generateCustomId('HIS', session);
            await complainHistoryRepository.create({
                _id: historyId,
                custom_id: historyId,
                complain_id: complainId,
                actor_id: currentUserId,
                action: 'TRANSFERRED',
                previous_status: complaint.status,
                new_status: 'UNDER_REVIEW',
                remarks: historyRemarks,
            }, { session });

            await complainRepository.updateById(complainId, {
                target_department_id: targetDeptId,
                active_respondent_id: newRespondentId,
                status_description: `Transferred to ${newRespondent.full_name}: ${transferReason}`,
            }, { session });

            await session.commitTransaction();

            const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';

            if (newRespondent.email) {
                const transferParams = {
                    recipientName: newRespondent.full_name,
                    badgeText: 'Complaint Transferred',
                    badgeColor: '#D97706',
                    headline: 'Complaint Transferred to You',
                    introText: `Complaint <strong>${complaint.ticket_number}</strong> has been transferred to you by <strong>${transferringUser.full_name || 'Department Leadership'}</strong>.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Subject', value: complaint.title },
                        { label: 'Reason for Transfer', value: transferReason },
                    ],
                    expandableDetails: {
                        title: 'Original Description',
                        content: complaint.description,
                    },
                    actionNote: 'This complaint is now in your assigned list awaiting your review.',
                    ctaLabel: 'View Complaint',
                    ctaUrl: `${portalUrl}/complaints/assigned`,
                };

                sendEmailAsync({
                    to: newRespondent.email,
                    subject: `Transferred Complaint: ${complaint.ticket_number}`,
                    html: buildNotificationEmail(transferParams),
                    amp: buildAmpNotificationEmail(transferParams),
                });
            }

            const complainantUser = await userRepository.findById(complainantId);
            if (complainantUser?.email) {
                const complainantParams = {
                    recipientName: complainantUser.full_name || 'Complainant',
                    badgeText: 'Reviewer Updated',
                    badgeColor: '#2563EB',
                    headline: 'Your Complaint Has Been Reassigned',
                    introText: `Your complaint (<strong>${complaint.ticket_number}</strong>) has been reassigned to <strong>${newRespondent.full_name}</strong> for review.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Assigned To', value: newRespondent.full_name },
                        { label: 'Department', value: targetDept?.department_name || targetDeptId },
                        { label: 'Status', value: 'In Review' },
                    ],
                    ctaLabel: 'Track Progress',
                    ctaUrl: `${portalUrl}/complaints/my`,
                };

                sendEmailAsync({
                    to: complainantUser.email,
                    subject: `Reviewer Updated: ${complaint.ticket_number}`,
                    html: buildNotificationEmail(complainantParams),
                    amp: buildAmpNotificationEmail(complainantParams),
                });
            }

            return await complainRepository.findById(complainId, { populate: true, viewerRole: transferringUser.role, viewerUser: transferringUser });
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async transferDepartmentComplaint(transferringUser, { complain_id, new_department_id, reason }) {
        const complainId = sanitizeString(complain_id, { uppercase: true });
        const newDeptId = sanitizeString(new_department_id, { uppercase: true });
        const transferReason = sanitizeString(reason, { minLength: 5, maxLength: 5000 });
        const currentUserId = this.#extractId(transferringUser);
        const userDeptId = this.#extractId(transferringUser.department_id);

        const complaint = await complainRepository.findById(complainId);
        if (!complaint) {
            const err = new Error('Complaint not found');
            err.statusCode = 404;
            throw err;
        }

        if (this.#isTargetOfStatutoryGrievance(complaint, transferringUser)) {
            const err = new Error('You cannot transfer a complaint submitted against yourself');
            err.statusCode = 403;
            throw err;
        }

        if (['RESOLVED', 'REJECTED'].includes(complaint.status)) {
            const err = new Error('This complaint has already been closed and cannot be transferred');
            err.statusCode = 400;
            throw err;
        }

        const targetDeptId = this.#extractId(complaint.target_department_id) || this.#extractId(complaint.target_department);
        if (targetDeptId === newDeptId) {
            const err = new Error('This complaint is already assigned to this department');
            err.statusCode = 400;
            throw err;
        }

        const newDept = await departmentRepository.findById(newDeptId);
        if (!newDept || newDept.status !== 'active') {
            const err = new Error('The selected department could not be found or is inactive');
            err.statusCode = 404;
            throw err;
        }

        const isCurrentTargetHod = transferringUser.designation === 'hod' && targetDeptId === userDeptId;
        const isLeadership = this.#isLeadership(transferringUser);

        if (!isCurrentTargetHod && !isLeadership) {
            const err = new Error('You do not have permission to transfer this complaint to another department');
            err.statusCode = 403;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await complainAssignmentRepository.updateMany({
                complain_id: complainId, is_active: true
            }, { is_active: false }, { session });

            const historyId = await generateCustomId('HIS', session);
            await complainHistoryRepository.create({
                _id: historyId,
                custom_id: historyId,
                complain_id: complainId,
                actor_id: currentUserId,
                action: 'TRANSFERRED',
                previous_status: complaint.status,
                new_status: 'PENDING',
                remarks: `Transferred from ${complaint.target_department_id} to ${newDeptId}. Reason: ${transferReason}`,
            }, { session });

            await complainRepository.updateById(complainId, {
                target_department_id: newDeptId,
                active_respondent_id: null,
                status: 'PENDING',
                status_description: `Transferred to ${newDept.department_name}. Awaiting department review`,
            }, { session });

            await session.commitTransaction();

            const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';
            const complainantId = this.#extractId(complaint.complainant_id) || this.#extractId(complaint.complainant);
            const complainantUser = await userRepository.findById(complainantId);

            if (complainantUser?.email) {
                const rerouteParams = {
                    recipientName: complainantUser.full_name || 'Complainant',
                    badgeText: 'Department Updated',
                    badgeColor: '#4F46E5',
                    headline: 'Complaint Transferred to Another Department',
                    introText: `Your complaint (<strong>${complaint.ticket_number}</strong>) has been transferred to the <strong>${newDept.department_name}</strong> department for review.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'New Department', value: newDept.department_name },
                        { label: 'Reason for Transfer', value: transferReason },
                        { label: 'Status', value: 'Pending' },
                    ],
                    ctaLabel: 'View Complaint',
                    ctaUrl: `${portalUrl}/complaints/my`,
                };

                sendEmailAsync({
                    to: complainantUser.email,
                    subject: `Department Updated: ${complaint.ticket_number}`,
                    html: buildNotificationEmail(rerouteParams),
                    amp: buildAmpNotificationEmail(rerouteParams),
                });
            }

            return await complainRepository.findById(complainId, { populate: true, viewerRole: transferringUser.role, viewerUser: transferringUser });
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async resolveComplaint(user, complainId, remarks) {
        const cleanId = sanitizeString(complainId, { uppercase: true });
        const resolutionNotes = sanitizeString(remarks, { minLength: 5, maxLength: 5000 });

        const complaint = await complainRepository.findById(cleanId, { populate: true });
        if (!complaint) {
            const err = new Error('Complaint not found');
            err.statusCode = 404;
            throw err;
        }

        if (this.#isTargetOfStatutoryGrievance(complaint, user)) {
            const err = new Error('You cannot resolve a complaint submitted against yourself');
            err.statusCode = 403;
            throw err;
        }

        if (['RESOLVED', 'REJECTED'].includes(complaint.status)) {
            const err = new Error('This complaint has already been closed');
            err.statusCode = 400;
            throw err;
        }

        const currentUserId = this.#extractId(user);
        const userDeptId = this.#extractId(user.department_id);
        const activeRespondentId = this.#extractId(complaint.active_respondent_id);
        const targetDeptId = this.#extractId(complaint.target_department_id) || this.#extractId(complaint.target_department);

        const isActiveRespondent = activeRespondentId === currentUserId;
        const isTargetHod = user.designation === 'hod' && targetDeptId === userDeptId;
        const isLeadership = this.#isLeadership(user);

        if (!isActiveRespondent && !isTargetHod && !isLeadership) {
            const err = new Error('You do not have permission to resolve this complaint');
            err.statusCode = 403;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await complainAssignmentRepository.updateMany({
                complain_id: cleanId, is_active: true
            }, { is_active: false }, { session });

            const historyId = await generateCustomId('HIS', session);
            await complainHistoryRepository.create({
                _id: historyId,
                custom_id: historyId,
                complain_id: cleanId,
                actor_id: currentUserId,
                action: 'RESOLVED',
                previous_status: complaint.status,
                new_status: 'RESOLVED',
                remarks: resolutionNotes,
            }, { session });

            const updated = await complainRepository.updateById(cleanId, {
                status: 'RESOLVED',
                status_description: 'Complaint resolved and closed',
                resolution_details: {
                    resolved_by: currentUserId,
                    resolved_at: new Date(),
                    remarks: resolutionNotes,
                },
            }, { session });

            await session.commitTransaction();

            const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';
            const complainantEmail = complaint.complainant?.email || (await userRepository.findById(this.#extractId(complaint.complainant_id)))?.email;

            if (complainantEmail) {
                const resolvedParams = {
                    recipientName: complaint.complainant?.full_name || 'Complainant',
                    badgeText: 'Resolved',
                    badgeColor: '#059669',
                    headline: 'Your Complaint Has Been Resolved',
                    introText: `Your complaint (<strong>${complaint.ticket_number}</strong>) has been resolved and closed.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Subject', value: complaint.title },
                        { label: 'Resolved By', value: user.full_name || 'Staff' },
                        { label: 'Resolution Date', value: new Date().toLocaleDateString('en-IN') },
                    ],
                    expandableDetails: {
                        title: 'View Resolution Notes',
                        content: resolutionNotes,
                    },
                    actionNote: 'This complaint is now closed. You can view the full details and history on the portal.',
                    ctaLabel: 'View Details',
                    ctaUrl: `${portalUrl}/complaints/my`,
                };

                sendEmailAsync({
                    to: complainantEmail,
                    subject: `${complaint.ticket_number}: ${complaint.title}`,
                    html: buildNotificationEmail(resolvedParams),
                    amp: buildAmpNotificationEmail(resolvedParams),
                });
            }

            if (activeRespondentId && activeRespondentId !== currentUserId) {
                const activeRespondent = await userRepository.findById(activeRespondentId);
                if (activeRespondent?.email) {
                    const notifyFacParams = {
                        recipientName: activeRespondent.full_name,
                        badgeText: 'Complaint Resolved',
                        badgeColor: '#059669',
                        headline: 'Complaint Resolved by Leadership',
                        introText: `Complaint <strong>${complaint.ticket_number}</strong> assigned to you has been resolved by <strong>${user.full_name}</strong>.`,
                        details: [
                            { label: 'Reference Number', value: complaint.ticket_number },
                            { label: 'Resolved By', value: user.full_name },
                            { label: 'Resolution Notes', value: resolutionNotes },
                        ],
                        ctaLabel: 'View Complaints',
                        ctaUrl: `${portalUrl}/complaints/assigned`,
                    };

                    sendEmailAsync({
                        to: activeRespondent.email,
                        subject: `Complaint Resolved: ${complaint.ticket_number}`,
                        html: buildNotificationEmail(notifyFacParams),
                        amp: buildAmpNotificationEmail(notifyFacParams),
                    });
                }
            }

            return updated;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async rejectComplaint(user, complainId, reasonOrRemarks) {
        const cleanId = sanitizeString(complainId, { uppercase: true });
        const rejectionReason = sanitizeString(reasonOrRemarks, { minLength: 5, maxLength: 5000 });

        const complaint = await complainRepository.findById(cleanId, { populate: true });
        if (!complaint) {
            const err = new Error('Complaint not found');
            err.statusCode = 404;
            throw err;
        }

        if (this.#isTargetOfStatutoryGrievance(complaint, user)) {
            const err = new Error('You cannot reject a complaint submitted against yourself');
            err.statusCode = 403;
            throw err;
        }

        if (['RESOLVED', 'REJECTED'].includes(complaint.status)) {
            const err = new Error('This complaint has already been closed');
            err.statusCode = 400;
            throw err;
        }

        const currentUserId = this.#extractId(user);
        const userDeptId = this.#extractId(user.department_id);
        const activeRespondentId = this.#extractId(complaint.active_respondent_id);
        const targetDeptId = this.#extractId(complaint.target_department_id) || this.#extractId(complaint.target_department);

        const isActiveRespondent = activeRespondentId === currentUserId;
        const isTargetHod = user.designation === 'hod' && targetDeptId === userDeptId;
        const isLeadership = this.#isLeadership(user);

        if (!isActiveRespondent && !isTargetHod && !isLeadership) {
            const err = new Error('You do not have permission to reject this complaint');
            err.statusCode = 403;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await complainAssignmentRepository.updateMany({
                complain_id: cleanId, is_active: true
            }, { is_active: false }, { session });

            const historyId = await generateCustomId('HIS', session);
            await complainHistoryRepository.create({
                _id: historyId,
                custom_id: historyId,
                complain_id: cleanId,
                actor_id: currentUserId,
                action: 'REJECTED',
                previous_status: complaint.status,
                new_status: 'REJECTED',
                remarks: rejectionReason,
            }, { session });

            const updated = await complainRepository.updateById(cleanId, {
                status: 'REJECTED',
                status_description: 'Complaint rejected',
                rejection_details: {
                    rejected_by: currentUserId,
                    rejected_at: new Date(),
                    remarks: rejectionReason,
                },
            }, { session });

            await session.commitTransaction();

            const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';
            const complainantEmail = complaint.complainant?.email || (await userRepository.findById(this.#extractId(complaint.complainant_id)))?.email;

            if (complainantEmail) {
                const rejectParams = {
                    recipientName: complaint.complainant?.full_name || 'Complainant',
                    badgeText: 'Complaint Rejected',
                    badgeColor: '#DC2626',
                    headline: 'Your Complaint Has Been Rejected',
                    introText: `Your complaint (<strong>${complaint.ticket_number}</strong>) has been reviewed and could not be accepted.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Subject', value: complaint.title },
                        { label: 'Reviewed By', value: user.full_name || 'Staff' },
                    ],
                    expandableDetails: {
                        title: 'Reason for Rejection',
                        content: rejectionReason,
                    },
                    actionNote: 'You can view the full details and decision on the portal.',
                    ctaLabel: 'View Details',
                    ctaUrl: `${portalUrl}/complaints/my`,
                };

                sendEmailAsync({
                    to: complainantEmail,
                    subject: `Complaint Rejected: ${complaint.ticket_number}`,
                    html: buildNotificationEmail(rejectParams),
                    amp: buildAmpNotificationEmail(rejectParams),
                });
            }

            if (activeRespondentId && activeRespondentId !== currentUserId) {
                const activeRespondent = await userRepository.findById(activeRespondentId);
                if (activeRespondent?.email) {
                    const notifyFacParams = {
                        recipientName: activeRespondent.full_name,
                        badgeText: 'Complaint Rejected',
                        badgeColor: '#DC2626',
                        headline: 'Complaint Closed by Leadership',
                        introText: `Complaint <strong>${complaint.ticket_number}</strong> has been rejected by <strong>${user.full_name}</strong> and closed.`,
                        details: [
                            { label: 'Reference Number', value: complaint.ticket_number },
                            { label: 'Reason', value: rejectionReason },
                        ],
                        ctaLabel: 'View Complaints',
                        ctaUrl: `${portalUrl}/complaints/assigned`,
                    };

                    sendEmailAsync({
                        to: activeRespondent.email,
                        subject: `Complaint Rejected: ${complaint.ticket_number}`,
                        html: buildNotificationEmail(notifyFacParams),
                        amp: buildAmpNotificationEmail(notifyFacParams),
                    });
                }
            }

            return updated;
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async getAnalyticsReport(user, query = {}) {
        const isLeadership = this.#isLeadership(user);
        const isHod = user.designation === 'hod';

        if (!isLeadership && !isHod) {
            const err = new Error('You do not have permission to view analytics reports');
            err.statusCode = 403;
            throw err;
        }

        const conflictFilter = this.#getStatutoryExclusionFilter(user);
        const filter = { ...conflictFilter };

        if (isHod && !isLeadership) {
            const userDeptId = this.#extractId(user.department_id);
            if (userDeptId) {
                const deptTargets = [userDeptId];
                if (mongoose.Types.ObjectId.isValid(userDeptId)) {
                    deptTargets.push(new mongoose.Types.ObjectId(userDeptId));
                }
                filter.target_department_id = { $in: deptTargets };
            } else {
                const err = new Error('HOD department not found');
                err.statusCode = 400;
                throw err;
            }
        } else {
            const deptId = query.department_id || query.target_department_id;
            if (deptId) {
                const cleanDeptId = sanitizeString(deptId, { uppercase: true });
                const deptTargets = [cleanDeptId];
                if (mongoose.Types.ObjectId.isValid(cleanDeptId)) {
                    deptTargets.push(new mongoose.Types.ObjectId(cleanDeptId));
                }
                filter.target_department_id = { $in: deptTargets };
            }
        }

        return await complainRepository.getInstitutionalMetrics(filter);
    }

    async deleteComplaintWithDependencies(complainId, session = null) {
        const cleanId = sanitizeString(complainId, { uppercase: true });
        const attachments = await attachmentRepository.findByComplainId(cleanId, { session });
        const publicIds = Array.isArray(attachments) ? attachments.map((att) => att.public_id).filter(Boolean) : [];

        await attachmentRepository.deleteMany({ complain_id: cleanId }, { session });
        await complainAssignmentRepository.deleteMany({ complain_id: cleanId }, { session });
        await complainHistoryRepository.deleteMany({ complain_id: cleanId }, { session });
        await complainRepository.deleteMany({ _id: cleanId }, { session });

        if (publicIds.length > 0) {
            deleteCloudinaryAssets(publicIds).catch(() => { });
        }
    }

    async getComplaintFormOptions(currentUser) {
        const role = (currentUser.role || '').toLowerCase().trim();
        const permittedAudiences = ['all'];

        if (role === 'student') {
            permittedAudiences.push('student');
        } else if (role === 'faculty') {
            permittedAudiences.push('faculty');
        } else if (role === 'admin') {
            permittedAudiences.push('student', 'faculty');
        }

        const excludedIds = this.#extractAllUserIds(currentUser);

        const [categoriesResult, departmentsResult, facultiesResult] = await Promise.all([
            complainCategoryRepository.find({ status: 'active' }, { limit: 0, sort: { title: 1 } }),
            departmentRepository.find({ status: 'active' }, { limit: 0, sort: { department_name: 1 } }),
            userRepository.find({
                role: { $in: ['faculty', 'admin'] },
                status: 'active',
                _id: { $nin: excludedIds },
                custom_id: { $nin: excludedIds },
            }, {
                limit: 0, sort: { full_name: 1 }, select: 'full_name email designation role department_id custom_id',
            }),
        ]);

        const categories = Array.isArray(categoriesResult) ? categoriesResult : (categoriesResult.categories || []);
        const departments = Array.isArray(departmentsResult) ? departmentsResult : (departmentsResult.departments || []);
        let faculties = Array.isArray(facultiesResult) ? facultiesResult : (facultiesResult.users || []);

        faculties = faculties.filter((fac) => {
            const facIds = this.#extractAllUserIds(fac);
            return !facIds.some((id) => excludedIds.includes(id));
        });

        let groupedCategories = [];
        if (categories.length > 0) {
            const categoryIds = categories.map((cat) => String(cat._id || cat.id || cat.custom_id));

            const subcategoriesResult = await complainSubcategoryRepository.find({
                status: 'active',
                category_id: { $in: categoryIds }, $or: [{ target_audience: { $in: permittedAudiences } }, { target_audience: { $exists: false } }, { target_audience: null }],
            }, { limit: 0, sort: { title: 1 } });

            const subcategories = Array.isArray(subcategoriesResult) ? subcategoriesResult : (subcategoriesResult.subcategories || []);

            groupedCategories = categories
                .map((cat) => {
                    const catId = String(cat._id || cat.id || cat.custom_id);
                    const matchingSubs = subcategories
                        .filter((sub) => String(sub.category_id) === catId)
                        .map((sub) => ({
                            id: String(sub._id || sub.id || sub.custom_id),
                            title: sub.title,
                            description: sub.description,
                            default_priority: sub.default_priority,
                            target_audience: sub.target_audience || 'all',
                            category_id: catId,
                        }));

                    return {
                        id: catId,
                        title: cat.title,
                        description: cat.description,
                        default_priority: cat.default_priority,
                        subcategories: matchingSubs,
                    };
                })
                .filter((cat) => cat.subcategories.length > 0);
        }

        const formattedOfficers = faculties.map((fac) => ({
            id: String(fac._id || fac.id || fac.custom_id),
            name: fac.full_name,
            email: fac.email,
            role: fac.role,
            designation: fac.designation || (fac.role === 'admin' ? 'Administrator' : 'Faculty'),
            department_id: fac.department_id ? String(fac.department_id?._id || fac.department_id) : null,
        }));

        const adminDepartment = departments.find((d) => d.department_code === ADMINISTRATION_DEPARTMENT_CODE || d.department_name?.includes('ADMIN'));
        const adminDeptId = adminDepartment ? String(adminDepartment._id || adminDepartment.id || adminDepartment.custom_id) : null;

        const groupedDepartments = departments.map((dept) => {
            const deptId = String(dept._id || dept.id || dept.custom_id);
            const deptCode = dept.department_code;

            const matchingFaculties = formattedOfficers.filter((fac) => {
                if (fac.department_id && (fac.department_id === deptId || fac.department_id === deptCode)) {
                    return true;
                }
                if (!fac.department_id && adminDeptId && deptId === adminDeptId) {
                    return true;
                }
                return false;
            });

            return {
                id: deptId,
                name: dept.department_name,
                code: dept.department_code,
                head_id: dept.department_head_id,
                faculties: matchingFaculties,
            };
        });

        return {
            categories: groupedCategories,
            departments: groupedDepartments,
            all_officers: formattedOfficers,
        };
    }
}

export default new ComplainService();