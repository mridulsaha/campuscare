import {ShieldCheck} from 'lucide-react';

export default function Footer() {
    return (
        <footer
            className="w-full border-t border-slate-200/80 dark:border-slate-800/80 py-6 px-4 sm:px-8 mt-auto bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
            <div
                className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-500"/>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Campus Care Portal
                    </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    © {new Date().getFullYear()} Madhav Institute of Technology and Science, Gwalior. All rights
                    reserved.
                </p>
            </div>
        </footer>
    );
}