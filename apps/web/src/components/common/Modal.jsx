import {useEffect} from 'react';
import {X} from 'lucide-react';

export default function Modal({isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl'}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div
                className={`relative w-full ${maxWidth} glass rounded-2xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-200 dark:border-slate-800 my-8 overflow-hidden`}
            >
                <div
                    className="flex items-start justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
                        {subtitle &&
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1">{children}</div>
            </div>
        </div>
    );
}