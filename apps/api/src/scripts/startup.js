import {
    ADMIN_EMAILS, ADMINISTRATION_DEPARTMENT_CODE, ADMINISTRATION_DEPARTMENT_NAME,
} from '../configs/auth.config.js';
import departmentRepository from '../repositories/department.repository.js';
import userRepository from '../repositories/user.repository.js';
import {generateCustomId} from '../utils/id.generator.js';

export async function startupSeed() {
    let adminDept = await departmentRepository.findByCode(ADMINISTRATION_DEPARTMENT_CODE);
    if (!adminDept) {
        const deptId = await generateCustomId('DEP');
        adminDept = await departmentRepository.create({
            _id: deptId,
            custom_id: deptId,
            department_code: ADMINISTRATION_DEPARTMENT_CODE,
            department_name: ADMINISTRATION_DEPARTMENT_NAME,
            status: 'active',
        });
    }

    const adminDeptId = adminDept._id || adminDept.id || adminDept.custom_id;

    for (const email of ADMIN_EMAILS) {
        const cleanEmail = email.toLowerCase().trim();
        const existingAdmin = await userRepository.findByEmail(cleanEmail);

        if (!existingAdmin) {
            const adminId = await generateCustomId('USR');
            await userRepository.create({
                _id: adminId,
                custom_id: adminId,
                full_name: cleanEmail.split('@')[0].toUpperCase(),
                email: cleanEmail,
                role: 'admin',
                designation: 'director',
                department_id: adminDeptId,
                is_profile_completed: true,
                profile_locked: true,
                status: 'active',
            });
        }
    }
}