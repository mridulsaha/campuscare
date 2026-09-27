import bulkService from '../services/bulk.service.js';
import {parseCSVBuffer, generateCSVString} from '../utils/csv.util.js';
import {sendSuccess} from '../utils/response.js';

function validateUploadedBuffer(req) {
    if (!req.file || !req.file.buffer) {
        const err = new Error('CSV file upload is required');
        err.statusCode = 400;
        throw err;
    }
    return parseCSVBuffer(req.file.buffer);
}

export async function importDepartments(req, res, next) {
    try {
        const rows = validateUploadedBuffer(req);
        const result = await bulkService.bulkImportDepartments(rows);
        return sendSuccess(res, {
            statusCode: 201, message: `Successfully imported ${result.imported_count} departments`, data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function importProgrammes(req, res, next) {
    try {
        const rows = validateUploadedBuffer(req);
        const result = await bulkService.bulkImportProgrammes(rows);
        return sendSuccess(res, {
            statusCode: 201, message: `Successfully imported ${result.imported_count} programmes`, data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function importBranches(req, res, next) {
    try {
        const rows = validateUploadedBuffer(req);
        const result = await bulkService.bulkImportBranches(rows);
        return sendSuccess(res, {
            statusCode: 201, message: `Successfully imported ${result.imported_count} branches`, data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function importCategoriesAndSubcategories(req, res, next) {
    try {
        const rows = validateUploadedBuffer(req);
        const result = await bulkService.bulkImportCategoriesAndSubcategories(rows);
        return sendSuccess(res, {
            statusCode: 201,
            message: `Successfully imported categories (${result.imported_categories_count}) and subcategories (${result.imported_subcategories_count})`,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function importStudents(req, res, next) {
    try {
        const rows = validateUploadedBuffer(req);
        const result = await bulkService.bulkImportStudents(rows);
        return sendSuccess(res, {
            statusCode: 201, message: `Successfully enrolled ${result.imported_count} students`, data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function importFaculty(req, res, next) {
    try {
        const rows = validateUploadedBuffer(req);
        const result = await bulkService.bulkImportFaculty(rows);
        return sendSuccess(res, {
            statusCode: 201, message: `Successfully registered ${result.imported_count} faculty members`, data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function exportComplianceData(req, res, next) {
    try {
        const queryParams = { ...req.query };

        if (req.user?.designation === 'hod') {
            const rawDeptId = req.user.department_id?._id || req.user.department_id?.custom_id || req.user.department_id;
            if (rawDeptId) {
                queryParams.target_department_id = String(rawDeptId);
            }
        }

        const { filename, headers, rows } = await bulkService.exportGrievanceComplianceData(queryParams);
        const csvContent = generateCSVString(headers, rows);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        return res.status(200).send('\uFEFF' + csvContent);
    } catch (err) {
        next(err);
    }
}