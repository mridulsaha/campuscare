import {Loader2} from 'lucide-react';

export function MetricCardSkeleton({count = 4}) {
    const gridCols = {
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
    }[count] || 'lg:grid-cols-4';

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-4`}>
            {Array.from({length: count}).map((_, i) => (
                <div
                    key={i}
                    className="glass p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex items-start justify-between animate-pulse"
                >
                    <div className="space-y-2 flex-1">
                        <div className="w-24 h-3.5 rounded bg-slate-200/80 dark:bg-slate-800/80"/>
                        <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-800"/>
                        <div className="w-32 h-3 rounded bg-slate-200/60 dark:bg-slate-800/60"/>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 shrink-0"/>
                </div>
            ))}
        </div>
    );
}

export function ComplaintCardSkeleton() {
    return (
        <div
            className="glass p-5 sm:p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 animate-pulse space-y-3.5 bg-white/50 dark:bg-slate-900/50">
            <div
                className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/40 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                    <div className="w-28 h-5 rounded-md bg-slate-200/80 dark:bg-slate-800/80"/>
                    <div className="w-16 h-4 rounded bg-slate-200/60 dark:bg-slate-800/60"/>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-5 rounded-md bg-slate-200/80 dark:bg-slate-800/80"/>
                    <div className="w-20 h-5 rounded-full bg-slate-200/80 dark:bg-slate-800/80"/>
                </div>
            </div>
            <div className="w-3/5 h-5 rounded-md bg-slate-200 dark:bg-slate-800"/>
            <div className="space-y-1.5">
                <div className="w-full h-3.5 rounded bg-slate-200/70 dark:bg-slate-800/70"/>
                <div className="w-4/5 h-3.5 rounded bg-slate-200/50 dark:bg-slate-800/50"/>
            </div>
            <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
                <div className="w-28 h-4 rounded bg-slate-200/60 dark:bg-slate-800/60"/>
                <div className="w-28 h-4 rounded bg-slate-200/60 dark:bg-slate-800/60"/>
                <div
                    className="w-16 h-4 rounded bg-slate-200/60 dark:bg-slate-800/60 justify-self-end col-span-2 sm:col-span-1"/>
            </div>
        </div>
    );
}

export function ComplaintListSkeleton({count = 3}) {
    return (
        <div className="grid grid-cols-1 gap-3">
            {Array.from({length: count}).map((_, i) => (
                <ComplaintCardSkeleton key={i}/>
            ))}
        </div>
    );
}

export function TableRowsSkeleton({columns = 5, rows = 5}) {
    return (
        <>
            {Array.from({length: rows}).map((_, rowIdx) => (
                <tr key={rowIdx} className="animate-pulse">
                    {Array.from({length: columns}).map((_, colIdx) => (
                        <td key={colIdx} className="py-3.5 px-4">
                            <div
                                className="h-4 rounded bg-slate-200/70 dark:bg-slate-800/70"
                                style={{width: `${Math.floor(45 + ((rowIdx * 13 + colIdx * 19) % 45))}%`}}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

export function ChartSkeleton({height = 'h-72'}) {
    return (
        <div
            className={`w-full ${height} rounded-2xl bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center gap-3 animate-pulse`}
        >
            <Loader2 className="w-6 h-6 animate-spin text-brand-500/70"/>
            <span className="text-xs font-semibold text-slate-400">Loading metrics visualizer...</span>
        </div>
    );
}

export function AccordionGroupSkeleton({count = 3}) {
    return (
        <div className="space-y-4">
            {Array.from({length: count}).map((_, i) => (
                <div
                    key={i}
                    className="glass rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 animate-pulse space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800/80"/>
                            <div className="space-y-1">
                                <div className="w-40 h-4 rounded bg-slate-200/80 dark:bg-slate-800/80"/>
                                <div className="w-20 h-3 rounded bg-slate-200/60 dark:bg-slate-800/60"/>
                            </div>
                        </div>
                        <div className="w-16 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-800/70"/>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div
                className="glass p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-200 dark:bg-slate-800 shrink-0"/>
                <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <div className="w-48 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 mx-auto sm:mx-0"/>
                    <div className="w-32 h-4 rounded bg-slate-200/70 dark:bg-slate-800/70 mx-auto sm:mx-0"/>
                    <div className="w-56 h-3.5 rounded bg-slate-200/50 dark:bg-slate-800/50 mx-auto sm:mx-0 pt-2"/>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({length: 4}).map((_, i) => (
                    <div key={i}
                         className="glass p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"/>
                        <div className="space-y-1.5 flex-1">
                            <div className="w-20 h-3 rounded bg-slate-200/60 dark:bg-slate-800/60"/>
                            <div className="w-36 h-4 rounded bg-slate-200 dark:bg-slate-800"/>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}