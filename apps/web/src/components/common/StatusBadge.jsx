import {formatTitle} from '../../utils/formatters';

const STATUS_STYLES = {
    PENDING: {
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500',
    },
    UNDER_REVIEW: {
        bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        dot: 'bg-blue-500',
    },
    RESOLVED: {
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500',
    },
    REJECTED: {
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500',
    },
    ACTIVE: {
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500',
    },
    INACTIVE: {
        bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        dot: 'bg-slate-500',
    },
};

export default function StatusBadge({status, className = ''}) {
    const normalized = (status || '').toUpperCase();
    const config = STATUS_STYLES[normalized] || STATUS_STYLES.PENDING;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}/>
            {formatTitle(status || 'Pending')}
        </span>
    );
}