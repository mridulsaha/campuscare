import {formatTitle} from '../../utils/formatters';

const PRIORITY_STYLES = {
    CRITICAL: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-bold',
    HIGH: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    LOW: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};

export default function PriorityBadge({priority, className = ''}) {
    const normalized = (priority || 'MEDIUM').toUpperCase();
    const style = PRIORITY_STYLES[normalized] || PRIORITY_STYLES.MEDIUM;

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider font-semibold border ${style} ${className}`}
        >
            {formatTitle(priority || 'Medium')}
        </span>
    );
}