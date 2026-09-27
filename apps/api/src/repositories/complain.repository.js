import Complain from '../models/complain.model.js';

class ComplainRepository {
    _populate(query, { deep = false } = {}) {
        query
            .populate('category')
            .populate('subcategory')
            .populate('target_department')
            .populate('complainant_department')
            .populate('branch')
            .populate('programme')
            .populate('attachments')
            .populate({
                path: 'complainant',
                select: 'custom_id full_name email role designation enrollment_number',
            })
            .populate({
                path: 'active_respondent',
                select: 'custom_id full_name email role designation department_id',
            })
            .populate({
                path: 'target_user',
                select: 'custom_id full_name email role designation department_id',
            });

        if (deep) {
            query
                .populate({
                    path: 'assignments',
                    options: { sort: { createdAt: -1 } },
                    populate: [
                        { path: 'assigner', select: 'custom_id full_name email role designation' },
                        { path: 'respondent', select: 'custom_id full_name email role designation' },
                    ],
                })
                .populate({
                    path: 'history',
                    options: { sort: { createdAt: 1 } },
                    populate: { path: 'actor', select: 'custom_id full_name email role designation' },
                });
        }
    }

    _extractAllUserIds(userOrId) {
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

    maskComplainant(doc, viewerRole = null, viewerUser = null) {
        if (!doc) return null;
        if (viewerRole === 'admin' || (viewerUser && viewerUser.role === 'admin')) return doc;
        if (!doc.is_anonymous) return doc;

        if (viewerUser) {
            const viewerIds = this._extractAllUserIds(viewerUser);
            const compIds = this._extractAllUserIds(doc.complainant_id || doc.complainant);
            if (compIds.some((id) => viewerIds.includes(id))) {
                return doc;
            }
        }

        if (!viewerRole && !viewerUser) {
            return doc;
        }

        return {
            ...doc,
            complainant_id: null,
            complainant: {
                role: doc.complainant_role || 'student',
                is_anonymous: true,
                full_name: 'Anonymous',
                email: null,
            },
        };
    }

    async create(payload, { session = null } = {}) {
        const [complaint] = await Complain.create([payload], { session });
        return complaint ? complaint.toObject({ virtuals: true }) : null;
    }

    async findByCustomId(customId, { session = null, select = null, populate = false, deep = false, viewerRole = null, viewerUser = null } = {}) {
        const query = Complain.findOne({
            $or: [{ custom_id: customId }, { _id: customId }],
        }).select(select);

        if (populate) this._populate(query, { deep });
        if (session) query.session(session);

        const doc = await query.lean({ virtuals: true });
        return this.maskComplainant(doc, viewerRole, viewerUser);
    }

    async findById(id, options = {}) {
        return await this.findByCustomId(id, options);
    }

    async find(filter = {}, options = {}) {
        const cleanFilter = { ...filter };
        const sort = options.sort || cleanFilter.sort || { createdAt: -1 };
        const page = Math.max(Number(options.page || cleanFilter.page) || 1, 1);
        const requestedLimit = Number(options.limit !== undefined ? options.limit : cleanFilter.limit);
        const select = options.select || cleanFilter.select || null;
        const session = options.session || null;
        const populate = options.populate !== undefined ? Boolean(options.populate) : Boolean(cleanFilter.populate);
        const deep = options.deep !== undefined ? Boolean(options.deep) : Boolean(cleanFilter.deep);
        const viewerRole = options.viewerRole || cleanFilter.viewerRole || null;
        const viewerUser = options.viewerUser || cleanFilter.viewerUser || null;

        delete cleanFilter.populate;
        delete cleanFilter.limit;
        delete cleanFilter.page;
        delete cleanFilter.sort;
        delete cleanFilter.select;
        delete cleanFilter.deep;
        delete cleanFilter.viewerRole;
        delete cleanFilter.viewerUser;

        const dataQuery = Complain.find(cleanFilter).sort(sort).select(select);
        let safeLimit = 0;

        if (requestedLimit > 0) {
            safeLimit = Math.min(requestedLimit, 1000);
            const skip = (page - 1) * safeLimit;
            dataQuery.skip(skip).limit(safeLimit);
        }

        if (populate) this._populate(dataQuery, { deep });
        if (session) dataQuery.session(session);

        const countQuery = Complain.countDocuments(cleanFilter);
        if (session) countQuery.session(session);

        const complains = await dataQuery.lean({ virtuals: true });
        const total = await countQuery;

        return {
            complains: complains.map((c) => this.maskComplainant(c, viewerRole, viewerUser)),
            meta: {
                total,
                page,
                limit: safeLimit || total,
                total_pages: safeLimit > 0 ? Math.ceil(total / safeLimit) || 1 : 1,
            },
        };
    }

    async updateByCustomId(customId, payload, { session = null, select = null, viewerRole = null, viewerUser = null } = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : { $set: payload };
        const query = Complain.findOneAndUpdate(
            { $or: [{ custom_id: customId }, { _id: customId }] },
            updateDoc,
            { returnDocument: 'after', runValidators: true, session }
        ).select(select);

        const doc = await query.lean({ virtuals: true });
        return this.maskComplainant(doc, viewerRole, viewerUser);
    }

    async updateById(id, payload, options = {}) {
        return await this.updateByCustomId(id, payload, options);
    }

    async updateMany(filter = {}, payload = {}, { session = null } = {}) {
        const updateDoc = Object.keys(payload).some((k) => k.startsWith('$')) ? payload : { $set: payload };
        return await Complain.updateMany(filter, updateDoc, { session });
    }

    async deleteByCustomId(customId, { session = null } = {}) {
        return await Complain.findOneAndDelete({
            $or: [{ custom_id: customId }, { _id: customId }],
        }).session(session).lean();
    }

    async deleteById(id, options = {}) {
        return await this.deleteByCustomId(id, options);
    }

    async deleteMany(filter = {}, { session = null } = {}) {
        return await Complain.deleteMany(filter, { session });
    }

    async getInstitutionalMetrics(matchFilter = {}, { session = null } = {}) {
        const pipeline = [
            { $match: matchFilter },

            {
                $lookup: {
                    from: 'users',
                    localField: 'complainant_id',
                    foreignField: '_id',
                    as: 'complainant_doc',
                },
            },

            {
                $addFields: {
                    normalized_dept_id: {
                        $cond: [
                            { $and: [{ $ne: ['$target_department_id', null] }, { $ne: ['$target_department_id', ''] }] },
                            '$target_department_id',
                            'UNKNOWN',
                        ],
                    },
                    resolved_complainant_role: {
                        $toLower: {
                            $ifNull: [
                                '$complainant_role',
                                {
                                    $ifNull: [
                                        { $arrayElemAt: ['$complainant_doc.role', 0] },
                                        'student',
                                    ],
                                },
                            ],
                        },
                    },
                },
            },

            {
                $facet: {
                    overall_summary: [
                        {
                            $group: {
                                _id: null,
                                total_cases: { $sum: 1 },
                                total_resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                                total_rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
                                total_pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
                                total_under_review: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
                                total_sla_breached: { $sum: { $cond: [{ $eq: ['$is_sla_breached', true] }, 1, 0] } },
                                total_direct_queries: { $sum: { $cond: [{ $eq: ['$ticket_type', 'DIRECT_QUERY'] }, 1, 0] } },
                                total_statutory: { $sum: { $cond: [{ $eq: ['$ticket_type', 'STATUTORY_GRIEVANCE'] }, 1, 0] } },
                                student_total: {
                                    $sum: { $cond: [{ $eq: ['$resolved_complainant_role', 'student'] }, 1, 0] },
                                },
                                faculty_total: {
                                    $sum: { $cond: [{ $in: ['$resolved_complainant_role', ['faculty', 'hod']] }, 1, 0] },
                                },
                                admin_total: {
                                    $sum: {
                                        $cond: [
                                            { $in: ['$resolved_complainant_role', ['admin', 'leadership', 'staff', 'officer', 'director']] },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                avg_resolution_hours: {
                                    $avg: {
                                        $cond: [
                                            { $and: [{ $eq: ['$status', 'RESOLVED'] }, { $gt: ['$resolution_details.resolved_at', null] }] },
                                            { $divide: [{ $subtract: ['$resolution_details.resolved_at', '$createdAt'] }, 1000 * 60 * 60] },
                                            null,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                total_cases: 1,
                                total_resolved: 1,
                                total_rejected: 1,
                                total_pending: 1,
                                total_under_review: 1,
                                active_cases: { $add: ['$total_pending', '$total_under_review'] },
                                total_sla_breached: 1,
                                total_direct_queries: 1,
                                total_statutory: 1,
                                student_total: 1,
                                faculty_total: 1,
                                admin_total: 1,
                                avg_resolution_hours: { $round: [{ $ifNull: ['$avg_resolution_hours', 0] }, 1] },
                                institutional_resolution_rate: {
                                    $cond: [{ $gt: ['$total_cases', 0] }, { $round: [{ $multiply: [{ $divide: ['$total_resolved', '$total_cases'] }, 100] }, 2] }, 0],
                                },
                                institutional_rejection_rate: {
                                    $cond: [{ $gt: ['$total_cases', 0] }, { $round: [{ $multiply: [{ $divide: ['$total_rejected', '$total_cases'] }, 100] }, 2] }, 0],
                                },
                                institutional_closure_rate: {
                                    $cond: [
                                        { $gt: ['$total_cases', 0] },
                                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$total_resolved', '$total_rejected'] }, '$total_cases'] }, 100] }, 2] },
                                        0,
                                    ],
                                },
                                sla_compliance_rate: {
                                    $cond: [
                                        { $gt: ['$total_cases', 0] },
                                        { $round: [{ $multiply: [{ $divide: [{ $subtract: ['$total_cases', '$total_sla_breached'] }, '$total_cases'] }, 100] }, 2] },
                                        100,
                                    ],
                                },
                            },
                        },
                    ],

                    priority_matrix: [
                        {
                            $group: {
                                _id: '$priority',
                                total: { $sum: 1 },
                                pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
                                under_review: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
                                resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                                rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
                                sla_breached: { $sum: { $cond: [{ $eq: ['$is_sla_breached', true] }, 1, 0] } },
                            },
                        },
                        { $sort: { _id: 1 } },
                    ],

                    department_benchmarks: [
                        {
                            $group: {
                                _id: '$normalized_dept_id',
                                total_cases: { $sum: 1 },
                                resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                                rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
                                pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
                                under_review: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
                                sla_breached: { $sum: { $cond: [{ $eq: ['$is_sla_breached', true] }, 1, 0] } },
                                student_cases: {
                                    $sum: { $cond: [{ $eq: ['$resolved_complainant_role', 'student'] }, 1, 0] },
                                },
                                faculty_cases: {
                                    $sum: { $cond: [{ $in: ['$resolved_complainant_role', ['faculty', 'hod']] }, 1, 0] },
                                },
                                admin_cases: {
                                    $sum: { $cond: [{ $in: ['$resolved_complainant_role', ['admin', 'leadership', 'staff', 'officer']] }, 1, 0] },
                                },
                                avg_resolution_hours: {
                                    $avg: {
                                        $cond: [
                                            { $and: [{ $eq: ['$status', 'RESOLVED'] }, { $gt: ['$resolution_details.resolved_at', null] }] },
                                            { $divide: [{ $subtract: ['$resolution_details.resolved_at', '$createdAt'] }, 1000 * 60 * 60] },
                                            null,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: 'departments',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'dept_match',
                            },
                        },
                        { $unwind: { path: '$dept_match', preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 1,
                                department_id: '$_id',
                                department_code: { $ifNull: ['$dept_match.department_code', '$_id'] },
                                department_name: { $ifNull: ['$dept_match.department_name', 'General Administration'] },
                                overall_total: '$total_cases',
                                overall_pending: '$pending',
                                overall_under_review: '$under_review',
                                overall_resolved: '$resolved',
                                overall_rejected: '$rejected',
                                active_cases: { $add: ['$pending', '$under_review'] },
                                sla_breached: 1,
                                student_cases: 1,
                                faculty_cases: 1,
                                admin_cases: 1,
                                avg_resolution_hours: { $round: [{ $ifNull: ['$avg_resolution_hours', 0] }, 1] },
                                institutional_resolution_rate: {
                                    $cond: [{ $gt: ['$total_cases', 0] }, { $round: [{ $multiply: [{ $divide: ['$resolved', '$total_cases'] }, 100] }, 2] }, 0],
                                },
                                institutional_closure_rate: {
                                    $cond: [
                                        { $gt: ['$total_cases', 0] },
                                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$resolved', '$rejected'] }, '$total_cases'] }, 100] }, 2] },
                                        0,
                                    ],
                                },
                            },
                        },
                        { $sort: { active_cases: -1, sla_breached: -1 } },
                    ],

                    faculty_benchmarks: [
                        {
                            $lookup: {
                                from: 'complainassignments',
                                localField: '_id',
                                foreignField: 'complain_id',
                                as: 'all_assignments',
                            },
                        },
                        {
                            $addFields: {
                                active_resp_str: {
                                    $cond: [
                                        { $and: [{ $ne: ['$active_respondent_id', null] }, { $ne: ['$active_respondent_id', ''] }] },
                                        '$active_respondent_id',
                                        null,
                                    ],
                                },
                                resolved_by_str: {
                                    $cond: [
                                        { $and: [{ $ne: ['$resolution_details.resolved_by', null] }, { $ne: ['$resolution_details.resolved_by', ''] }] },
                                        '$resolution_details.resolved_by',
                                        null,
                                    ],
                                },
                                rejected_by_str: {
                                    $cond: [
                                        { $and: [{ $ne: ['$rejection_details.rejected_by', null] }, { $ne: ['$rejection_details.rejected_by', ''] }] },
                                        '$rejection_details.rejected_by',
                                        null,
                                    ],
                                },
                                past_assignees_str: {
                                    $filter: {
                                        input: {
                                            $map: {
                                                input: { $ifNull: ['$all_assignments', []] },
                                                as: 'asn',
                                                in: { $ifNull: ['$$asn.respondent_id', '$$asn.faculty_id'] },
                                            },
                                        },
                                        as: 'item',
                                        cond: { $and: [{ $ne: ['$$item', null] }, { $ne: ['$$item', ''] }] },
                                    },
                                },
                            },
                        },
                        {
                            $addFields: {
                                involved_faculty_ids: {
                                    $setUnion: [
                                        { $cond: [{ $ne: ['$active_resp_str', null] }, ['$active_resp_str'], []] },
                                        { $cond: [{ $ne: ['$resolved_by_str', null] }, ['$resolved_by_str'], []] },
                                        { $cond: [{ $ne: ['$rejected_by_str', null] }, ['$rejected_by_str'], []] },
                                        '$past_assignees_str',
                                    ],
                                },
                            },
                        },
                        { $unwind: '$involved_faculty_ids' },
                        {
                            $match: {
                                involved_faculty_ids: { $nin: [null, '', 'null', 'undefined'] },
                            },
                        },
                        {
                            $addFields: {
                                is_active_respondent: {
                                    $and: [
                                        { $eq: ['$status', 'UNDER_REVIEW'] },
                                        { $eq: ['$active_resp_str', '$involved_faculty_ids'] },
                                    ],
                                },
                                is_actual_resolver: {
                                    $and: [
                                        { $eq: ['$status', 'RESOLVED'] },
                                        {
                                            $or: [
                                                { $eq: ['$resolved_by_str', '$involved_faculty_ids'] },
                                                {
                                                    $and: [
                                                        { $eq: ['$resolved_by_str', null] },
                                                        { $eq: ['$active_resp_str', '$involved_faculty_ids'] },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                is_actual_rejector: {
                                    $and: [
                                        { $eq: ['$status', 'REJECTED'] },
                                        {
                                            $or: [
                                                { $eq: ['$rejected_by_str', '$involved_faculty_ids'] },
                                                {
                                                    $and: [
                                                        { $eq: ['$rejected_by_str', null] },
                                                        { $eq: ['$active_resp_str', '$involved_faculty_ids'] },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                is_resolved_while_assigned: {
                                    $and: [
                                        { $eq: ['$status', 'RESOLVED'] },
                                        { $eq: ['$active_resp_str', '$involved_faculty_ids'] },
                                    ],
                                },
                                is_rejected_while_assigned: {
                                    $and: [
                                        { $eq: ['$status', 'REJECTED'] },
                                        { $eq: ['$active_resp_str', '$involved_faculty_ids'] },
                                    ],
                                },
                                is_transferred: {
                                    $and: [
                                        { $in: ['$involved_faculty_ids', '$past_assignees_str'] },
                                        { $ne: ['$active_resp_str', '$involved_faculty_ids'] },
                                        { $ne: ['$resolved_by_str', '$involved_faculty_ids'] },
                                        { $ne: ['$rejected_by_str', '$involved_faculty_ids'] },
                                    ],
                                },
                                is_breached_on_watch: {
                                    $and: [
                                        { $eq: ['$is_sla_breached', true] },
                                        {
                                            $or: [
                                                { $eq: ['$active_resp_str', '$involved_faculty_ids'] },
                                                { $eq: ['$resolved_by_str', '$involved_faculty_ids'] },
                                                { $eq: ['$rejected_by_str', '$involved_faculty_ids'] },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'involved_faculty_ids',
                                foreignField: '_id',
                                as: 'faculty_user',
                            },
                        },
                        { $unwind: { path: '$faculty_user', preserveNullAndEmptyArrays: false } },
                        {
                            $match: {
                                $or: [
                                    { 'faculty_user.role': { $in: ['faculty', 'hod', 'admin', 'leadership', 'officer', 'staff'] } },
                                    { 'faculty_user.designation': { $ne: null } },
                                ],
                                'faculty_user.role': { $ne: 'student' },
                            },
                        },
                        {
                            $addFields: {
                                unified_dept_id: {
                                    $cond: [
                                        { $and: [{ $ne: ['$faculty_user.department_id', null] }, { $ne: ['$faculty_user.department_id', ''] }] },
                                        '$faculty_user.department_id',
                                        '$normalized_dept_id',
                                    ],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: {
                                    department_id: '$unified_dept_id',
                                    faculty_id: '$involved_faculty_ids',
                                },
                                faculty_user: { $first: '$faculty_user' },
                                total_assigned: { $sum: 1 },
                                under_review: { $sum: { $cond: ['$is_active_respondent', 1, 0] } },
                                resolved: {
                                    $sum: {
                                        $cond: [
                                            { $or: ['$is_actual_resolver', '$is_resolved_while_assigned'] },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                rejected: {
                                    $sum: {
                                        $cond: [
                                            { $or: ['$is_actual_rejector', '$is_rejected_while_assigned'] },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                transferred: { $sum: { $cond: ['$is_transferred', 1, 0] } },
                                sla_breached: { $sum: { $cond: ['$is_breached_on_watch', 1, 0] } },
                                avg_resolution_hours: {
                                    $avg: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $or: ['$is_actual_resolver', '$is_resolved_while_assigned'] },
                                                    { $gt: ['$resolution_details.resolved_at', null] },
                                                ],
                                            },
                                            { $divide: [{ $subtract: ['$resolution_details.resolved_at', '$createdAt'] }, 1000 * 60 * 60] },
                                            null,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: 'departments',
                                localField: '_id.department_id',
                                foreignField: '_id',
                                as: 'faculty_dept',
                            },
                        },
                        { $unwind: { path: '$faculty_dept', preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: { $ifNull: ['$faculty_dept._id', '$_id.department_id'] },
                                department_id: { $first: { $ifNull: ['$faculty_dept._id', '$_id.department_id'] } },
                                department_code: { $first: { $ifNull: ['$faculty_dept.department_code', '$_id.department_id'] } },
                                department_name: { $first: { $ifNull: ['$faculty_dept.department_name', 'General Administration'] } },
                                faculties: {
                                    $push: {
                                        faculty_id: '$_id.faculty_id',
                                        faculty_name: { $ifNull: ['$faculty_user.full_name', 'Faculty Member'] },
                                        faculty_email: { $ifNull: ['$faculty_user.email', null] },
                                        designation: { $ifNull: ['$faculty_user.designation', 'Faculty'] },
                                        department_name: { $ifNull: ['$faculty_dept.department_name', 'General Administration'] },
                                        total_assigned: '$total_assigned',
                                        active_under_review: '$under_review',
                                        resolved: '$resolved',
                                        rejected: '$rejected',
                                        transferred: '$transferred',
                                        sla_breached: '$sla_breached',
                                        avg_resolution_hours: { $round: [{ $ifNull: ['$avg_resolution_hours', 0] }, 1] },
                                        resolution_rate: {
                                            $cond: [
                                                { $gt: ['$total_assigned', 0] },
                                                { $round: [{ $multiply: [{ $divide: ['$resolved', '$total_assigned'] }, 100] }, 2] },
                                                0,
                                            ],
                                        },
                                        closure_rate: {
                                            $cond: [
                                                { $gt: ['$total_assigned', 0] },
                                                { $round: [{ $multiply: [{ $divide: [{ $add: ['$resolved', '$rejected'] }, '$total_assigned'] }, 100] }, 2] },
                                                0,
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                        { $sort: { department_name: 1 } },
                    ],
                },
            },
        ];

        const aggregateQuery = Complain.aggregate(pipeline);
        if (session) aggregateQuery.session(session);

        const [result] = await aggregateQuery;

        return {
            executive_summary: result?.overall_summary?.[0] || {
                total_cases: 0,
                active_cases: 0,
                total_resolved: 0,
                total_rejected: 0,
                total_pending: 0,
                total_under_review: 0,
                total_sla_breached: 0,
                total_direct_queries: 0,
                total_statutory: 0,
                student_total: 0,
                faculty_total: 0,
                admin_total: 0,
                avg_resolution_hours: 0,
                institutional_resolution_rate: 0,
                institutional_rejection_rate: 0,
                institutional_closure_rate: 0,
                sla_compliance_rate: 100,
            },
            priority_matrix: result?.priority_matrix || [],
            department_benchmarks: result?.department_benchmarks || [],
            faculty_benchmarks: result?.faculty_benchmarks || [],
        };
    }
}

export default new ComplainRepository();