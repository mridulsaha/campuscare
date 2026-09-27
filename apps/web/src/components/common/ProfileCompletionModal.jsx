import {useState, useEffect} from 'react';
import {AlertCircle, CheckCircle2, Loader2, Lock} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import api from '../../services/api';
import {formatTitle} from '../../utils/formatters';

export default function ProfileCompletionModal() {
    const {user, updateUserProfileState} = useAuth();
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [fullName, setFullName] = useState(user?.full_name || '');
    const [enrollmentNumber, setEnrollmentNumber] = useState(user?.enrollment_number || '');
    const [admissionYear, setAdmissionYear] = useState(user?.admission_year || new Date().getFullYear());
    const [departmentId, setDepartmentId] = useState(user?.department_id || '');
    const [branchId, setBranchId] = useState(user?.branch_id || '');

    const isStudent = user?.role === 'student';

    useEffect(() => {
        async function loadFormMetadata() {
            try {
                const [deptRes, branchRes] = await Promise.all([
                    api.get('/department'),
                    api.get('/branch'),
                ]);
                setDepartments(deptRes.data || []);
                setBranches(branchRes.data || []);
            } catch (err) {
                console.error('Failed to load metadata:', err);
            }
        }

        loadFormMetadata();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {full_name: fullName};
            if (isStudent) {
                payload.enrollment_number = enrollmentNumber;
                payload.admission_year = Number(admissionYear);
                payload.branch_id = branchId;
            } else {
                payload.department_id = departmentId;
            }

            const res = await api.patch('/user/profile/complete', payload);
            updateUserProfileState(res.data);
        } catch (err) {
            setError(err.error || 'Unable to save your details. Please check the fields above and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div
                className="glass w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500">
                        <Lock className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Complete Your Profile
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Please check your details carefully. You will not be able to edit them after submitting.
                        </p>
                    </div>
                </div>

                {error && (
                    <div
                        className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0"/>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value.toUpperCase())}
                            placeholder="e.g. AMIT SHARMA"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {isStudent ? (
                        <>
                            <div>
                                <label
                                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                    Enrollment Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={enrollmentNumber}
                                    onChange={(e) => setEnrollmentNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. 0901CS211025"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                        Branch
                                    </label>
                                    <select
                                        required
                                        value={branchId}
                                        onChange={(e) => setBranchId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="">Select your branch</option>
                                        {branches.map((b) => (
                                            <option key={b.id || b.custom_id} value={b.id || b.custom_id}>
                                                {formatTitle(b.branch_name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                        Admission Year
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1990"
                                        max="2050"
                                        value={admissionYear}
                                        onChange={(e) => setAdmissionYear(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label
                                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Department
                            </label>
                            <select
                                required
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="">Select your department</option>
                                {departments.map((d) => (
                                    <option key={d.id || d.custom_id} value={d.id || d.custom_id}>
                                        {formatTitle(d.department_name)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                        Confirm & Save
                    </button>
                </form>
            </div>
        </div>
    );
}