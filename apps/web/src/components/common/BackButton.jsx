import {useNavigate} from 'react-router-dom';
import {ArrowLeft} from 'lucide-react';

export default function BackButton({fallback = '/', className = ''}) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate(fallback);
        }
    };

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-brand-500 text-slate-700 dark:text-slate-300 transition-all shadow-sm ${className}`}
        >
            <ArrowLeft className="w-3.5 h-3.5 text-brand-500"/>
            <span>Back</span>
        </button>
    );
}