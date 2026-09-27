import userService from '../services/user.service.js';
import {sendSuccess} from '../utils/response.js';

export async function completeUserProfile(req, res, next) {
    try {
        const userId = req.user.id || req.user._id || req.user.custom_id;
        const updatedUser = await userService.completeUserProfile(userId, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'User profile completed and locked successfully', data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
}

export async function getUsers(req, res, next) {
    try {
        const result = await userService.getMany(req.query, {
            populate: req.query.populate === 'true', page: req.query.page, limit: req.query.limit,
        });
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Users retrieved successfully',
            data: result.users || result,
            meta: result.meta || null,
        });
    } catch (err) {
        next(err);
    }
}

export async function getUserById(req, res, next) {
    try {
        const result = await userService.getById(req.params.id || req.params._id || req.params.custom_id, {
            populate: req.query.populate === 'true',
        });
        return sendSuccess(res, {
            statusCode: 200, message: 'User retrieved successfully', data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function adminUpdateUser(req, res, next) {
    try {
        const updatedUser = await userService.adminUpdateUser(req.user, req.params.id, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'User profile updated successfully', data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteUser(req, res, next) {
    try {
        const result = await userService.cascadeDeleteUser(req.user, req.params.id);
        return sendSuccess(res, {
            statusCode: 200, message: 'User account and dependent records deleted successfully', data: result,
        });
    } catch (err) {
        next(err);
    }
}