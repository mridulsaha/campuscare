import {createContext, useContext, useState, useEffect, useRef, useCallback} from 'react';
import {AlertCircle, CheckCircle2, Info, AlertTriangle, X} from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

let externalToastTrigger = null;

export function notifyExternal(message, type = 'error', title = null) {
    if (externalToastTrigger) {
        externalToastTrigger(message, type, title);
    }
}

export function ToastProvider({children}) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info', title = null, duration = 4500) => {
        if (!message) return;
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        setToasts((prev) => [...prev, {id, message, type, title, duration}]);
    }, []);

    useEffect(() => {
        externalToastTrigger = (message, type, title) => addToast(message, type, title);
        return () => {
            externalToastTrigger = null;
        };
    }, [addToast]);

    const showSuccess = useCallback((msg, title = 'Success') => addToast(msg, 'success', title), [addToast]);
    const showError = useCallback((msg, title = 'Error') => addToast(msg, 'error', title), [addToast]);
    const showInfo = useCallback((msg, title = 'Info') => addToast(msg, 'info', title), [addToast]);
    const showWarning = useCallback((msg, title = 'Warning') => addToast(msg, 'warning', title), [addToast]);

    return (
        <ToastContext.Provider value={{addToast, showSuccess, showError, showInfo, showWarning, removeToast}}>
            {children}
            <aside
                aria-live="polite"
                aria-label="Notifications"
                className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)}/>
                ))}
            </aside>
        </ToastContext.Provider>
    );
}

function ToastItem({toast, onDismiss}) {
    const [isExiting, setIsExiting] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const startXRef = useRef(0);
    const isDraggingRef = useRef(false);
    const timerRef = useRef(null);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
        }, 200);
    }, [onDismiss]);

    useEffect(() => {
        timerRef.current = setTimeout(() => {
            handleDismiss();
        }, toast.duration || 4500);

        return () => clearTimeout(timerRef.current);
    }, [toast.duration, handleDismiss]);

    const pauseTimer = () => clearTimeout(timerRef.current);
    const resumeTimer = () => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(handleDismiss, 2500);
    };

    const handleTouchStart = (e) => {
        pauseTimer();
        startXRef.current = e.touches[0].clientX;
        isDraggingRef.current = true;
    };

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startXRef.current;
        if (diff > 0) {
            setTranslateX(diff);
        }
    };

    const handleTouchEnd = () => {
        isDraggingRef.current = false;
        if (translateX > 90) {
            handleDismiss();
        } else {
            setTranslateX(0);
            resumeTimer();
        }
    };

    const config = {
        success: {
            icon: CheckCircle2,
            border: 'border-emerald-500/40',
            bg: 'bg-emerald-50/90 dark:bg-slate-900/95',
            iconColor: 'text-emerald-500',
            title: toast.title || 'Success',
            progress: 'bg-emerald-500',
        },
        error: {
            icon: AlertCircle,
            border: 'border-rose-500/40',
            bg: 'bg-rose-50/90 dark:bg-slate-900/95',
            iconColor: 'text-rose-500',
            title: toast.title || 'Action Failed',
            progress: 'bg-rose-500',
        },
        warning: {
            icon: AlertTriangle,
            border: 'border-amber-500/40',
            bg: 'bg-amber-50/90 dark:bg-slate-900/95',
            iconColor: 'text-amber-500',
            title: toast.title || 'Attention',
            progress: 'bg-amber-500',
        },
        info: {
            icon: Info,
            border: 'border-brand-500/40',
            bg: 'bg-blue-50/90 dark:bg-slate-900/95',
            iconColor: 'text-brand-500',
            title: toast.title || 'Notification',
            progress: 'bg-brand-500',
        },
    }[toast.type] || {
        icon: Info,
        border: 'border-brand-500/40',
        bg: 'bg-blue-50/90 dark:bg-slate-900/95',
        iconColor: 'text-brand-500',
        title: toast.title || 'Notification',
        progress: 'bg-brand-500',
    };

    const Icon = config.icon;

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={pauseTimer}
            onMouseLeave={resumeTimer}
            style={{
                transform: `translateX(${translateX}px)`,
                opacity: isExiting ? 0 : 1 - translateX / 200,
                transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
            }}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} backdrop-blur-xl p-3.5 shadow-xl transition-all select-none cursor-grab active:cursor-grabbing`}
        >
            <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0 ${config.iconColor}`}>
                    <Icon className="w-4 h-4"/>
                </div>

                <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                        {config.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed wrap-break-word font-medium">
                        {toast.message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleDismiss}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors shrink-0"
                >
                    <X className="w-3.5 h-3.5"/>
                </button>
            </div>

            <div
                className={`absolute bottom-0 left-0 h-0.5 ${config.progress} opacity-40`}
                style={{
                    width: '100%',
                    animation: `toast-progress ${toast.duration || 4500}ms linear forwards`,
                }}
            />
        </div>
    );
}