import cron from 'node-cron';
import complainRepository from '../repositories/complain.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import userRepository from '../repositories/user.repository.js';
import {TOP_LEVEL_MANAGEMENT} from '../configs/auth.config.js';
import {sendEmailAsync} from '../utils/mail.util.js';
import {buildDigestEmailShell} from '../utils/email.template.js';

const PRIORITY_WEIGHTS = {CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getPriorityBadge(priority) {
    const p = (priority || 'MEDIUM').toUpperCase();
    const colors = {
        CRITICAL: {bg: '#FEE2E2', text: '#991B1B', border: '#F87171'},
        HIGH: {bg: '#FFEDD5', text: '#9A3412', border: '#FB923C'},
        MEDIUM: {bg: '#FEF3C7', text: '#92400E', border: '#FCD34D'},
        LOW: {bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7'},
    };
    const style = colors[p] || colors.MEDIUM;
    return `<span style="background:${style.bg};color:${style.text};border:1px solid ${style.border};padding:2px 6px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;">${p}</span>`;
}

function sortUrgentComplaints(complaints, limit = 5) {
    return [...complaints]
        .sort((a, b) => {
            if (a.is_sla_breached !== b.is_sla_breached) {
                return a.is_sla_breached ? -1 : 1;
            }
            const weightA = PRIORITY_WEIGHTS[(a.priority || 'MEDIUM').toUpperCase()] || 0;
            const weightB = PRIORITY_WEIGHTS[(b.priority || 'MEDIUM').toUpperCase()] || 0;
            if (weightB !== weightA) return weightB - weightA;
            return new Date(a.createdAt) - new Date(b.createdAt);
        })
        .slice(0, limit);
}

function renderDigestHtml({recipientName, subtitle, statCards, items, totalCount, extraSectionHtml = ''}) {
    const urgentRowsHtml = items.map((t) => {
        const daysOpen = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const slaStatus = t.is_sla_breached ? `<span style="color:#B91C1C;font-weight:700;">${daysOpen}d (Overdue)</span>` : `${daysOpen}d`;

        return `
            <tr>
                <td style="padding:8px 10px;border:1px solid #E2E8F0;font-weight:600;font-size:12px;white-space:nowrap;">${t.ticket_number}</td>
                <td style="padding:8px 10px;border:1px solid #E2E8F0;font-size:12px;min-width:140px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</td>
                <td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">${getPriorityBadge(t.priority)}</td>
                <td style="padding:8px 6px;border:1px solid #E2E8F0;font-size:11px;color:#475569;white-space:nowrap;">${t.ticket_type === 'DIRECT_QUERY' ? 'Inquiry' : 'Complaint'}</td>
                <td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;font-size:11px;white-space:nowrap;">${slaStatus}</td>
            </tr>
        `;
    }).join('');

    const overflowCount = totalCount - items.length;

    const contentHtml = `
        ${extraSectionHtml}

        <h3 style="color:#1E293B;margin-top:16px;margin-bottom:8px;font-size:13px;border-bottom:1px solid #E2E8F0;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
            High Priority Complaints
        </h3>
        ${items.length > 0 ? `
            <div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;border:1px solid #E2E8F0;border-radius:6px;min-width:440px;">
                    <thead>
                        <tr style="background:#F8FAFC;text-align:left;">
                            <th style="padding:8px 10px;border:1px solid #E2E8F0;">Complaint #</th>
                            <th style="padding:8px 10px;border:1px solid #E2E8F0;">Subject</th>
                            <th style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">Priority</th>
                            <th style="padding:8px 6px;border:1px solid #E2E8F0;">Type</th>
                            <th style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">Days Open</th>
                        </tr>
                    </thead>
                    <tbody>${urgentRowsHtml}</tbody>
                </table>
            </div>
        ` : '<p style="font-size:13px;color:#64748B;margin:10px 0;">No active urgent complaints at this time.</p>'}

        ${overflowCount > 0 ? `
            <div style="padding:8px 12px;background:#F1F5F9;border-radius:6px;font-size:12px;color:#475569;text-align:center;margin:10px 0;border:1px dashed #CBD5E1;">
                + <b>${overflowCount}</b> more active complaints in the list.
            </div>
        ` : ''}
    `;

    return buildDigestEmailShell({
        recipientName, subtitle, statCards, contentHtml,
    });
}

export function startDailyDigestCron() {
    cron.schedule('30 8 * * *', async () => {
        try {
            const [complaintsResult, facultiesResult, departmentsResult, leadersResult] = await Promise.all([complainRepository.find({status: {$in: ['PENDING', 'UNDER_REVIEW']}}, {
                limit: 0,
                sort: {createdAt: 1},
                lean: true
            }), userRepository.find({role: 'faculty', status: 'active'}, {
                limit: 0,
                select: 'full_name email custom_id designation department_id',
                lean: true
            }), departmentRepository.find({status: 'active'}, {
                limit: 0,
                select: 'department_name department_code custom_id department_head_id',
                lean: true
            }), userRepository.find({
                $or: [{designation: {$in: TOP_LEVEL_MANAGEMENT}}, {role: 'admin'},], status: 'active',
            }, {limit: 0, select: 'full_name email designation', lean: true}),]);

            const openComplaints = complaintsResult.complains || complaintsResult || [];
            const faculties = facultiesResult.users || facultiesResult || [];
            const departments = departmentsResult.departments || departmentsResult || [];
            const leaders = leadersResult.users || leadersResult || [];

            const deptLookup = new Map();
            for (const dept of departments) {
                deptLookup.set(String(dept._id || dept.id || dept.custom_id), dept);
            }

            const hodUsers = faculties.filter((u) => u.designation === 'hod');
            const processedHodIds = new Set();

            for (const hod of hodUsers) {
                const hodId = String(hod._id || hod.id || hod.custom_id);
                processedHodIds.add(hodId);

                if (!hod.email || !hod.department_id) continue;
                const deptId = String(hod.department_id);
                const dept = deptLookup.get(deptId);
                const deptName = dept ? dept.department_name : 'Department';

                const deptTickets = openComplaints.filter((t) => String(t.target_department_id) === deptId);
                if (deptTickets.length === 0) continue;

                const pendingCount = deptTickets.filter((t) => t.status === 'PENDING').length;
                const underReviewCount = deptTickets.filter((t) => t.status === 'UNDER_REVIEW').length;
                const breachedCount = deptTickets.filter((t) => t.is_sla_breached).length;
                const myDirectTasks = deptTickets.filter((t) => String(t.active_respondent_id) === hodId).length;

                const topUrgent = sortUrgentComplaints(deptTickets, 5);

                const html = renderDigestHtml({
                    recipientName: hod.full_name,
                    subtitle: `Daily complaint summary for the <b>${deptName}</b> department.`,
                    statCards: [{
                        label: 'Pending Assignment',
                        value: pendingCount,
                        color: '#92400E',
                        bg: '#FFFBEB',
                        border: '#FEF3C7'
                    }, {
                        label: 'In Review', value: underReviewCount, color: '#1D4ED8', bg: '#EFF6FF', border: '#DBEAFE'
                    }, {label: 'Overdue', value: breachedCount, color: '#B91C1C', bg: '#FEF2F2', border: '#FEE2E2'}, {
                        label: 'Assigned to You',
                        value: myDirectTasks,
                        color: '#0F172A',
                        bg: '#F8FAFC',
                        border: '#E2E8F0'
                    },],
                    items: topUrgent,
                    totalCount: deptTickets.length,
                });

                sendEmailAsync({
                    to: hod.email,
                    subject: `${deptTickets.length} Active Complaints (${breachedCount} Overdue) - ${deptName}`,
                    html,
                });
                await sleep(150);
            }

            const standardFaculty = faculties.filter((f) => !processedHodIds.has(String(f._id || f.id || f.custom_id)));

            for (const fac of standardFaculty) {
                if (!fac.email) continue;
                const facId = String(fac._id || fac.id || fac.custom_id);

                const underReviewTickets = openComplaints.filter((t) => String(t.active_respondent_id) === facId && t.status === 'UNDER_REVIEW');
                if (underReviewTickets.length === 0) continue;

                const breachedCount = underReviewTickets.filter((t) => t.is_sla_breached).length;
                const criticalCount = underReviewTickets.filter((t) => (t.priority || '').toUpperCase() === 'CRITICAL').length;
                const highCount = underReviewTickets.filter((t) => (t.priority || '').toUpperCase() === 'HIGH').length;

                const topUrgent = sortUrgentComplaints(underReviewTickets, 5);

                const html = renderDigestHtml({
                    recipientName: fac.full_name,
                    subtitle: `You have <b>${underReviewTickets.length}</b> assigned complaint(s) awaiting your review.`,
                    statCards: [{
                        label: 'In Review',
                        value: underReviewTickets.length,
                        color: '#1D4ED8',
                        bg: '#EFF6FF',
                        border: '#DBEAFE'
                    }, {
                        label: 'Overdue',
                        value: breachedCount,
                        color: '#B91C1C',
                        bg: '#FEF2F2',
                        border: '#FEE2E2'
                    }, {
                        label: 'Critical',
                        value: criticalCount,
                        color: '#991B1B',
                        bg: '#FEE2E2',
                        border: '#F87171'
                    }, {label: 'High Priority', value: highCount, color: '#9A3412', bg: '#FFEDD5', border: '#FB923C'},],
                    items: topUrgent,
                    totalCount: underReviewTickets.length,
                });

                sendEmailAsync({
                    to: fac.email,
                    subject: `${underReviewTickets.length} Complaints Awaiting Review - Daily Summary`,
                    html,
                });
                await sleep(150);
            }

            if (leaders.length > 0) {
                const priorityCounts = {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0};
                const deptStats = new Map();

                for (const dept of departments) {
                    const dId = String(dept._id || dept.id || dept.custom_id);
                    deptStats.set(dId, {
                        name: dept.department_name,
                        code: dept.department_code,
                        pending: 0,
                        underReview: 0,
                        slaBreached: 0,
                        total: 0,
                    });
                }

                for (const t of openComplaints) {
                    const pr = (t.priority || 'MEDIUM').toUpperCase();
                    if (priorityCounts[pr] !== undefined) priorityCounts[pr]++;

                    const stats = deptStats.get(String(t.target_department_id));
                    if (stats) {
                        if (t.status === 'PENDING') stats.pending++;
                        if (t.status === 'UNDER_REVIEW') stats.underReview++;
                        if (t.is_sla_breached) stats.slaBreached++;
                        stats.total++;
                    }
                }

                const deptTableRows = Array.from(deptStats.values())
                    .filter((d) => d.total > 0)
                    .map((d) => `
                        <tr>
                            <td style="padding:8px 10px;border:1px solid #E2E8F0;font-weight:600;font-size:12px;white-space:nowrap;">${d.name} <span style="font-size:11px;color:#64748B;">(${d.code})</span></td>
                            <td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;background:#FFFBEB;font-weight:600;color:#B45309;font-size:12px;">${d.pending}</td>
                            <td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;background:#EFF6FF;font-weight:600;color:#1D4ED8;font-size:12px;">${d.underReview}</td>
                            <td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;background:#FEF2F2;font-weight:700;color:#B91C1C;font-size:12px;">${d.slaBreached}</td>
                            <td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;font-weight:700;font-size:12px;">${d.total}</td>
                        </tr>
                    `).join('');

                const deptTableHtml = `
                    <h3 style="color:#1E293B;margin-top:16px;margin-bottom:8px;font-size:13px;border-bottom:1px solid #E2E8F0;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
                        Department Overview
                    </h3>
                    <div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;">
                        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;border:1px solid #E2E8F0;border-radius:6px;min-width:440px;">
                            <thead>
                                <tr style="background:#F8FAFC;text-align:left;">
                                    <th style="padding:8px 10px;border:1px solid #E2E8F0;">Department</th>
                                    <th style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">Pending</th>
                                    <th style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">In Review</th>
                                    <th style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">Overdue</th>
                                    <th style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;">Total</th>
                                </tr>
                            </thead>
                            <tbody>${deptTableRows || '<tr><td colspan="5" style="text-align:center;padding:10px;">All department complaints are up to date.</td></tr>'}</tbody>
                        </table>
                    </div>
                `;

                const topUrgentInstitution = sortUrgentComplaints(openComplaints, 5);

                for (const leader of leaders) {
                    if (!leader.email) continue;

                    const html = renderDigestHtml({
                        recipientName: leader.full_name,
                        subtitle: 'Campus-wide daily complaint summary for leadership.',
                        statCards: [{
                            label: 'Critical',
                            value: priorityCounts.CRITICAL,
                            color: '#991B1B',
                            bg: '#FEE2E2',
                            border: '#F87171'
                        }, {
                            label: 'High',
                            value: priorityCounts.HIGH,
                            color: '#9A3412',
                            bg: '#FFEDD5',
                            border: '#FB923C'
                        }, {
                            label: 'Medium',
                            value: priorityCounts.MEDIUM,
                            color: '#92400E',
                            bg: '#FEF3C7',
                            border: '#FCD34D'
                        }, {
                            label: 'Low', value: priorityCounts.LOW, color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7'
                        },],
                        extraSectionHtml: deptTableHtml,
                        items: topUrgentInstitution,
                        totalCount: openComplaints.length,
                    });

                    sendEmailAsync({
                        to: leader.email,
                        subject: `Daily Briefing: ${openComplaints.length} Active Complaints Across Campus`,
                        html,
                    });
                    await sleep(150);
                }
            }
        } catch (err) {
            console.error('[Daily Digest Fatal Error]:', err);
        }
    });
}