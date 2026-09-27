import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldAlert, Sparkles, Code2, Mail } from 'lucide-react';
import GoogleLoginButton from '../components/common/GoogleLoginButton';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { GithubIcon, LinkedinIcon } from '../components/common/SocialIcons';

export default function Login() {
    const { loginWithGoogle, user } = useAuth();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(
        searchParams.get('expired') ? 'Your previous session expired. Please sign in again.' : ''
    );
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/admin/dashboard');
            else if (['director', 'vice_chancellor', 'pro_vice_chancellor', 'dean'].includes(user.designation)) {
                navigate('/leadership/dashboard');
            } else if (user.designation === 'hod') {
                navigate('/hod/dashboard');
            } else if (user.role === 'faculty') {
                navigate('/faculty/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        }
    }, [user, navigate]);

    const handleCredential = async (credential) => {
        setError('');
        setLoading(true);
        try {
            const authenticatedUser = await loginWithGoogle(credential);
            if (authenticatedUser.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (
                ['director', 'vice_chancellor', 'pro_vice_chancellor', 'dean'].includes(
                    authenticatedUser.designation
                )
            ) {
                navigate('/leadership/dashboard');
            } else if (authenticatedUser.designation === 'hod') {
                navigate('/hod/dashboard');
            } else if (authenticatedUser.role === 'faculty') {
                navigate('/faculty/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            setError(
                err.error ||
                'Unable to sign in. Please make sure you are using your institutional email (@mitsgwl.ac.in for students or @mitsgwalior.in for staff).'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-between bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
            <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <img className="w-10 h-10" src="/logo.png" alt="Campus Care Logo" />
                    <div>
                        <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base sm:text-lg">
                            Campus Care
                        </span>
                        <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                            MITS Gwalior
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/developers"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-brand-500 transition-all"
                    >
                        <Code2 className="w-3.5 h-3.5 text-brand-500" />
                        <span>Developer</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex items-center justify-center px-4 py-8">
                <div className="glass w-full max-w-md p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-semibold mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Official Portal</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Welcome Back
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
                            Sign in with your institutional Google account to submit or manage complaints.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mb-6 text-center">
                        <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Students
                            </span>
                            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                                @mitsgwl.ac.in
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Faculty & Staff
                            </span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                @mitsgwalior.in
                            </span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <GoogleLoginButton onCredentialReceived={handleCredential} disabled={loading} />
                    </div>
                </div>
            </main>

            <section className="max-w-4xl mx-auto px-4 py-8 w-full relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-linear-to-tr from-brand-500/20 via-indigo-500/15 to-emerald-500/20 blur-3xl rounded-full pointer-events-none -z-10 opacity-70 dark:opacity-60" />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-24 bg-brand-500/20 blur-2xl rounded-full pointer-events-none -z-10 opacity-60" />

                <div className="glass rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-6 shadow-xl shadow-slate-900/5 dark:shadow-none relative backdrop-blur-md">
                    <div className="text-center">
                        <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 dark:text-slate-500">
                            Developed By
                        </h4>
                    </div>

                    <div className="relative group p-6 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 flex flex-col items-center text-center max-w-lg mx-auto w-full transition-all duration-300 hover:border-brand-500/30">
                        <div className="absolute top-10 w-24 h-24 bg-brand-500/20 rounded-full blur-xl pointer-events-none -z-10 group-hover:scale-125 transition-transform duration-500" />

                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-3 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 shadow-sm">
                            Lead Developer
                        </span>

                        <div className="relative">
                            <img
                                src="/mridul-saha-image.png"
                                alt="Mridul Saha"
                                onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                                }}
                                className="w-20 h-20 rounded-full object-cover border-2 border-brand-500/50 shadow-lg shadow-brand-500/10 mb-3"
                            />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Mridul Saha
                        </h3>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                            Full Stack Developer
                        </p>
                        <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mt-1">
                            Enrollment No: BTMC25O1077
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Department of Mathematics & Computing &bull; Batch 2025
                        </p>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                            Madhav Institute of Technology and Science, Gwalior
                        </p>

                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 w-full justify-center">
                            <a
                                href="mailto:mridulsaha2008@gmail.com"
                                title="Send email"
                                className="p-2 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-brand-500/10 transition-all"
                            >
                                <Mail className="w-4 h-4" />
                            </a>
                            <a
                                href="https://linkedin.com/in/mridulsaha"
                                target="_blank"
                                rel="noreferrer"
                                title="LinkedIn profile"
                                className="p-2 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                            >
                                <LinkedinIcon className="w-4 h-4" />
                            </a>
                            <a
                                href="https://github.com/mridulsaha"
                                target="_blank"
                                rel="noreferrer"
                                title="GitHub profile"
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-500/10 transition-all"
                            >
                                <GithubIcon className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    <div className="relative group p-5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center text-center transition-all duration-300 hover:border-emerald-500/30">
                        <div className="absolute inset-0 bg-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                            Faculty Mentor
                        </span>
                        <img
                            src="/dr-divya-chaturvedi-image.jpg"
                            alt="Dr. Divya Chaturvedi"
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                            }}
                            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40 shadow-sm mb-2"
                        />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            Dr. Divya Chaturvedi
                        </h4>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                            Assistant Professor
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                            Department of Engineering Mathematics & Computing
                        </p>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                            Madhav Institute of Technology and Science, Gwalior
                        </p>
                    </div>
                </div>
            </section>

            <footer className="py-6 text-center border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                &copy; {new Date().getFullYear()} Madhav Institute of Technology and Science, Gwalior. All rights reserved.
            </footer>
        </div>
    );
}