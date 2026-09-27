import {useEffect, useState} from 'react';
import {
    Mail, Shield, Building, GraduationCap, Calendar, Lock, Unlock, BadgeCheck
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import {ProfileSkeleton} from '../components/common/LoadingSkeleton';
import {useAuth} from '../context/AuthContext';
import {formatTitle, formatRole} from '../utils/formatters';
import api from '../services/api';

export default function Profile() {
    const {user} = useAuth();
    const [detailedUser, setDetailedUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                const res = await api.get('/auth/me');
                setDetailedUser(res.data);
            } catch (err) {
                console.error('Failed to load profile details:', err);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    const profileData = detailedUser || user;

    return (<div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <BackButton/>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    User Profile
                </span>
            </div>

            {loading ? (<ProfileSkeleton/>) : (<>
                    <div
                        className="glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
                        <div
                            className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                            <div
                                className="w-24 h-24 rounded-3xl bg-linear-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-brand-500/20 uppercase shrink-0">
                                {profileData?.full_name ? profileData.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                    <span className="flex flex-nowrap items-center gap-2">
                                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                            {formatTitle(profileData?.full_name)}
                                        </h2>
                                        <BadgeCheck
                                            className="w-6 h-6 text-blue-500 fill-blue-500 stroke-white shrink-0"/>
                                    </span>
                                    <span
                                        className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                        {formatRole(profileData?.role)}
                                    </span>
                                </div>

                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    {formatTitle(profileData?.designation || profileData?.role)}
                                </p>

                                <div
                                    className="flex items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-4 h-4 text-brand-500"/>
                                        {profileData?.email}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        {profileData?.profile_locked ? (<>
                                                <Lock className="w-4 h-4 text-emerald-500"/>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    Profile Locked
                                                </span>
                                            </>) : (<>
                                                <Unlock className="w-4 h-4 text-amber-500"/>
                                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                                    Setup Pending
                                                </span>
                                            </>)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Building className="w-5 h-5"/>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Department
                                    </span>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                        {profileData?.department?.department_name ? formatTitle(profileData.department.department_name) : 'Central Administration'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                                    <GraduationCap className="w-5 h-5"/>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Branch
                                    </span>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                        {profileData?.branch?.branch_name ? formatTitle(profileData.branch.branch_name) : 'Faculty / Staff'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {profileData?.enrollment_number && (
                            <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                                        <Shield className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Enrollment Number
                                        </span>
                                        <div
                                            className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                                            {profileData.enrollment_number}
                                        </div>
                                    </div>
                                </div>
                            </div>)}

                        {profileData?.admission_year && (
                            <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                                        <Calendar className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Admission Year
                                        </span>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                            {profileData.admission_year}
                                        </div>
                                    </div>
                                </div>
                            </div>)}
                    </div>
                </>)}
        </div>);
}