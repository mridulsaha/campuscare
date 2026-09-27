import {Sun, Moon} from 'lucide-react';
import {useTheme} from '../../context/ThemeContext';

export default function ThemeToggle({className = ''}) {
    const {theme, toggleTheme} = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle visual theme"
            className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                isDark
                    ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-amber-300'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
            } ${className}`}
        >
            {isDark ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
        </button>
    );
}