import complainCategoryService from '../services/complain.category.service.js';
import {sendSuccess} from '../utils/response.js';

export async function createCategory(req, res, next) {
    try {
        const created = await complainCategoryService.create(req.body);
        return sendSuccess(res, {
            statusCode: 201, message: 'Grievance category created successfully', data: created,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAllCategories(req, res, next) {
    try {
        const categories = await complainCategoryService.getAll(req.query, {
            populate: req.query.populate === 'true',
        });
        return sendSuccess(res, {
            statusCode: 200, message: 'Grievance categories retrieved', data: categories,
        });
    } catch (err) {
        next(err);
    }
}

export async function getCategoryById(req, res, next) {
    try {
        const item = await complainCategoryService.getById(req.params.id, {populate: true});
        return sendSuccess(res, {
            statusCode: 200, message: 'Category details retrieved', data: item,
        });
    } catch (err) {
        next(err);
    }
}

export async function updateCategory(req, res, next) {
    try {
        const updated = await complainCategoryService.updateById(req.params.id, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Category updated successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteCategory(req, res, next) {
    try {
        const report = await complainCategoryService.cascadeDeleteCategory(req.params.id);
        return sendSuccess(res, {
            statusCode: 200, message: 'Category and all cascaded complaints removed successfully', data: report,
        });
    } catch (err) {
        next(err);
    }
}