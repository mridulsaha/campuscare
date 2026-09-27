import ComplainChat from '../models/complain.chat.model.js';

class ComplainChatRepository {
    async create(payload, { session = null } = {}) {
        const [chat] = await ComplainChat.create([payload], { session });
        if (!chat) return null;
        return await ComplainChat.findById(chat._id)
            .populate('sender', 'custom_id full_name email role designation department_id')
            .lean({ virtuals: true });
    }

    async findByComplainId(complainId, { page = 1, limit = 30, session = null } = {}) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
        const skip = (safePage - 1) * safeLimit;

        const filter = {
            $or: [{ complain_id: complainId }, { complain_id: String(complainId) }],
        };

        const dataQuery = ComplainChat.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .populate('sender', 'custom_id full_name email role designation department_id');

        if (session) dataQuery.session(session);

        const countQuery = ComplainChat.countDocuments(filter);
        if (session) countQuery.session(session);

        const [rawMessages, total] = await Promise.all([
            dataQuery.lean({ virtuals: true }),
            countQuery,
        ]);

        const messages = rawMessages.reverse();

        return {
            messages,
            meta: {
                total,
                page: safePage,
                limit: safeLimit,
                total_pages: Math.ceil(total / safeLimit) || 1,
            },
        };
    }
}

export default new ComplainChatRepository();