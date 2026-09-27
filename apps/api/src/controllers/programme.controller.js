import programmeService from '../services/programme.service.js';
import {sendSuccess} from '../utils/response.js';

export async function createProgramme(req, res, next) {
    try {
        const created = await programmeService.create(req.body);
        return sendSuccess(res, {
            statusCode: 201, message: 'Programme created successfully', data: created,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAllProgrammes(req, res, next) {
    try {
        const result = await programmeService.getAll({
            ...req.query, populate: req.query.populate === 'true',
        });
        return sendSuccess(res, {
            statusCode: 200, message: 'Programmes retrieved successfully', data: result.programmes, meta: result.meta,
        });
    } catch (err) {
        next(err);
    }
}

export async function getProgrammeById(req, res, next) {
    try {
        const prog = await programmeService.getById(req.params.id, {populate: true});
        return sendSuccess(res, {
            statusCode: 200, message: 'Programme details retrieved', data: prog,
        });
    } catch (err) {
        next(err);
    }
}

export async function updateProgramme(req, res, next) {
    try {
        const updated = await programmeService.updateById(req.params.id, req.body);
        return sendSuccess(res, {
            statusCode: 200, message: 'Programme updated and branches cascaded successfully', data: updated,
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteProgramme(req, res, next) {
    try {
        const report = await programmeService.cascadeDeleteProgramme(req.params.id);
        return sendSuccess(res, {
            statusCode: 200, message: 'Programme, branches, and user references cleaned up successfully', data: report,
        });
    } catch (err) {
        next(err);
    }
}