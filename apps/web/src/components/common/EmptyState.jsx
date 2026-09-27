import {Inbox, PlusCircle} from 'lucide-react';
import {Link} from 'react-router-dom';

export default function EmptyState({
                                       icon: Icon = Inbox,
                                       title = 'No Records Found',
                                       description = 'There are no records matching your current filter criteria or queue status.',
                                       actionLabel,
                                       actionLink,
                                       onAction,
                                       actionIcon: ActionIcon = PlusCircle,
                                       className = '',
                                   }) {
    return (
        <div
            className={`glass p-8 sm:p-12 rounded-3xl text-center border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-center space-y-4 ${className}`}
        >
            <div
                className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20 shadow-inner">
                <Icon className="w-7 h-7"/>
            </div>

            <div className="max-w-md space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                </p>
            </div>

            {(actionLink || onAction) && (
                <div className="pt-2">
                    {actionLink ? (
                        <Link
                            to={actionLink}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/25 transition-all"
                        >
                            <ActionIcon className="w-3.5 h-3.5"/>
                            <span>{actionLabel || 'Get Started'}</span>
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onAction}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
                        >
                            <ActionIcon className="w-3.5 h-3.5"/>
                            <span>{actionLabel || 'Reset Filter'}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}