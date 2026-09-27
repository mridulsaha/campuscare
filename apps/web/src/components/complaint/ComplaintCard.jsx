import {
    Clock,
    AlertTriangle,
    User,
    Building,
    ChevronRight,
    UserCheck,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import { formatTitle, timeAgo } from '../../utils/formatters';

export default function ComplaintCard({ complaint, onClick }) {
    const isDirect = complaint.ticket_type === 'DIRECT_QUERY';
    const isBreached = complaint.is_sla_breached;

    const isAnonymous =
        complaint.is_anonymous &&
        (!complaint.complainant?.email || complaint.complainant?.is_anonymous);

    return (
        <div
            onClick={onClick}
            className="glass p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/60 dark:hover:border-brand-500/60 transition-all cursor-pointer shadow-sm hover:shadow-xl group relative overflow-hidden"
        >
            {isBreached && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-600 to-rose-500" />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-md">
                        {complaint.ticket_number}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        {isDirect ? 'General Inquiry' : 'Formal Complain'}
                    </span>
                    {isBreached && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <PriorityBadge priority={complaint.priority} />
                    <StatusBadge status={complaint.status} />
                </div>
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors line-clamp-1">
                {complaint.title}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {complaint.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                            Department
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                            {complaint.target_department?.department_name
                                ? formatTitle(complaint.target_department.department_name)
                                : 'Target Department'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                            Submitted By
                        </span>
                        {isAnonymous ? (
                            <span className="font-semibold text-slate-600 dark:text-slate-300 italic">
                                Anonymous ({formatTitle(complaint.complainant?.role || complaint.complainant_role || 'User')})
                            </span>
                        ) : (
                            <div className="truncate">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                                    {formatTitle(complaint.complainant?.full_name || 'Complainant')}
                                </span>
                                {complaint.complainant?.email && (
                                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                                        {complaint.complainant.email}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                            Assigned To
                        </span>
                        {complaint.active_respondent?.full_name ? (
                            <div className="truncate">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                                    {formatTitle(complaint.active_respondent.full_name)}
                                </span>
                                {complaint.active_respondent.email && (
                                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                                        {complaint.active_respondent.email}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="font-medium text-slate-400">Unassigned</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 justify-end text-right">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                            Submitted
                        </span>
                        <div className="flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                {timeAgo(complaint.createdAt)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-0.5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}