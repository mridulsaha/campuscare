import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import api from '../../services/api';

export default function ComplaintActionModal({
    isOpen,
    onClose,
    actionType,
    complaint,
    faculties = [],
    departments = [],
    onSuccess = () => {},
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [respondentId, setRespondentId] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [notes, setNotes] = useState('');

    const targetDeptIds = useMemo(() => {
        if (!complaint) return new Set();
        const ids = new Set();
        const dept = complaint.target_department;
        const deptId = complaint.target_department_id;

        if (deptId) ids.add(String(deptId));
        if (dept) {
            if (dept._id) ids.add(String(dept._id));
            if (dept.id) ids.add(String(dept.id));
            if (dept.custom_id) ids.add(String(dept.custom_id));
            if (dept.department_code) ids.add(String(dept.department_code));
            if (typeof dept === 'string') ids.add(dept);
        }
        return ids;
    }, [complaint]);

    const eligibleFaculties = useMemo(() => {
        if (!complaint || !Array.isArray(faculties)) return [];
        if (actionType !== 'ASSIGN' && actionType !== 'TRANSFER') return faculties;

        return faculties.filter((f) => {
            const fDept =
                f.department_id?._id ||
                f.department_id?.custom_id ||
                f.department_id ||
                f.department?._id ||
                f.department ||
                '';
            const fDeptStr = String(fDept);

            const isInDepartment = targetDeptIds.has(fDeptStr);

            const activeRespId = (
                complaint.active_respondent_id ||
                complaint.active_respondent?._id ||
                complaint.active_respondent?.id ||
                complaint.active_respondent?.custom_id ||
                ''
            ).toString();
            const fId = (f.id || f.custom_id || f._id || '').toString();
            const isAlreadyAssigned = activeRespId && activeRespId === fId;

            const complainantId = (
                complaint.complainant_id ||
                complaint.complainant?._id ||
                complaint.complainant?.id ||
                complaint.complainant?.custom_id ||
                ''
            ).toString();
            const isComplainant = complainantId && complainantId === fId;

            const targetUserId = (
                complaint.target_user_id ||
                complaint.target_user?._id ||
                complaint.target_user?.id ||
                complaint.target_user?.custom_id ||
                ''
            ).toString();
            const isTargetOfGrievance =
                complaint.ticket_type === 'STATUTORY_GRIEVANCE' &&
                targetUserId &&
                targetUserId === fId;

            return (
                isInDepartment &&
                !isAlreadyAssigned &&
                !isComplainant &&
                !isTargetOfGrievance &&
                ['faculty', 'admin'].includes(f.role)
            );
        });
    }, [complaint, faculties, actionType, targetDeptIds]);

    const eligibleDepartments = useMemo(() => {
        if (!complaint || !Array.isArray(departments)) return departments;
        return departments.filter((d) => {
            const dId = String(d.id || d.custom_id || d._id || d.department_code || '');
            return !targetDeptIds.has(dId);
        });
    }, [departments, targetDeptIds, complaint]);

    const getTitle = () => {
        if (actionType === 'ASSIGN') return 'Assign Complaint';
        if (actionType === 'TRANSFER') return 'Transfer Complaint';
        if (actionType === 'TRANSFER_DEPT') return 'Transfer to Another Department';
        if (actionType === 'RESOLVE') return 'Resolve Complaint';
        if (actionType === 'REJECT') return 'Reject Complaint';
        return 'Update Complaint';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!complaint) return;
        setError('');
        setLoading(true);

        const ticketId = complaint.id || complaint.custom_id || complaint._id;

        try {
            if (actionType === 'ASSIGN') {
                await api.post('/complain/assign', {
                    complain_id: ticketId,
                    respondent_id: respondentId,
                    description: notes,
                });
            } else if (actionType === 'TRANSFER') {
                await api.post('/complain/transfer', {
                    complain_id: ticketId,
                    new_respondent_id: respondentId,
                    reason: notes,
                });
            } else if (actionType === 'TRANSFER_DEPT') {
                await api.post('/complain/transfer-department', {
                    complain_id: ticketId,
                    new_department_id: departmentId,
                    reason: notes,
                });
            } else if (actionType === 'RESOLVE') {
                await api.patch(`/complain/${ticketId}/resolve`, {
                    remarks: notes,
                });
            } else if (actionType === 'REJECT') {
                await api.patch(`/complain/${ticketId}/reject`, {
                    reason: notes,
                });
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.error || err.response?.data?.message || err.message || 'Unable to update the complaint. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={getTitle()}
            subtitle={`Complaint #${complaint?.ticket_number} — ${complaint?.title}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs border border-rose-500/20">
                        {error}
                    </div>
                )}

                {(actionType === 'ASSIGN' || actionType === 'TRANSFER') && (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                            Assign to Department Faculty / Admin
                        </label>
                        <select
                            required
                            value={respondentId}
                            onChange={(e) => setRespondentId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Select a member from this department</option>
                            {eligibleFaculties.map((f) => (
                                <option key={f.id || f.custom_id || f._id} value={f.id || f.custom_id || f._id}>
                                    {f.full_name || f.name} ({f.designation ? f.designation.replace(/_/g, ' ') : f.role === 'admin' ? 'Administrator' : 'Faculty'})
                                </option>
                            ))}
                        </select>
                        {eligibleFaculties.length === 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 leading-relaxed">
                                No eligible faculty or administrator found registered in this department. To assign to a member of a different department, please use &quot;Transfer to Another Department&quot;.
                            </p>
                        )}
                    </div>
                )}

                {actionType === 'TRANSFER_DEPT' && (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                            New Department
                        </label>
                        <select
                            required
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Select a department</option>
                            {eligibleDepartments.map((d) => (
                                <option key={d.id || d.custom_id || d._id} value={d.id || d.custom_id || d._id}>
                                    {d.department_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        {actionType === 'RESOLVE'
                            ? 'Resolution Details'
                            : actionType === 'REJECT'
                            ? 'Reason for Rejection'
                            : 'Notes & Instructions'}
                    </label>
                    <textarea
                        required
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any relevant details or instructions..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || ((actionType === 'ASSIGN' || actionType === 'TRANSFER') && eligibleFaculties.length === 0)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            actionType === 'REJECT'
                                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                                : actionType === 'RESOLVE'
                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/20'
                        }`}
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>
                            {actionType === 'REJECT'
                                ? 'Reject Complaint'
                                : actionType === 'RESOLVE'
                                ? 'Resolve Complaint'
                                : 'Confirm'}
                        </span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}