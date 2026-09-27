import complainHistoryRepository from '../repositories/complain.history.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import { sanitizeString } from '../utils/validator.js';
import { TOP_LEVEL_MANAGEMENT } from '../configs/auth.config.js';

class AuditService {
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

    #buildSortOrder(query = {}) {
        let sort = { createdAt: -1 };

        if (query.sort_by) {
            const direction = query.order?.toLowerCase() === 'asc' || query.sort_order?.toLowerCase() === 'asc' ? 1 : -1;

            switch (query.sort_by.toLowerCase()) {
                case 'oldest':
                case 'time_asc':
                    sort = { createdAt: 1 };
                    break;
                case 'newest':
                case 'time_desc':
                    sort = { createdAt: -1 };
                    break;
                case 'action':
                    sort = { action: direction, createdAt: -1 };
                    break;
                case 'complain':
                    sort = { complain_id: direction, createdAt: -1 };
                    break;
                default:
                    sort = { [query.sort_by]: direction };
                    break;
            }
        }

        return sort;
    }

    async getComplaintAuditTrail(complainId, currentUser) {
        const cleanId = sanitizeString(complainId, { uppercase: true });
        
        const complaint = await complainRepository.findById(cleanId);

        if (!complaint) {
            const err = new Error(`Complaint "${cleanId}" not found`);
            err.statusCode = 404;
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
        const isLeadership = TOP_LEVEL_MANAGEMENT.some((d) => String(d).toLowerCase() === String(currentUser.designation).toLowerCase()) || currentUser.role === 'admin';

        if (currentUser.designation === 'hod' && isTargetUser && !isLeadership) {
            const err = new Error('Access Denied: You are named as the subject of this grievance and cannot access its audit trail');
            err.statusCode = 403;
            throw err;
        }

        const isTargetHod = currentUser.designation === 'hod' && targetDeptId === userDeptId && !isTargetUser;
        const isComplainantHod = currentUser.designation === 'hod' && complainantDeptId === userDeptId && !isTargetUser;

        if (!isComplainant && !isActiveRespondent && !isTargetHod && !isComplainantHod && !isLeadership) {
            const err = new Error('Access Denied: You do not have permission to view audit logs for this grievance');
            err.statusCode = 403;
            throw err;
        }

        const rawHistory = await complainHistoryRepository.findByComplainId(cleanId);
        
        const isMaskingNeeded = complaint.is_anonymous && currentUser.role !== 'admin' && !isComplainant;

        const history = rawHistory.map((entry) => {
            const actorIds = this.#extractAllUserIds(entry.actor_id || entry.actor);
            const isActorComplainant = complainantIds.some((id) => actorIds.includes(id));

            if (isMaskingNeeded && (entry.action === 'SUBMITTED' || isActorComplainant)) {
                return {
                    ...entry,
                    actor_id: null,
                    actor: {
                        role: complaint.complainant_role || 'student',
                        is_anonymous: true,
                        full_name: 'Anonymous',
                        email: null,
                    },
                };
            }
            return entry;
        });

        return {
            complain_id: cleanId,
            ticket_number: complaint.ticket_number,
            ticket_type: complaint.ticket_type,
            current_status: complaint.status,
            total_events: history.length,
            timeline: history,
        };
    }

    async getSystemAuditLogs(currentUser, query = {}) {
        const isLeadership = currentUser.role === 'admin';
        if (!isLeadership) {
            const err = new Error('Access Denied: System-wide audit inspection is restricted to Admin');
            err.statusCode = 403;
            throw err;
        }

        const filter = {};

        if (query.action) {
            filter.action = sanitizeString(query.action, { uppercase: true });
        }
        if (query.actor_id) {
            filter.actor_id = sanitizeString(query.actor_id, { uppercase: true });
        }
        if (query.complain_id) {
            filter.complain_id = sanitizeString(query.complain_id, { uppercase: true });
        }
        if (query.previous_status) {
            filter.previous_status = sanitizeString(query.previous_status, { uppercase: true });
        }
        if (query.new_status) {
            filter.new_status = sanitizeString(query.new_status, { uppercase: true });
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

        return await complainHistoryRepository.find(filter, {
            page: query.page,
            limit: query.limit,
            sort: this.#buildSortOrder(query),
        });
    }
}

export default new AuditService();