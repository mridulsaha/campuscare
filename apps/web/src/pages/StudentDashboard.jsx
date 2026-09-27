import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    PlusCircle,
    Clock,
    CheckCircle2,
    Inbox,
    ShieldCheck,
    Building2,
    GraduationCap,
    ArrowRight,
    Layers,
    Percent,
    BarChart3,
    PieChart as PieIcon,
    XCircle,
    FileCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import MetricCard from '../components/analytics/MetricCard';
import ComplaintCard from '../components/complaint/ComplaintCard';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import EmptyState from '../components/common/EmptyState';
import { ComplaintListSkeleton, ChartSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTitle } from '../utils/formatters';

const STATUS_COLORS = {
    Resolved: '#10b981',
    'Under Review': '#2f7cff',
    Pending: '#f59e0b',
    Rejected: '#ef4444',
};

const INITIAL_DASHBOARD_DATA = {
    total_cases: 0,
    pending_count: 0,
    under_review_count: 0,
    resolved_count: 0,
    rejected_count: 0,
    complaints: [],
    meta: { total: 0 },
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const { showError } = useToast();
    const [dashboardData, setDashboardData] = useState(INITIAL_DASHBOARD_DATA);
    const [loading, setLoading] = useState(true);
    const [selectedComplaintId, setSelectedComplaintId] = useState(null);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/complain/student/dashboard?limit=5');
            const data = res?.data?.data || res?.data || {};
            setDashboardData({
                total_cases: data.total_cases ?? 0,
                pending_count: data.pending_count ?? 0,
                under_review_count: data.under_review_count ?? 0,
                resolved_count: data.resolved_count ?? 0,
                rejected_count: data.rejected_count ?? 0,
                complaints: Array.isArray(data.complaints) ? data.complaints : [],
                meta: data.meta || { total: data.total_cases ?? 0 },
            });
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.message ||
                'Unable to load your dashboard. Please try again.';
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const activeCount = dashboardData.pending_count + dashboardData.under_review_count;
    const completedCount = dashboardData.resolved_count + dashboardData.rejected_count;
    const resolutionRate =
        completedCount > 0
            ? Math.round((dashboardData.resolved_count / completedCount) * 100)
            : 100;

    const departmentBarData = useMemo(() => {
        if (!dashboardData.complaints.length) return [];

        const map = {};
        dashboardData.complaints.forEach((c) => {
            const deptName = formatTitle(
                c.target_department?.department_name ||
                c.target_department_id ||
                'Department'
            );

            if (!map[deptName]) {
                map[deptName] = {
                    name: deptName.length > 18 ? `${deptName.slice(0, 16)}...` : deptName,
                    fullName: deptName,
                    Resolved: 0,
                    'Under Review': 0,
                    Pending: 0,
                    Rejected: 0,
                };
            }

            if (c.status === 'RESOLVED') map[deptName].Resolved += 1;
            else if (c.status === 'UNDER_REVIEW') map[deptName]['Under Review'] += 1;
            else if (c.status === 'REJECTED') map[deptName].Rejected += 1;
            else map[deptName].Pending += 1;
        });

        return Object.values(map);
    }, [dashboardData.complaints]);

    const statusPieData = useMemo(() => {
        return [
            { name: 'Resolved', value: dashboardData.resolved_count },
            { name: 'Under Review', value: dashboardData.under_review_count },
            { name: 'Pending', value: dashboardData.pending_count },
            { name: 'Rejected', value: dashboardData.rejected_count },
        ].filter((p) => p.value > 0);
    }, [dashboardData]);

    const hasStatusData = statusPieData.length > 0;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        Student Portal
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        Welcome back, {formatTitle(user?.full_name || 'Student')}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300 font-semibold pt-0.5">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-brand-500" />
                            {user?.department?.department_name
                                ? formatTitle(user.department.department_name)
                                : 'Academic Department'}
                        </span>
                        {user?.branch?.branch_name && (
                            <>
                                <span className="text-slate-400">•</span>
                                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                    {formatTitle(user.branch.branch_name)}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <Link
                    to="/complaints/file"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all self-start sm:self-auto"
                >
                    <PlusCircle className="w-4 h-4" />
                    <span>Submit Complaint</span>
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Submitted</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {dashboardData.total_cases}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">All complaints filed by you</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {activeCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Under department review</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {dashboardData.resolved_count}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully solved</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {dashboardData.rejected_count}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ineligible or declined</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard
                    title="Pending Assignment"
                    value={dashboardData.pending_count}
                    subtitle="Awaiting department review"
                    icon={Clock}
                    color="amber"
                />
                <MetricCard
                    title="In Active Review"
                    value={dashboardData.under_review_count}
                    subtitle="Under active faculty review"
                    icon={Inbox}
                    color="blue"
                />
                <MetricCard
                    title="Successfully Closed"
                    value={completedCount}
                    subtitle={`${dashboardData.resolved_count} resolved • ${dashboardData.rejected_count} rejected`}
                    icon={FileCheck}
                    color="emerald"
                />
                <MetricCard
                    title="Resolution Rate"
                    value={`${resolutionRate}%`}
                    subtitle={`${dashboardData.resolved_count} of ${completedCount || 0} completed`}
                    icon={Percent}
                    color="purple"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <ChartSkeleton height="h-72" />
                    </div>
                    <div>
                        <ChartSkeleton height="h-72" />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-brand-500" />
                                <span>Complaints by Department</span>
                            </h4>
                            {departmentBarData.length === 0 && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                                    No Active Data
                                </span>
                            )}
                        </div>
                        <div className="w-full h-72">
                            {departmentBarData.length === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-medium">No complaints filed across departments yet</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentBarData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={11}
                                            tickLine={false}
                                            allowDecimals={false}
                                            domain={[0, (dataMax) => (dataMax === 0 ? 5 : Math.ceil(dataMax * 1.1))]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderColor: '#334155',
                                                borderRadius: '1rem',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                                                padding: '10px 14px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                            }}
                                            labelStyle={{
                                                color: '#38bdf8',
                                                fontWeight: 'bold',
                                                marginBottom: '6px',
                                                fontSize: '13px',
                                            }}
                                            itemStyle={{
                                                color: '#e2e8f0',
                                                paddingTop: '2px',
                                                paddingBottom: '2px',
                                            }}
                                            formatter={(value, name) => [value, name]}
                                            labelFormatter={(label, items) => items?.[0]?.payload?.fullName || label}
                                        />
                                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px' }} />
                                        <Bar dataKey="Resolved" fill={STATUS_COLORS.Resolved} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Under Review" fill={STATUS_COLORS['Under Review']} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Pending" fill={STATUS_COLORS.Pending} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Rejected" fill={STATUS_COLORS.Rejected} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <PieIcon className="w-4 h-4 text-brand-500" />
                            <span>Complaints by Status</span>
                        </h4>
                        {!hasStatusData ? (
                            <div className="w-full h-72 relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[{ name: 'No Complaints', value: 1 }]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            dataKey="value"
                                            isAnimationActive={false}
                                        >
                                            <Cell fill="#cbd5e1" className="dark:fill-slate-700" stroke="none" />
                                        </Pie>
                                        <Tooltip content={() => null} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-black text-slate-400 dark:text-slate-500">0</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Complaints
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusPieData.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={STATUS_COLORS[entry.name] || '#64748b'}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderColor: '#334155',
                                                borderRadius: '1rem',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                                                padding: '8px 12px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                            }}
                                            itemStyle={{ color: '#e2e8f0' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Recent Complaints
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            Showing your {dashboardData.complaints.length} most recent submissions.
                        </p>
                    </div>

                    {dashboardData.total_cases > 0 && (
                        <Link
                            to="/complaints/my"
                            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                        >
                            <span>View All Complaints ({dashboardData.total_cases})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>

                {loading ? (
                    <ComplaintListSkeleton count={2} />
                ) : dashboardData.complaints.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title="No Complaints Submitted"
                        description="You haven't submitted any complaints yet. When you submit a complaint, it will appear here."
                        actionLabel="Submit Complaint"
                        actionLink="/complaints/file"
                        actionIcon={PlusCircle}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {dashboardData.complaints.map((c) => (
                            <ComplaintCard
                                key={c.id || c.custom_id || c._id}
                                complaint={c}
                                onClick={() => setSelectedComplaintId(c.id || c.custom_id || c._id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ComplaintTimelineModal
                isOpen={Boolean(selectedComplaintId)}
                onClose={() => setSelectedComplaintId(null)}
                complaintId={selectedComplaintId}
            />
        </div>
    );
}