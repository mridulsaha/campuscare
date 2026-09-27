import cron from 'node-cron';
import mongoose from 'mongoose';
import complainRepository from '../repositories/complain.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import complainAssignmentRepository from '../repositories/complain.assignment.repository.js';
import complainHistoryRepository from '../repositories/complain.history.repository.js';
import userRepository from '../repositories/user.repository.js';
import {generateCustomId} from '../utils/id.generator.js';
import {sendEmailAsync} from '../utils/mail.util.js';
import {buildNotificationEmail} from '../utils/email.template.js';

const SLA_BREACH_DAYS = Number(process.env.SLA_BREACH_DAYS) || 7;

export function startEscalationCron() {
    cron.schedule('0 8 * * *', async () => {
        const breachThresholdDate = new Date();
        breachThresholdDate.setDate(breachThresholdDate.getDate() - SLA_BREACH_DAYS);

        try {
            const overdueResult = await complainRepository.find({
                ticket_type: 'STATUTORY_GRIEVANCE',
                status: {$in: ['PENDING', 'UNDER_REVIEW']},
                is_sla_breached: false,
                complainant_role: 'student',
                createdAt: {$lte: breachThresholdDate},
            }, {limit: 0});

            const overdueComplaints = overdueResult.complains || overdueResult || [];
            if (!overdueComplaints.length) return;

            for (const complaint of overdueComplaints) {
                const targetDept = await departmentRepository.findById(complaint.target_department_id);
                if (!targetDept || !targetDept.department_head_id) {
                    await complainRepository.updateById(complaint._id || complaint.id, {
                        is_sla_breached: true,
                    });
                    continue;
                }

                const hodId = targetDept.department_head_id;

                if (complaint.active_respondent_id === hodId) {
                    await complainRepository.updateById(complaint._id || complaint.id, {
                        is_sla_breached: true,
                    });
                    continue;
                }

                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    const ticketId = complaint._id || complaint.id || complaint.custom_id;

                    await complainAssignmentRepository.updateMany({
                        complain_id: ticketId,
                        is_active: true
                    }, {is_active: false}, {session});

                    const assignmentId = await generateCustomId('ASN', session);
                    await complainAssignmentRepository.create({
                        _id: assignmentId,
                        custom_id: assignmentId,
                        complain_id: ticketId,
                        assigner_id: 'SYSTEM_CRON',
                        respondent_id: hodId,
                        description: `Overdue: Unresolved for over ${SLA_BREACH_DAYS} days. Escalated to Department Head.`,
                        is_active: true,
                    }, {session});

                    const historyId = await generateCustomId('HIS', session);
                    await complainHistoryRepository.create({
                        _id: historyId,
                        custom_id: historyId,
                        complain_id: ticketId,
                        actor_id: 'SYSTEM_CRON',
                        action: 'TRANSFERRED',
                        previous_status: complaint.status,
                        new_status: 'UNDER_REVIEW',
                        remarks: `Overdue (${SLA_BREACH_DAYS} days elapsed). Escalated to Department Head (${hodId}).`,
                    }, {session});

                    await complainRepository.updateById(ticketId, {
                        status: 'UNDER_REVIEW',
                        active_respondent_id: hodId,
                        is_sla_breached: true,
                        status_description: 'Overdue complaint. Escalated to Department Head for priority review.',
                    }, {session});

                    await session.commitTransaction();

                    const complainant = await userRepository.findById(complaint.complainant_id);

                    if (complainant?.email) {
                        sendEmailAsync({
                            to: complainant.email,
                            subject: `${complaint.ticket_number} - Escalation Notice`,
                            html: buildNotificationEmail({
                                recipientName: complainant.full_name || 'Student',
                                badgeText: 'Overdue Notice',
                                badgeColor: '#DC2626',
                                headline: 'Complaint Escalated to Department Head',
                                introText: `Your complaint (<strong>${complaint.ticket_number}</strong>) has exceeded the standard resolution time of <strong>${SLA_BREACH_DAYS} days</strong>.`,
                                details: [{
                                    label: 'Reference Number',
                                    value: complaint.ticket_number
                                }, {label: 'Subject', value: complaint.title}, {
                                    label: 'Department',
                                    value: targetDept.department_name
                                }, {label: 'Escalated To', value: 'Head of Department'},],
                                actionNote: 'This complaint has been forwarded directly to the Head of Department for priority review.',
                            }),
                        });
                    }
                } catch (err) {
                    await session.abortTransaction();
                } finally {
                    session.endSession();
                }
            }
        } catch (err) {
            console.error('[Escalation Cron Fatal Error]:', err);
        }
    });
}