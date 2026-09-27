import {useState, useEffect} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {
    LayoutDashboard,
    PlusCircle,
    FileText,
    Briefcase,
    Users,
    Layers,
    FolderTree,
    Code,
    LogOut,
    BarChart3,
    Menu,
    X,
    ChevronRight,
    ShieldAlert,
    Inbox,
    Send,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import {formatTitle, formatRole} from '../../utils/formatters';

export default function Navbar() {
    const {user, logout, isAdmin, isLeadership, isHod, isFaculty} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const getDashboardPath = () => {
        if (!user) return '/login';
        if (isAdmin) return '/admin/dashboard';
        if (isLeadership) return '/leadership/dashboard';
        if (isHod) return '/hod/dashboard';
        if (user.role === 'faculty') return '/faculty/dashboard';
        return '/student/dashboard';
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [];

    if (user) {
        navItems.push({
            label: 'Dashboard',
            path: getDashboardPath(),
            icon: LayoutDashboard,
        });

        navItems.push({
            label: 'Submit Complaint',
            path: '/complaints/file',
            icon: PlusCircle,
        });

        navItems.push({
            label: 'My Complaints',
            path: '/complaints/my',
            icon: FileText,
        });

        if (isFaculty || isHod || isAdmin || isLeadership) {
            navItems.push({
                label: 'Assigned Complaints',
                path: '/complaints/assigned',
                icon: Briefcase,
            });
        }

        if (isHod || isAdmin || isLeadership) {
            navItems.push({
                label: 'Incoming Complaints',
                path: '/complaints/inbound',
                icon: Inbox,
            });

            navItems.push({
                label: 'Outgoing Complaints',
                path: '/complaints/outbound',
                icon: Send,
            });
        }

        if (isAdmin || isLeadership) {
            navItems.push({
                label: 'All Complaints',
                path: '/complaints/college',
                icon: ShieldAlert,
            });
        }

        if (isHod || isLeadership || isAdmin) {
            navItems.push({
                label: 'Reports & Analytics',
                path: '/metrics',
                icon: BarChart3,
            });
        }

        if (isAdmin || isLeadership || isHod) {
            navItems.push({
                label: 'User Directory',
                path: '/users',
                icon: Users,
            });
        }

        if (isAdmin) {
            navItems.push({
                label: 'Organization Settings',
                path: '/admin/governance',
                icon: Layers,
            });

            navItems.push({
                label: 'Bulk Data Import',
                path: '/admin/bulk',
                icon: FolderTree,
            });
        }
    }

    return (
        <header
            className="sticky top-0 z-40 w-full glass border-b border-slate-200 dark:border-slate-800 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={getDashboardPath()} className="flex items-center gap-3 group">
                        <img className="w-10 h-10" src="/logo.png" alt="Campus Care Logo"/>
                        <div>
                            <span
                                className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                Campus Care
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500"/>
                            </span>
                            <span
                                className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
                                MITS Gwalior
                            </span>
                        </div>
                    </Link>

                    {user && (
                        <nav className="hidden md:flex items-center gap-1.5 ml-4">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        title={item.label}
                                        className={`relative group flex items-center px-2.5 py-2 rounded-xl transition-all duration-300 ${
                                            active
                                                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/30 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5 shrink-0"/>
                                        <span
                                            className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-47.5 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-out text-xs font-semibold">
                                            {item.label}
                                        </span>
                                        <span
                                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-slate-700/60">
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        to="/developers"
                        title="Development Team"
                        className="relative group hidden md:flex items-center px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-500 dark:hover:border-brand-500 transition-all bg-white/50 dark:bg-slate-900/50"
                    >
                        <Code className="w-5 h-5 text-brand-500 shrink-0"/>
                        <span
                            className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-27.5 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-out text-xs font-semibold">
                            Developers
                        </span>
                        <span
                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-slate-700/60">
                            Developers
                        </span>
                    </Link>

                    <ThemeToggle/>

                    {user ? (
                        <div
                            className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                            <Link
                                to="/profile"
                                title={`Profile: ${user.full_name} (${formatRole(user.role)})`}
                                className="relative group p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center"
                            >
                                <div
                                    className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white text-xs font-black shadow-sm uppercase">
                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span
                                    className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-32.5 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-out text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {formatTitle(user.full_name)}
                                </span>
                                <span
                                    className="absolute -bottom-8 right-0 px-2.5 py-1 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-slate-700/60">
                                    {formatTitle(user.full_name)} ({formatRole(user.role)})
                                </span>
                            </Link>

                            <button
                                onClick={logout}
                                type="button"
                                title="Sign Out"
                                className="relative group p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                                <LogOut className="w-4 h-4"/>
                                <span
                                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-semibold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
                                    Sign Out
                                </span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:inline-flex px-4 py-1.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all"
                        >
                            Sign In
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        aria-label="Toggle Menu"
                        className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div
                    className="md:hidden glass border-b border-slate-200 dark:border-slate-800 px-4 py-5 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-2xl">
                    {user ? (
                        <Link
                            to="/profile"
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl bg-linear-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm uppercase shadow">
                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        {formatTitle(user.full_name)}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatTitle(user.designation || user.role)}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400"/>
                        </Link>
                    ) : (
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                navigate('/login');
                            }}
                            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/25 text-center"
                        >
                            Sign In
                        </button>
                    )}

                    {user && (
                        <div className="space-y-1 pt-1">
                            <span
                                className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                                Menu
                            </span>
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                            active
                                                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/25'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 text-brand-500 shrink-0"/>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                        <Link
                            to="/developers"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Code className="w-4 h-4 text-brand-500 shrink-0"/>
                            <span>Development Team</span>
                        </Link>

                        {user && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left"
                            >
                                <LogOut className="w-4 h-4 shrink-0"/>
                                <span>Sign Out</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}