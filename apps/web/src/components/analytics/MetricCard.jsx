export default function MetricCard({title, value, subtitle, icon: Icon, color = 'blue'}) {
    const colorMap = {
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    };

    return (
        <div
            className="glass p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {title}
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {value}
                </div>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
                )}
            </div>

            {Icon && (
                <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
                    <Icon className="w-5 h-5"/>
                </div>
            )}
        </div>
    );
}