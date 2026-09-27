import cron from 'node-cron';
import userRepository from '../repositories/user.repository.js';
import branchRepository from '../repositories/branch.repository.js';
import programmeRepository from '../repositories/programme.repository.js';

export function startStudentLifecycleCron() {
    cron.schedule('0 0 1 7 *', async () => {
        try {
            const currentYear = new Date().getFullYear();
            const branchesResult = await branchRepository.find({}, {limit: 0});
            const branchList = branchesResult.branches || [];

            const progCache = new Map();

            for (const branch of branchList) {
                if (!branch.programme_id) continue;

                let prog = progCache.get(branch.programme_id);
                if (!prog) {
                    prog = await programmeRepository.findById(branch.programme_id);
                    if (prog) progCache.set(branch.programme_id, prog);
                }

                if (!prog || !prog.duration_year) continue;

                const cutoffYear = currentYear - prog.duration_year;

                await userRepository.updateMany({
                    role: 'student',
                    branch_id: branch._id || branch.id || branch.custom_id,
                    status: 'active',
                    admission_year: {$lte: cutoffYear},
                }, {
                    status: 'inactive',
                });
            }
        } catch (err) {
            console.error('[Student Lifecycle Cron Error]:', err.message);
        }
    });
}