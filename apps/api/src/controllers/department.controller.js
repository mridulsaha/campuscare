import departmentService from '../services/department.service.js';
import {sendSuccess} from '../utils/response.js';

export async function createDepartment(req, res, next) {
    try {
        const created = await departmentService.create(req.body);
        return sendSuccess(res, {
            statusCode: 201, message: 'Department registered successfully', data: created,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAllDepartments(req, res, next) {
    try {
        const result = await departmentService.getAll({
            ...req.query, populate: req.query.populate === 'true',
        });
        return sendSuccess(res, {
            statusCode: 200, message: 'Departments retrieved successfully', data: result.departments, meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getDepartmentById(req, res, next) {
    try {
        const dept = await departmentService.getById(req.params.id, {populate: true});
        return sendSuccess(res, {
            statusCode: 200, message: 'Department details retrieved', data: dept,
        });
    } catch (err) {
        next(err);
    }
}

export async function updateDepartment(req, res, next) {
    try {
        const updated = await departmentService.updateById(req.params.id, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Department and associated entities updated successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteDepartment(req, res, next) {
    try {
        const report = await departmentService.cascadeDeleteDepartment(req.params.id);
        return sendSuccess(res, {
            statusCode: 200,
            message: 'Department, underlying branches, and user associations cascaded successfully',
            data: report,
        });
    } catch (err) {
        next(err);
    }
}