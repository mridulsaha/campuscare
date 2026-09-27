import mongoose from 'mongoose';
import userRepository from '../repositories/user.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import branchRepository from '../repositories/branch.repository.js';
import complainRepository from '../repositories/complain.repository.js';
import programmeRepository from '../repositories/programme.repository.js';
import complainCategoryRepository from '../repositories/complain.category.repository.js';
import complainSubcategoryRepository from '../repositories/complain.subcategory.repository.js';
import { generateCustomId } from '../utils/id.generator.js';
import {
    validateEmail, validateEnrollmentNumber, validateCode, sanitizeString,
} from '../utils/validator.js';
import { VALID_DESIGNATIONS } from '../configs/auth.config.js';

class BulkService {
    async bulkImportDepartments(csvRows) {
        if (!csvRows.length) {
            const err = new Error('CSV file contains no records');
            err.statusCode = 400;
            throw err;
        }

        const validationErrors = [];
        const validatedRecords = [];
        const seenCodes = new Set();
        const seenNames = new Set();

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNumber = i + 2;

            try {
                const code = validateCode(row.department_code, 'department_code');
                const name = sanitizeString(row.department_name, { minLength: 2, maxLength: 150, uppercase: true });
                const status = row.status && ['active', 'inactive'].includes(row.status.toLowerCase()) ? row.status.toLowerCase() : 'active';

                if (seenCodes.has(code)) throw new Error(`Duplicate department code "${code}" in CSV`);
                if (seenNames.has(name)) throw new Error(`Duplicate department name "${name}" in CSV`);

                seenCodes.add(code);
                seenNames.add(name);
                validatedRecords.push({ rowNumber, code, name, status });
            } catch (err) {
                validationErrors.push({ row: rowNumber, error: err.message });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('CSV Validation Failed');
            err.statusCode = 400;
            err.details = validationErrors;
            throw err;
        }

        for (const record of validatedRecords) {
            const codeTaken = await departmentRepository.existsByCode(record.code);
            const nameTaken = await departmentRepository.existsByName(record.name);
            if (codeTaken) validationErrors.push({
                row: record.rowNumber, error: `Department code "${record.code}" already exists in DB`
            });
            if (nameTaken) validationErrors.push({
                row: record.rowNumber, error: `Department name "${record.name}" already exists in DB`
            });
        }

        if (validationErrors.length > 0) {
            const err = new Error('Database Collision: Records already exist');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const inserted = [];
            for (const record of validatedRecords) {
                const deptId = await generateCustomId('DEP', session);
                const doc = await departmentRepository.create({
                    _id: deptId,
                    custom_id: deptId,
                    department_code: record.code,
                    department_name: record.name,
                    status: record.status,
                }, { session });
                inserted.push(doc);
            }

            await session.commitTransaction();
            return { imported_count: inserted.length, records: inserted };
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async bulkImportProgrammes(csvRows) {
        if (!csvRows.length) {
            const err = new Error('CSV file contains no records');
            err.statusCode = 400;
            throw err;
        }

        const validationErrors = [];
        const validatedRecords = [];
        const seenCodes = new Set();
        const seenNames = new Set();

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNumber = i + 2;

            try {
                const code = validateCode(row.programme_code, 'programme_code');
                const name = sanitizeString(row.programme_name, { minLength: 2, maxLength: 150, uppercase: true });
                const duration = Number(row.duration_year);
                const semesters = Number(row.total_semester);
                const status = row.status && ['active', 'inactive'].includes(row.status.toLowerCase()) ? row.status.toLowerCase() : 'active';

                if (Number.isNaN(duration) || duration < 1 || duration > 10) {
                    throw new Error('duration_year must be an integer between 1 and 10');
                }
                if (Number.isNaN(semesters) || semesters < 1 || semesters > 20) {
                    throw new Error('total_semester must be an integer between 1 and 20');
                }

                if (seenCodes.has(code)) throw new Error(`Duplicate programme code "${code}" in CSV`);
                if (seenNames.has(name)) throw new Error(`Duplicate programme name "${name}" in CSV`);

                seenCodes.add(code);
                seenNames.add(name);
                validatedRecords.push({ rowNumber, code, name, duration, semesters, status });
            } catch (err) {
                validationErrors.push({ row: rowNumber, error: err.message });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('CSV Validation Failed');
            err.statusCode = 400;
            err.details = validationErrors;
            throw err;
        }

        for (const record of validatedRecords) {
            const codeTaken = await programmeRepository.existsByCode(record.code);
            const nameTaken = await programmeRepository.existsByName(record.name);
            if (codeTaken) validationErrors.push({
                row: record.rowNumber, error: `Programme code "${record.code}" already exists in DB`
            });
            if (nameTaken) validationErrors.push({
                row: record.rowNumber, error: `Programme name "${record.name}" already exists in DB`
            });
        }

        if (validationErrors.length > 0) {
            const err = new Error('Database Collision');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const inserted = [];
            for (const record of validatedRecords) {
                const progId = await generateCustomId('PRG', session);
                const doc = await programmeRepository.create({
                    _id: progId,
                    custom_id: progId,
                    programme_code: record.code,
                    programme_name: record.name,
                    duration_year: record.duration,
                    total_semester: record.semesters,
                    status: record.status,
                }, { session });
                inserted.push(doc);
            }

            await session.commitTransaction();
            return { imported_count: inserted.length, records: inserted };
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async bulkImportBranches(csvRows) {
        if (!csvRows.length) {
            const err = new Error('CSV file contains no records');
            err.statusCode = 400;
            throw err;
        }

        const validationErrors = [];
        const validatedRecords = [];
        const seenCodes = new Set();

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNumber = i + 2;

            try {
                const branchCode = validateCode(row.branch_code, 'branch_code');
                const branchName = sanitizeString(row.branch_name, { minLength: 2, maxLength: 150, uppercase: true });
                const deptCode = validateCode(row.department_code, 'department_code');
                const progCode = validateCode(row.programme_code, 'programme_code');
                const status = row.status && ['active', 'inactive'].includes(row.status.toLowerCase()) ? row.status.toLowerCase() : 'active';

                if (seenCodes.has(branchCode)) throw new Error(`Duplicate branch code "${branchCode}" in CSV`);
                seenCodes.add(branchCode);

                validatedRecords.push({ rowNumber, branchCode, branchName, deptCode, progCode, status });
            } catch (err) {
                validationErrors.push({ row: rowNumber, error: err.message });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('CSV Validation Failed');
            err.statusCode = 400;
            err.details = validationErrors;
            throw err;
        }

        const deptCache = new Map();
        const progCache = new Map();

        for (const record of validatedRecords) {
            if (!deptCache.has(record.deptCode)) {
                const dept = await departmentRepository.findByCode(record.deptCode);
                if (!dept) {
                    validationErrors.push({
                        row: record.rowNumber, error: `Department code "${record.deptCode}" does not exist`
                    });
                } else {
                    deptCache.set(record.deptCode, dept);
                }
            }

            if (!progCache.has(record.progCode)) {
                const prog = await programmeRepository.findByCode(record.progCode);
                if (!prog) {
                    validationErrors.push({
                        row: record.rowNumber, error: `Programme code "${record.progCode}" does not exist`
                    });
                } else {
                    progCache.set(record.progCode, prog);
                }
            }

            const codeExists = await branchRepository.existsByCode(record.branchCode);
            if (codeExists) {
                validationErrors.push({
                    row: record.rowNumber, error: `Branch code "${record.branchCode}" already exists in DB`
                });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('Relational Failure / Database Collisions');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        for (const record of validatedRecords) {
            const dept = deptCache.get(record.deptCode);
            const prog = progCache.get(record.progCode);

            const duplicateName = await branchRepository.existsByNameInDepartmentAndProgramme(dept.custom_id || dept._id || dept.id, prog.custom_id || prog._id || prog.id, record.branchName);
            if (duplicateName) {
                validationErrors.push({
                    row: record.rowNumber,
                    error: `Branch name "${record.branchName}" already exists in Department ${record.deptCode} and Programme ${record.progCode}`,
                });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('Compound Index Collisions');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const inserted = [];
            for (const record of validatedRecords) {
                const dept = deptCache.get(record.deptCode);
                const prog = progCache.get(record.progCode);
                const branchId = await generateCustomId('BRN', session);

                const doc = await branchRepository.create({
                    _id: branchId,
                    custom_id: branchId,
                    branch_code: record.branchCode,
                    branch_name: record.branchName,
                    department_id: dept.custom_id || dept._id || dept.id,
                    programme_id: prog.custom_id || prog._id || prog.id,
                    status: record.status,
                }, { session });

                inserted.push(doc);
            }

            await session.commitTransaction();
            return { imported_count: inserted.length, records: inserted };
        } catch (err) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw err;
        } finally {
            session.endSession();
        }
    }

    async bulkImportCategoriesAndSubcategories(csvRows) {
        if (!csvRows.length) {
            const err = new Error('CSV file contains no records');
            err.statusCode = 400;
            throw err;
        }

        const validationErrors = [];
        const parsedRows = [];
        const seenCombinations = new Set();

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNumber = i + 2;

            try {
                const categoryTitle = sanitizeString(row.category_title, {
                    minLength: 2, maxLength: 120, uppercase: true
                });
                const subcategoryTitle = sanitizeString(row.subcategory_title, {
                    minLength: 2, maxLength: 120, uppercase: true
                });
                const audience = row.target_audience ? sanitizeString(row.target_audience, { lowercase: true }) : 'all';
                const defaultPriority = row.default_priority ? sanitizeString(row.default_priority, { uppercase: true }) : 'MEDIUM';
                const description = row.description ? sanitizeString(row.description, { maxLength: 500 }) : null;

                if (!['student', 'faculty', 'all'].includes(audience)) {
                    throw new Error(`target_audience must be "student", "faculty", or "all". Received "${audience}"`);
                }

                if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(defaultPriority)) {
                    throw new Error(`default_priority must be "LOW", "MEDIUM", "HIGH", or "CRITICAL". Received "${defaultPriority}"`);
                }

                const comboKey = `${categoryTitle}__${subcategoryTitle}__${audience}`;
                if (seenCombinations.has(comboKey)) {
                    throw new Error(`Duplicate subcategory "${subcategoryTitle}" for audience "${audience}" under category "${categoryTitle}" in CSV`);
                }
                seenCombinations.add(comboKey);

                parsedRows.push({
                    rowNumber, categoryTitle, subcategoryTitle, audience, defaultPriority, description,
                });
            } catch (err) {
                validationErrors.push({ row: rowNumber, error: err.message });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('CSV Validation Failed');
            err.statusCode = 400;
            err.details = validationErrors;
            throw err;
        }

        const categoryCache = new Map();

        for (const item of parsedRows) {
            if (!categoryCache.has(item.categoryTitle)) {
                const found = await complainCategoryRepository.find({ title: item.categoryTitle });
                const records = Array.isArray(found) ? found : (found.categories || []);
                categoryCache.set(item.categoryTitle, records[0] || null);
            }

            const existingCat = categoryCache.get(item.categoryTitle);
            if (existingCat) {
                const catId = existingCat._id || existingCat.id || existingCat.custom_id;
                const subExists = await complainSubcategoryRepository.existsByCategoryIdTitleAndAudience(catId, item.subcategoryTitle, item.audience);

                if (subExists) {
                    validationErrors.push({
                        row: item.rowNumber,
                        error: `Subcategory "${item.subcategoryTitle}" (${item.audience}) already exists under category "${item.categoryTitle}" in DB`,
                    });
                }
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('Database Collision: Records already exist');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            let categoriesCreated = 0;
            let subcategoriesCreated = 0;
            const liveCategoryCache = new Map();

            for (const item of parsedRows) {
                let category = liveCategoryCache.get(item.categoryTitle);

                if (!category) {
                    const found = await complainCategoryRepository.find({ title: item.categoryTitle }, { session });
                    const records = Array.isArray(found) ? found : (found.categories || []);
                    category = records[0] || null;

                    if (!category) {
                        const catId = await generateCustomId('CAT', session);
                        category = await complainCategoryRepository.create({
                            _id: catId,
                            custom_id: catId,
                            title: item.categoryTitle,
                            default_priority: item.defaultPriority,
                            description: 'Category created via bulk import',
                            status: 'active',
                        }, { session });
                        categoriesCreated++;
                    }
                    liveCategoryCache.set(item.categoryTitle, category);
                }

                const catId = category._id || category.id || category.custom_id;
                const subId = await generateCustomId('SUB', session);

                await complainSubcategoryRepository.create({
                    _id: subId,
                    custom_id: subId,
                    title: item.subcategoryTitle,
                    category_id: catId,
                    target_audience: item.audience,
                    default_priority: item.defaultPriority,
                    description: item.description,
                    status: 'active',
                }, { session });

                subcategoriesCreated++;
            }

            await session.commitTransaction();
            return {
                imported_categories_count: categoriesCreated, imported_subcategories_count: subcategoriesCreated,
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

    async bulkImportStudents(csvRows) {
        if (!csvRows.length) {
            const err = new Error('CSV file contains no records');
            err.statusCode = 400;
            throw err;
        }

        const validationErrors = [];
        const validatedRecords = [];
        const seenEmails = new Set();
        const seenEnrollments = new Set();

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNumber = i + 2;

            try {
                const enrollment = validateEnrollmentNumber(row.enrollment_number);
                const fullName = sanitizeString(row.full_name, { minLength: 2, maxLength: 100, uppercase: true });
                const email = validateEmail(row.email);
                const branchCode = validateCode(row.branch_code, 'branch_code');
                const admissionYear = Number(row.admission_year);

                if (Number.isNaN(admissionYear) || admissionYear < 1990 || admissionYear > 2050) {
                    throw new Error('Invalid admission year (1990 - 2050)');
                }

                if (seenEmails.has(email)) {
                    throw new Error(`Duplicate email "${email}" inside CSV`);
                }
                if (seenEnrollments.has(enrollment)) {
                    throw new Error(`Duplicate enrollment "${enrollment}" inside CSV`);
                }

                seenEmails.add(email);
                seenEnrollments.add(enrollment);

                validatedRecords.push({
                    rowNumber, enrollment, fullName, email, branchCode, admissionYear,
                });
            } catch (err) {
                validationErrors.push({ row: rowNumber, error: err.message });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('CSV Validation Failed: Resolve row errors before importing');
            err.statusCode = 400;
            err.details = validationErrors;
            throw err;
        }

        const branchCache = new Map();
        for (const record of validatedRecords) {
            if (!branchCache.has(record.branchCode)) {
                const branch = await branchRepository.findByCode(record.branchCode);
                if (!branch) {
                    validationErrors.push({
                        row: record.rowNumber, error: `Branch with code "${record.branchCode}" does not exist`,
                    });
                } else {
                    branchCache.set(record.branchCode, branch);
                }
            }
            const emailTaken = await userRepository.existsByEmail(record.email);
            const enrollmentTaken = await userRepository.existsByEnrollmentNumber(record.enrollment);

            if (emailTaken) {
                validationErrors.push({ row: record.rowNumber, error: `Email "${record.email}" is already registered` });
            }
            if (enrollmentTaken) {
                validationErrors.push({
                    row: record.rowNumber, error: `Enrollment "${record.enrollment}" is already registered`
                });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('Database Collision: Records already exist in the system');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const insertedUsers = [];
            for (const record of validatedRecords) {
                const branch = branchCache.get(record.branchCode);
                const userId = await generateCustomId('USR', session);

                const userDoc = await userRepository.create({
                    _id: userId,
                    custom_id: userId,
                    full_name: record.fullName,
                    email: record.email,
                    role: 'student',
                    enrollment_number: record.enrollment,
                    branch_id: branch.custom_id || branch._id || branch.id,
                    department_id: branch.department_id,
                    admission_year: record.admissionYear,
                    is_profile_completed: true,
                    profile_locked: true,
                    status: 'active',
                }, { session });

                insertedUsers.push(userDoc);
            }

            await session.commitTransaction();
            return {
                imported_count: insertedUsers.length, records: insertedUsers,
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

    async bulkImportFaculty(csvRows) {
        if (!csvRows.length) {
            const err = new Error('CSV file contains no records');
            err.statusCode = 400;
            throw err;
        }

        const validationErrors = [];
        const validatedRecords = [];
        const seenEmails = new Set();

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const rowNumber = i + 2;

            try {
                const fullName = sanitizeString(row.full_name, { minLength: 2, maxLength: 100, uppercase: true });
                const email = validateEmail(row.email);
                const deptCode = validateCode(row.department_code, 'department_code');
                const designation = sanitizeString(row.designation, { lowercase: true });

                if (!VALID_DESIGNATIONS.includes(designation)) {
                    throw new Error(`Invalid designation "${designation}". Valid options: ${VALID_DESIGNATIONS.join(', ')}`);
                }

                if (seenEmails.has(email)) {
                    throw new Error(`Duplicate email "${email}" in file`);
                }

                seenEmails.add(email);
                validatedRecords.push({ rowNumber, fullName, email, deptCode, designation });
            } catch (err) {
                validationErrors.push({ row: rowNumber, error: err.message });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('CSV Validation Failed');
            err.statusCode = 400;
            err.details = validationErrors;
            throw err;
        }

        const deptCache = new Map();
        for (const record of validatedRecords) {
            if (!deptCache.has(record.deptCode)) {
                const dept = await departmentRepository.findByCode(record.deptCode);
                if (!dept) {
                    validationErrors.push({
                        row: record.rowNumber, error: `Department code "${record.deptCode}" does not exist`
                    });
                } else {
                    deptCache.set(record.deptCode, dept);
                }
            }

            const emailTaken = await userRepository.existsByEmail(record.email);
            if (emailTaken) {
                validationErrors.push({ row: record.rowNumber, error: `Email "${record.email}" already exists` });
            }
        }

        if (validationErrors.length > 0) {
            const err = new Error('Database Collision: Faculty records already exist');
            err.statusCode = 409;
            err.details = validationErrors;
            throw err;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const insertedFaculty = [];
            for (const record of validatedRecords) {
                const dept = deptCache.get(record.deptCode);
                const userId = await generateCustomId('USR', session);

                const facultyDoc = await userRepository.create({
                    _id: userId,
                    custom_id: userId,
                    full_name: record.fullName,
                    email: record.email,
                    role: 'faculty',
                    designation: record.designation,
                    department_id: dept.custom_id || dept._id || dept.id,
                    is_profile_completed: true,
                    profile_locked: true,
                    status: 'active',
                }, { session });

                insertedFaculty.push(facultyDoc);
            }

            await session.commitTransaction();
            return {
                imported_count: insertedFaculty.length, records: insertedFaculty,
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

    async exportGrievanceComplianceData(query = {}) {
        const filter = {};

        const deptId = query.target_department_id || query.department_id;
        if (deptId) {
            const cleanDept = String(deptId).trim();
            filter.target_department_id = {
                $in: [cleanDept, cleanDept.toUpperCase(), cleanDept.toLowerCase()]
            };
        }

        if (query.status) {
            filter.status = String(query.status).trim().toUpperCase();
        }
        if (query.ticket_type) {
            filter.ticket_type = String(query.ticket_type).trim().toUpperCase();
        }

        if (query.academic_year && /^\d{4}-\d{2,4}$/.test(String(query.academic_year).trim())) {
            const startYear = parseInt(String(query.academic_year).split('-')[0], 10);
            if (!Number.isNaN(startYear)) {
                const startDate = new Date(Date.UTC(startYear, 6, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59, 999));

                filter.createdAt = {
                    $gte: startDate,$lte: endDate,
                };
            }
        }

        if (query.start_date || query.end_date) {
            filter.createdAt = filter.createdAt || {};

            if (query.start_date) {
                const cleanFrom = String(query.start_date).split('T')[0];
                const start = new Date(`${cleanFrom}T00:00:00.000Z`);
                if (!Number.isNaN(start.getTime())) {
                    filter.createdAt.$gte = start;
                }
            }

            if (query.end_date) {
                const cleanTo = String(query.end_date).split('T')[0];
                const end = new Date(`${cleanTo}T23:59:59.999Z`);
                if (!Number.isNaN(end.getTime())) {
                    filter.createdAt.$lte = end;
                }
            }
        }

        const result = await complainRepository.find(filter, {
            limit: 0, populate: true,
        });

        const records = Array.isArray(result) ? result : (result.complains || []);

        const rows = records.map((c) => {
            const closedDate = c.resolution_details?.resolved_at || c.rejection_details?.rejected_at;
            const closedDateFormatted = closedDate ? new Date(closedDate).toISOString().split('T')[0] : 'N/A';
            const actionNotes = c.resolution_details?.remarks || c.rejection_details?.remarks || c.rejection_details?.reason || 'N/A';

            return {
                ticket_number: c.custom_id || c.ticket_number || 'N/A',
                ticket_type: c.ticket_type || 'STATUTORY_GRIEVANCE',
                submission_date: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : 'N/A',
                title: c.title || 'N/A',
                priority: c.priority || 'MEDIUM',
                status: c.status || 'PENDING',
                is_sla_breached: c.is_sla_breached ? 'YES' : 'NO',
                complainant_role: c.complainant_role ? String(c.complainant_role).toUpperCase() : 'N/A',
                is_anonymous: c.is_anonymous ? 'YES' : 'NO',
                target_department: c.target_department?.department_name || c.target_department_id || 'N/A',
                targeted_person: c.target_user?.full_name ? `${c.target_user.full_name} (${c.target_user.designation || 'Staff'})` : 'N/A',
                category: c.category?.title || c.category_id || 'N/A',
                subcategory: c.subcategory?.title || c.subcategory_id || 'N/A',
                assigned_faculty: c.active_respondent?.full_name || 'UNASSIGNED',
                closed_date: closedDateFormatted,
                action_notes: actionNotes,
            };
        });

        const headers = [
            { key: 'ticket_number', label: 'Ticket Number' },
            { key: 'ticket_type', label: 'Channel Type' },
            { key: 'submission_date', label: 'Submission Date' },
            { key: 'title', label: 'Title' },
            { key: 'priority', label: 'Priority' },
            { key: 'status', label: 'Current Status' },
            { key: 'is_sla_breached', label: 'SLA Breached' },
            { key: 'complainant_role', label: 'Complainant Role' },
            { key: 'is_anonymous', label: 'Is Anonymous' },
            { key: 'target_department', label: 'Target Department' },
            { key: 'targeted_person', label: 'Targeted Individual' },
            { key: 'category', label: 'Grievance Category' },
            { key: 'subcategory', label: 'Subcategory' },
            { key: 'assigned_faculty', label: 'Current Assignee' },
            { key: 'closed_date', label: 'Resolution / Closed Date' },
            { key: 'action_notes', label: 'Resolution / Rejection Notes' },
        ];

        let fileTag = 'Full_Historical';
        if (query.academic_year) {
            fileTag = `AY_${query.academic_year}`;
        } else if (query.start_date || query.end_date) {
            fileTag = `${query.start_date || 'START'}_to_${query.end_date || 'END'}`;
        }

        return {
            filename: `UGC_AICTE_Grievance_Report_${fileTag}_${new Date().toISOString().split('T')[0]}.csv`,
            headers,
            rows,
        };
    }
}

export default new BulkService();