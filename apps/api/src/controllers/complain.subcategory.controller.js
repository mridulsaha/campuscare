import complainSubcategoryService from '../services/complain.subcategory.service.js';
import {sendSuccess} from '../utils/response.js';

export async function createSubcategory(req, res, next) {
    try {
        const created = await complainSubcategoryService.create(req.body);
        return sendSuccess(res, {
            statusCode: 201, message: 'Subcategory created successfully', data: created,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAllSubcategories(req, res, next) {
    try {
        const result = await complainSubcategoryService.getAll(req.query, {
            populate: req.query.populate === 'true',
        });
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Subcategories retrieved successfully',
            data: result.subcategories || result,
            meta: result.meta || null,
        });
    } catch (err) {
        next(err);
    }
}

export async function getSubcategoryById(req, res, next) {
    try {
        const item = await complainSubcategoryService.getById(req.params.id, {populate: true});
        return sendSuccess(res, {
            statusCode: 200, message: 'Subcategory details retrieved', data: item,
        });
    } catch (err) {
        next(err);
    }
}

export async function updateSubcategory(req, res, next) {
    try {
        const updated = await complainSubcategoryService.updateById(req.params.id, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Subcategory updated successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteSubcategory(req, res, next) {
    try {
        const report = await complainSubcategoryService.cascadeDeleteSubcategory(req.params.id);
        return sendSuccess(res, {
            statusCode: 200, message: 'Subcategory and all dependent complaints removed successfully', data: report,
        });
    } catch (err) {
        next(err);
    }
}