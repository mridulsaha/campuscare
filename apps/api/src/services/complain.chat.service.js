import mongoose from 'mongoose';
import complainRepository from '../repositories/complain.repository.js';
import complainAssignmentRepository from '../repositories/complain.assignment.repository.js';
import complainChatRepository from '../repositories/complain.chat.repository.js';
import userRepository from '../repositories/user.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import { generateCustomId } from '../utils/id.generator.js';
import { sanitizeString } from '../utils/validator.js';
import { TOP_LEVEL_MANAGEMENT } from '../configs/auth.config.js';
import { sendEmailAsync } from '../utils/mail.util.js';
import { buildNotificationEmail, buildAmpNotificationEmail } from '../utils/email.template.js';

class ComplainChatService {
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

    async #verifyComplaintAccess(complainId, currentUser) {
        const cleanId = sanitizeString(complainId, { uppercase: true });
        const complaint = await complainRepository.findById(cleanId, { populate: true });

        if (!complaint) {
            const err = new Error(`Complaint "${cleanId}" not found`);
            err.statusCode = 404;
            throw err;
        }

        const userIds = this.#extractAllUserIds(currentUser);
        const userDeptId = this.#extractId(currentUser.department_id);

        const targetUserIds = this.#extractAllUserIds(complaint.target_user_id || complaint.target_user);
        const isTargetUser = targetUserIds.some((id) => userIds.includes(id));

        if (complaint.ticket_type === 'STATUTORY_GRIEVANCE' && isTargetUser) {
            const err = new Error('Access Denied: You cannot view discussion logs for a grievance filed against yourself');
            err.statusCode = 403;
            throw err;
        }

        const complainantIds = this.#extractAllUserIds(complaint.complainant_id || complaint.complainant);
        const activeRespondentIds = this.#extractAllUserIds(complaint.active_respondent_id || complaint.active_respondent);
        const targetDeptId = this.#extractId(complaint.target_department_id || complaint.target_department);
        const complainantDeptId = this.#extractId(complaint.complainant_department_id || complaint.complainant_department);

        const isComplainant = complainantIds.some((id) => userIds.includes(id));
        const isActiveRespondent = activeRespondentIds.some((id) => userIds.includes(id));
        const isLeadership = this.#isLeadership(currentUser);

        const isTargetHod = currentUser.designation === 'hod' && targetDeptId === userDeptId && !isTargetUser;
        const isComplainantHod = currentUser.designation === 'hod' && complainantDeptId === userDeptId && !isTargetUser;

        let isPreviousAssignee = false;
        if (!isComplainant && !isActiveRespondent && !isTargetHod && !isLeadership) {
            const previousAssignment = await complainAssignmentRepository.find({
                complain_id: cleanId,
                respondent_id: { $in: userIds },
            });
            isPreviousAssignee = (previousAssignment.assignments || []).length > 0;
        }

        if (!isComplainant && !isActiveRespondent && !isTargetHod && !isComplainantHod && !isLeadership && !isPreviousAssignee) {
            const err = new Error('Access Denied: You do not have authorization to access this discussion');
            err.statusCode = 403;
            throw err;
        }

        return { complaint, cleanId, isComplainant };
    }

    async getComplaintMessages(complainId, currentUser, query = {}) {
        const { complaint, cleanId, isComplainant } = await this.#verifyComplaintAccess(complainId, currentUser);

        const result = await complainChatRepository.findByComplainId(cleanId, {
            page: query.page || 1,
            limit: query.limit || 50,
        });

        const complainantIds = this.#extractAllUserIds(complaint.complainant_id || complaint.complainant);
        const isMaskingNeeded = complaint.is_anonymous && currentUser.role !== 'admin' && !isComplainant;

        const maskedMessages = result.messages.map((msg) => {
            const senderIds = this.#extractAllUserIds(msg.sender_id || msg.sender);
            const isSenderComplainant = complainantIds.some((id) => senderIds.includes(id));

            if (isMaskingNeeded && isSenderComplainant) {
                return {
                    ...msg,
                    sender_id: null,
                    sender: {
                        full_name: 'Anonymous',
                        email: null,
                        role: complaint.complainant_role || 'student',
                        is_anonymous: true,
                    },
                };
            }
            return msg;
        });

        return {
            complain_id: cleanId,
            ticket_number: complaint.ticket_number,
            status: complaint.status,
            messages: maskedMessages,
            meta: result.meta,
        };
    }

    async #dispatchChatNotifications(complaint, senderUser, rawMessage) {
        try {
            const portalUrl = process.env.FRONTEND_DOMAIN_NAME || 'http://localhost:5173';
            const senderIds = this.#extractAllUserIds(senderUser);
            const complainantIds = this.#extractAllUserIds(complaint.complainant_id || complaint.complainant);
            const isSenderComplainant = complainantIds.some((id) => senderIds.includes(id));

            let senderDisplayName;
            if (complaint.is_anonymous && isSenderComplainant) {
                senderDisplayName = `Anonymous (${this.#formatTitle(senderUser.role || 'Student')})`;
            } else {
                const designationOrRole = senderUser.designation || senderUser.role || 'Member';
                senderDisplayName = `${senderUser.full_name || 'Campus Member'} (${this.#formatTitle(designationOrRole)})`;
            }

            const recipients = [];
            const emailedAddresses = new Set();
            if (senderUser.email) emailedAddresses.add(senderUser.email.toLowerCase().trim());

            const addRecipient = (targetUser, preferredUrl) => {
                if (!targetUser || !targetUser.email) return;
                const targetEmail = targetUser.email.toLowerCase().trim();
                const targetIds = this.#extractAllUserIds(targetUser);

                if (targetIds.some((id) => senderIds.includes(id)) || emailedAddresses.has(targetEmail)) {
                    return;
                }

                emailedAddresses.add(targetEmail);
                recipients.push({ user: targetUser, ctaUrl: preferredUrl });
            };

            if (!isSenderComplainant) {
                let compUser = complaint.complainant;
                if (!compUser || !compUser.email) {
                    const compId = this.#extractId(complaint.complainant_id);
                    if (compId) compUser = await userRepository.findById(compId);
                }
                addRecipient(compUser, `${portalUrl}/complaints/my`);
            }

            let respUser = complaint.active_respondent;
            const respId = this.#extractId(complaint.active_respondent_id);
            if (respId) {
                if (!respUser || !respUser.email) {
                    respUser = await userRepository.findById(respId);
                }
                addRecipient(respUser, `${portalUrl}/complaints/assigned`);
            } else {
                const targetDeptId = this.#extractId(complaint.target_department_id || complaint.target_department);
                if (targetDeptId) {
                    const dept = await departmentRepository.findById(targetDeptId);
                    if (dept?.department_head_id) {
                        const hodUser = await userRepository.findById(dept.department_head_id);
                        addRecipient(hodUser, `${portalUrl}/complaints/inbound`);
                    }
                }
            }

            const messagePreview =
                rawMessage.length > 300 ? `${rawMessage.slice(0, 297)}...` : rawMessage;

            for (const { user: recipient, ctaUrl } of recipients) {
                const emailParams = {
                    recipientName: recipient.full_name || 'Campus Member',
                    badgeText: 'Discussion Update',
                    badgeColor: '#2563EB',
                    headline: 'New Message on Grievance',
                    introText: `A new message has been posted regarding grievance <strong>${complaint.ticket_number}</strong>: <em>"${complaint.title}"</em>.`,
                    details: [
                        { label: 'Reference Number', value: complaint.ticket_number },
                        { label: 'Sent By', value: senderDisplayName },
                        { label: 'Department', value: complaint.target_department?.department_name || 'Central Administration' },
                        { label: 'Status', value: this.#formatTitle(complaint.status) },
                    ],
                    expandableDetails: {
                        title: 'Message Content',
                        content: messagePreview,
                    },
                    actionNote: 'You can respond directly to this grievance conversation by opening the portal link below.',
                    ctaLabel: 'Open Discussion',
                    ctaUrl,
                };

                sendEmailAsync({
                    to: recipient.email,
                    subject: `New Message on ${complaint.ticket_number}: ${complaint.title}`,
                    html: buildNotificationEmail(emailParams),
                    amp: buildAmpNotificationEmail(emailParams),
                });
            }
        } catch (err) {
            console.error('[ComplainChatService] Failed to dispatch chat notification emails:', err);
        }
    }

    async postMessage(complainId, currentUser, { message }) {
        const cleanMsg = sanitizeString(message, { minLength: 1, maxLength: 3000 });
        const { complaint, cleanId } = await this.#verifyComplaintAccess(complainId, currentUser);

        if (['RESOLVED', 'REJECTED'].includes(complaint.status)) {
            const err = new Error('This grievance has been closed and cannot accept new discussion messages');
            err.statusCode = 400;
            throw err;
        }

        const userId = this.#extractId(currentUser);
        const chatId = await generateCustomId('CHT');

        const chatDoc = {
            _id: chatId,
            custom_id: chatId,
            complain_id: cleanId,
            sender_id: userId,
            message: cleanMsg,
            is_system_message: false,
        };

        const createdMessage = await complainChatRepository.create(chatDoc);

        this.#dispatchChatNotifications(complaint, currentUser, cleanMsg);

        return createdMessage;
    }
}

export default new ComplainChatService();