import { Mail, Code2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { GithubIcon, LinkedinIcon } from '../components/common/SocialIcons';

export default function Developers() {
    const developer = {
        role: 'Lead Developer',
        name: 'Mridul Saha',
        bio: 'Full Stack Developer',
        enrollmentNo: 'BTMC25O1077',
        department: 'Department of Mathematics & Computing',
        batch: 'Batch 2025',
        institution: 'Madhav Institute of Technology and Science, Gwalior',
        email: 'mridulsaha2008@gmail.com',
        linkedin: 'https://linkedin.com/in/mridulsaha',
        github: 'https://github.com/mridulsaha',
        badgeColor: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
        image: '/mridul-saha-image.png',
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
            <Navbar />
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-semibold mb-3">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Project Creator</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Meet the Developer
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Campus Care was built to provide a simple, transparent way for students and staff at Madhav
                        Institute of Technology and Science, Gwalior to raise and resolve institutional concerns.
                    </p>
                </div>

                <section className="max-w-4xl mx-auto w-full relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-linear-to-tr from-brand-500/20 via-indigo-500/15 to-emerald-500/20 blur-3xl rounded-full pointer-events-none -z-10 opacity-70 dark:opacity-60" />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-24 bg-brand-500/20 blur-2xl rounded-full pointer-events-none -z-10 opacity-60" />

                    <div className="glass rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-6 shadow-xl relative backdrop-blur-md">
                        <div className="text-center">
                            <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 dark:text-slate-500">
                                Developed By
                            </h2>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="relative group p-6 sm:p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 flex flex-col items-center text-center max-w-lg mx-auto w-full transition-all duration-300 hover:border-brand-500/40 shadow-sm">
                                <div className="absolute top-10 w-28 h-28 bg-brand-500/20 rounded-full blur-xl pointer-events-none -z-10 group-hover:scale-125 transition-transform duration-500" />

                                <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border mb-4 shadow-sm ${developer.badgeColor}`}>
                                    {developer.role}
                                </span>

                                {developer.image && (
                                    <img
                                        src={developer.image}
                                        alt={developer.name}
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                                        }}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-brand-500/50 shadow-lg shadow-brand-500/10 mb-3"
                                    />
                                )}

                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {developer.name}
                                </h3>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                                    {developer.bio}
                                </p>
                                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1">
                                    Enrollment No: {developer.enrollmentNo}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {developer.department} &bull; {developer.batch}
                                </p>
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                                    {developer.institution}
                                </p>

                                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 w-full justify-center">
                                    {developer.email && (
                                        <a
                                            href={`mailto:${developer.email}`}
                                            title="Send email"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:bg-brand-500/10 transition-all"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </a>
                                    )}
                                    {developer.linkedin && (
                                        <a
                                            href={developer.linkedin}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="LinkedIn profile"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                                        >
                                            <LinkedinIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                    {developer.github && (
                                        <a
                                            href={developer.github}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="GitHub profile"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-500/10 transition-all"
                                        >
                                            <GithubIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="relative group p-6 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left transition-all duration-300 hover:border-emerald-500/30">
                            <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <img
                                src="/dr-divya-chaturvedi-image.jpg"
                                alt="Dr. Divya Chaturvedi"
                                onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                                }}
                                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shrink-0"
                            />
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-2">
                                    Faculty Mentor
                                </span>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                    Dr. Divya Chaturvedi
                                </h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Assistant Professor
                                </p>
                                <p className="text-xs text-slate-500">
                                    Department of Engineering Mathematics & Computing
                                </p>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Madhav Institute of Technology and Science, Gwalior
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}