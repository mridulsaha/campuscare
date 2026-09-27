import mongoose from 'mongoose';
import complainCategoryRepository from '../repositories/complain.category.repository.js';
import complainSubcategoryRepository from '../repositories/complain.subcategory.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import complainService from './complain.service.js';
import {generateCustomId} from '../utils/id.generator.js';
import {sanitizeString} from '../utils/validator.js';

class ComplainCategoryService {
    async _validateTitleCollision(title, excludeCategoryId = null) {
        const categories = await complainCategoryRepository.find({title});

        for (const cat of categories) {
            const catId = (cat._id || cat.id || cat.custom_id)?.toString();
            if (excludeCategoryId && catId === excludeCategoryId.toString()) continue;

            if (cat.title === title) {
                const err = new Error(`Category "${title}" already exists`);
                err.statusCode = 409;
                throw err;
            }
        }
    }

    async create(payload) {
        const title = sanitizeString(payload.title, {minLength: 2, maxLength: 120, uppercase: true});
        const priority = payload.default_priority ? sanitizeString(payload.default_priority, {uppercase: true}) : 'MEDIUM';

        if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
            const err = new Error('default_priority must be "LOW", "MEDIUM", "HIGH", or "CRITICAL"');
            err.statusCode = 400;
            throw err;
        }

        await this._validateTitleCollision(title);

        const generatedId = await generateCustomId('CAT');

        return await complainCategoryRepository.create({
            _id: generatedId,
            custom_id: generatedId,
            title,
            default_priority: priority,
            description: payload.description ? sanitizeString(payload.description, {maxLength: 500}) : null,
            status: payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase()) ? payload.status.toLowerCase() : 'active',
        });
    }

    async getById(id, options = {}) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const category = await complainCategoryRepository.findById(cleanId, options);
        if (!category) {
            const err = new Error(`Category "${cleanId}" not found`);
            err.statusCode = 404;
            throw err;
        }
        return category;
    }

    async getAll(query = {}, options = {}) {
        const filter = {};
        if (query.status) {
            filter.status = query.status.toLowerCase();
        }
        return await complainCategoryRepository.find(filter, {
            populate: options.populate === true || query.populate === 'true', select: options.select || null,
        });
    }

    async updateById(id, payload) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const existingCategory = await this.getById(cleanId);

        const updateDoc = {};

        if (payload.title) {
            const newTitle = sanitizeString(payload.title, {minLength: 2, maxLength: 120, uppercase: true});
            if (newTitle !== existingCategory.title) {
                await this._validateTitleCollision(newTitle, cleanId);
                updateDoc.title = newTitle;
            }
        }

        if (payload.default_priority) {
            const priority = sanitizeString(payload.default_priority, {uppercase: true});
            if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
                const err = new Error('default_priority must be "LOW", "MEDIUM", "HIGH", or "CRITICAL"');
                err.statusCode = 400;
                throw err;
            }
            updateDoc.default_priority = priority;
        }

        if (payload.description !== undefined) {
            updateDoc.description = payload.description ? sanitizeString(payload.description, {maxLength: 500}) : null;
        }

        if (payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase())) {
            updateDoc.status = payload.status.toLowerCase();
        }

        return await complainCategoryRepository.updateById(cleanId, updateDoc);
    }

    async cascadeDeleteCategory(id) {
        const cleanId = sanitizeString(id, {uppercase: true});
        await this.getById(cleanId);

        const complaintsResult = await complainRepository.find({category_id: cleanId}, {limit: 0});
        const complaints = complaintsResult.complains || [];

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (const ticket of complaints) {
                const ticketId = ticket._id || ticket.id || ticket.custom_id;
                await complainService.deleteComplaintWithDependencies(ticketId, session);
            }

            await complainSubcategoryRepository.deleteMany({category_id: cleanId}, {session});
            await complainCategoryRepository.deleteById(cleanId, {session});

            await session.commitTransaction();
            return {
                deleted_category_id: cleanId, cascaded_complaints_count: complaints.length,
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

export default new ComplainCategoryService();