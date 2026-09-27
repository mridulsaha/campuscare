import branchService from '../services/branch.service.js';
import {sendSuccess} from '../utils/response.js';

export async function createBranch(req, res, next) {
    try {
        const created = await branchService.create(req.body);
        return sendSuccess(res, {
            statusCode: 201, message: 'Branch created successfully', data: created,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAllBranches(req, res, next) {
    try {
        const result = await branchService.getAll(req.query);
        return sendSuccess(res, {
            statusCode: 200, message: 'Branches retrieved successfully', data: result.branches, meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getBranchById(req, res, next) {
    try {
        const branch = await branchService.getById(req.params.id, {populate: true});
        return sendSuccess(res, {
            statusCode: 200, message: 'Branch details retrieved', data: branch,
        });
    } catch (err) {
        next(err);
    }
}

export async function updateBranch(req, res, next) {
    try {
        const updated = await branchService.updateById(req.params.id, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Branch updated successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteBranch(req, res, next) {
    try {
        const report = await branchService.cascadeDeleteBranch(req.params.id);
        return sendSuccess(res, {
            statusCode: 200, message: 'Branch removed and user references cascaded successfully', data: report,
        });
    } catch (err) {
        next(err);
    }
}