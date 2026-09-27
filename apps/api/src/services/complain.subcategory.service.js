import mongoose from 'mongoose';
import complainSubcategoryRepository from '../repositories/complain.subcategory.repository.js';
import complainCategoryRepository from '../repositories/complain.category.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import complainService from './complain.service.js';
import {generateCustomId} from '../utils/id.generator.js';
import {sanitizeString} from '../utils/validator.js';

class ComplainSubcategoryService {
    async create(payload) {
        const title = sanitizeString(payload.title, {minLength: 2, maxLength: 120, uppercase: true});
        const categoryId = sanitizeString(payload.category_id, {uppercase: true});

        const category = await complainCategoryRepository.findById(categoryId);
        if (!category) {
            const err = new Error(`Parent category "${categoryId}" does not exist`);
            err.statusCode = 404;
            throw err;
        }

        if (category.status === 'inactive') {
            const err = new Error(`Cannot create subcategory under inactive category "${category.title}"`);
            err.statusCode = 400;
            throw err;
        }

        const exists = await complainSubcategoryRepository.existsByCategoryIdAndTitle(categoryId, title);
        if (exists) {
            const err = new Error(`Subcategory "${title}" already exists in this category`);
            err.statusCode = 409;
            throw err;
        }

        const audience = payload.target_audience ? sanitizeString(payload.target_audience, {lowercase: true}) : 'all';

        if (!['student', 'faculty', 'all'].includes(audience)) {
            const err = new Error('target_audience must be "student", "faculty", or "all"');
            err.statusCode = 400;
            throw err;
        }

        const priority = payload.default_priority ? sanitizeString(payload.default_priority, {uppercase: true}) : (category.default_priority || 'MEDIUM');

        if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
            const err = new Error('default_priority must be "LOW", "MEDIUM", "HIGH", or "CRITICAL"');
            err.statusCode = 400;
            throw err;
        }

        const generatedId = await generateCustomId('SUB');

        return await complainSubcategoryRepository.create({
            _id: generatedId,
            custom_id: generatedId,
            title,
            category_id: categoryId,
            target_audience: audience,
            default_priority: priority,
            description: payload.description ? sanitizeString(payload.description, {maxLength: 500}) : null,
            status: payload.status && ['active', 'inactive'].includes(payload.status.toLowerCase()) ? payload.status.toLowerCase() : 'active',
        });
    }

    async getById(id, options = {}) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const subcategory = await complainSubcategoryRepository.findById(cleanId, options);
        if (!subcategory) {
            const err = new Error(`Subcategory "${cleanId}" not found`);
            err.statusCode = 404;
            throw err;
        }
        return subcategory;
    }

    async getAll(query = {}, options = {}) {
        const filter = {};
        if (query.category_id) {
            filter.category_id = sanitizeString(query.category_id, {uppercase: true});
        }
        if (query.target_audience) {
            filter.target_audience = {$in: [query.target_audience.toLowerCase(), 'all']};
        }
        if (query.status) {
            filter.status = query.status.toLowerCase();
        }
        return await complainSubcategoryRepository.find(filter, {
            ...options,
            populate: options.populate === true || query.populate === 'true',
            page: query.page || options.page,
            limit: query.limit !== undefined ? query.limit : options.limit,
        });
    }

    async updateById(id, payload) {
        const cleanId = sanitizeString(id, {uppercase: true});
        const existingSubcategory = await this.getById(cleanId);

        if (payload.category_id) {
            const requestedCatId = sanitizeString(payload.category_id, {uppercase: true});
            if (requestedCatId !== existingSubcategory.category_id) {
                const err = new Error('Immutable Field: Reassigning a subcategory to a different category is not permitted to preserve historical ticket integrity.');
                err.statusCode = 400;
                throw err;
            }
        }

        const updateDoc = {};

        if (payload.title) {
            const newTitle = sanitizeString(payload.title, {minLength: 2, maxLength: 120, uppercase: true});
            if (newTitle !== existingSubcategory.title) {
                const exists = await complainSubcategoryRepository.existsByCategoryIdAndTitle(existingSubcategory.category_id, newTitle);
                if (exists) {
                    const err = new Error(`Subcategory "${newTitle}" already exists in this category`);
                    err.statusCode = 409;
                    throw err;
                }
                updateDoc.title = newTitle;
            }
        }

        if (payload.target_audience) {
            const newAudience = sanitizeString(payload.target_audience, {lowercase: true});
            if (!['student', 'faculty', 'all'].includes(newAudience)) {
                const err = new Error('target_audience must be "student", "faculty", or "all"');
                err.statusCode = 400;
                throw err;
            }
            updateDoc.target_audience = newAudience;
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

        return await complainSubcategoryRepository.updateById(cleanId, updateDoc);
    }

    async cascadeDeleteSubcategory(id) {
        const cleanId = sanitizeString(id, {uppercase: true});
        await this.getById(cleanId);

        const complaintsResult = await complainRepository.find({subcategory_id: cleanId}, {limit: 0});
        const complaints = complaintsResult.complains || [];

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (const ticket of complaints) {
                const ticketId = ticket._id || ticket.id || ticket.custom_id;
                await complainService.deleteComplaintWithDependencies(ticketId, session);
            }

            await complainSubcategoryRepository.deleteById(cleanId, {session});

            await session.commitTransaction();
            return {
                deleted_subcategory_id: cleanId, cascaded_complaints_count: complaints.length,
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

    async deleteById(id) {
        return await this.cascadeDeleteSubcategory(id);
    }
}

export default new ComplainSubcategoryService();