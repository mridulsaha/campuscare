import {RotateCcw} from 'lucide-react';
import {formatTitle} from '../../utils/formatters';

export default function ComplaintFilters({
                                             filters,
                                             onChange,
                                             onReset,
                                             departments = [],
                                             showDepartmentFilter = true,
                                         }) {
    const handleChange = (key, value) => {
        onChange({...filters, [key]: value, page: 1});
    };

    return (
        <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Status
                    </label>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Type
                    </label>
                    <select
                        value={filters.ticket_type || ''}
                        onChange={(e) => handleChange('ticket_type', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">All Types</option>
                        <option value="STATUTORY_GRIEVANCE">Formal Complaint</option>
                        <option value="DIRECT_QUERY">General Inquiry</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Submitted By
                    </label>
                    <select
                        value={filters.role || ''}
                        onChange={(e) => handleChange('role', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">All Users</option>
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                    </select>
                </div>

                {showDepartmentFilter && (
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Department
                        </label>
                        <select
                            value={filters.target_department_id || ''}
                            onChange={(e) => handleChange('target_department_id', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id || d.custom_id} value={d.id || d.custom_id}>
                                    {formatTitle(d.department_name)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={onReset}
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <RotateCcw className="w-3.5 h-3.5"/>
                        <span>Reset Filters</span>
                    </button>
                </div>
            </div>
        </div>
    );
}