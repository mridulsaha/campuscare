import {Loader2, ArrowDown} from 'lucide-react';

export default function LoadMoreButton({loading, hasMore, onClick, className = ''}) {
    if (!hasMore) return null;

    return (
        <div className={`flex justify-center py-6 ${className}`}>
            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 shadow-sm text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500"/>
                        <span>Loading More Records...</span>
                    </>
                ) : (
                    <>
                        <ArrowDown className="w-4 h-4 text-brand-500"/>
                        <span>Load More</span>
                    </>
                )}
            </button>
        </div>
    );
}