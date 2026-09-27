import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3,
    PieChart as PieIcon,
    Users,
    Building2,
    FileSpreadsheet,
    ArrowUpDown,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    Percent,
    Award,
    Flame,
    FileCheck,
    GraduationCap,
    Briefcase,
    FileText,
    ShieldAlert,
} from 'lucide-react';
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
import BackButton from '../components/common/BackButton';
import MetricCard from '../components/analytics/MetricCard';
import {
    MetricCardSkeleton,
    ChartSkeleton,
    TableRowsSkeleton,
} from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTitle } from '../utils/formatters';

const CHART_COLORS = ['#2f7cff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const PRIORITY_COLORS = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#10b981',
};

const INITIAL_EXECUTIVE_SUMMARY = {
    total_cases: 0,
    active_cases: 0,
    total_resolved: 0,
    total_rejected: 0,
    total_pending: 0,
    total_under_review: 0,
    total_sla_breached: 0,
    total_direct_queries: 0,
    total_statutory: 0,
    student_total: 0,
    faculty_total: 0,
    admin_total: 0,
    avg_resolution_hours: 0,
    institutional_resolution_rate: 0,
    institutional_rejection_rate: 0,
    institutional_closure_rate: 0,
    sla_compliance_rate: 100,
};

export default function MetricsAnalytics() {
    const { user, isAdmin, isLeadership, isHod } = useAuth();
    const { showSuccess, showError } = useToast();

    const [executiveSummary, setExecutiveSummary] = useState(INITIAL_EXECUTIVE_SUMMARY);
    const [departmentBenchmarks, setDepartmentBenchmarks] = useState([]);
    const [facultyBenchmarks, setFacultyBenchmarks] = useState([]);
    const [priorityMatrix, setPriorityMatrix] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState(
        isHod && !isAdmin && user?.department_id ? String(user.department_id._id || user.department_id) : ''
    );
    const [sortBy, setSortBy] = useState('total_desc');

    const loadMetricsData = useCallback(async () => {
        try {
            setLoading(true);
            const reportParams = {};
            if (departmentFilter) {
                reportParams.target_department_id = departmentFilter;
                reportParams.department_id = departmentFilter;
            }

            const [metricsRes, deptRes] = await Promise.all([
                api.get('/complain/analytics/report', { params: reportParams }),
                api.get('/department'),
            ]);

            const reportPayload = metricsRes?.data?.data || metricsRes?.data || {};
            setExecutiveSummary({
                ...INITIAL_EXECUTIVE_SUMMARY,
                ...(reportPayload.executive_summary || {}),
            });
            setDepartmentBenchmarks(reportPayload.department_benchmarks || []);
            setFacultyBenchmarks(reportPayload.faculty_benchmarks || []);
            setPriorityMatrix(reportPayload.priority_matrix || []);

            const deptData = deptRes?.data?.data || deptRes?.data || [];
            setDepartments(Array.isArray(deptData) ? deptData : (deptData.departments || []));
        } catch (err) {
            console.error('Failed to load institutional metrics:', err);
            showError('Unable to load analytics report. Please try again.');
            setDepartmentBenchmarks([]);
            setFacultyBenchmarks([]);
            setPriorityMatrix([]);
        } finally {
            setLoading(false);
        }
    }, [departmentFilter, showError]);

    useEffect(() => {
        loadMetricsData();
    }, [loadMetricsData]);

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/bulk/compliance/export', { responseType: 'blob' });
            const blobData = response?.data || response;
            const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `complaints_report_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSuccess('Report exported successfully.');
        } catch (err) {
            console.error('CSV Export Error:', err);
            showError('Unable to export report. Please try again.');
        }
    };

    const processedMetrics = useMemo(() => {
        let list = [...departmentBenchmarks];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter((m) =>
                (m.department_name || m.department?.department_name || m.department_code || m._id || '')
                    .toLowerCase()
                    .includes(q)
            );
        }

        list.sort((a, b) => {
            const totalA = a.overall_total ?? a.total_cases ?? 0;
            const totalB = b.overall_total ?? b.total_cases ?? 0;
            const rateA = a.institutional_resolution_rate ?? 0;
            const rateB = b.institutional_resolution_rate ?? 0;

            if (sortBy === 'total_desc') return totalB - totalA;
            if (sortBy === 'total_asc') return totalA - totalB;
            if (sortBy === 'rate_desc') return rateB - rateA;
            if (sortBy === 'rate_asc') return rateA - rateB;
            if (sortBy === 'name_asc') {
                const nameA = a.department_name || a.department?.department_name || '';
                const nameB = b.department_name || b.department?.department_name || '';
                return nameA.localeCompare(nameB);
            }
            return 0;
        });

        return list;
    }, [departmentBenchmarks, searchQuery, sortBy]);

    const barChartData = useMemo(() => {
        if (!processedMetrics || processedMetrics.length === 0) return [];

        return processedMetrics.map((d) => {
            const rawName = d.department_name || d.department?.department_name || d.department_code || d._id || 'Dept';
            const formatted = formatTitle(rawName);
            return {
                name: formatted.length > 18 ? `${formatted.slice(0, 16)}...` : formatted,
                fullName: formatted,
                Resolved: Number(d.overall_resolved ?? d.resolved ?? 0),
                'Under Review': Number(d.overall_under_review ?? d.under_review ?? 0),
                Pending: Number(d.overall_pending ?? d.pending ?? 0),
                Rejected: Number(d.overall_rejected ?? d.rejected ?? 0),
            };
        });
    }, [processedMetrics]);

    const statusPieData = useMemo(() => {
        return [
            { name: 'Resolved', value: executiveSummary.total_resolved || 0 },
            { name: 'Under Review', value: executiveSummary.total_under_review || 0 },
            { name: 'Pending', value: executiveSummary.total_pending || 0 },
            { name: 'Rejected', value: executiveSummary.total_rejected || 0 },
        ].filter((p) => p.value > 0);
    }, [executiveSummary]);

    const hasStatusData = statusPieData.length > 0;

    const stakeholderPieData = useMemo(() => {
        return [
            { name: 'Students', value: executiveSummary.student_total || 0 },
            { name: 'Faculty', value: executiveSummary.faculty_total || 0 },
            { name: 'Staff & Admin', value: executiveSummary.admin_total || 0 },
        ].filter((p) => p.value > 0);
    }, [executiveSummary]);

    const hasStakeholderData = stakeholderPieData.length > 0;

    const displayPriorityMatrix = useMemo(() => {
        const tiers = ['critical', 'high', 'medium', 'low'];
        const countMap = {};
        (priorityMatrix || []).forEach((item) => {
            const key = String(item.priority || item._id || '').toLowerCase();
            if (key) {
                countMap[key] = item.count ?? item.total ?? 0;
            }
        });
        return tiers.map((tier) => ({
            priority: tier,
            count: countMap[tier] || 0,
        }));
    }, [priorityMatrix]);

    const allFacultyBenchmarks = useMemo(() => {
        let list = facultyBenchmarks.flatMap((d) => {
            const deptName = d.department_name || d.department_code || '';
            if (Array.isArray(d.faculties)) {
                return d.faculties.map((f) => ({
                    ...f,
                    department_name: f.department_name || deptName,
                    faculty_email: f.faculty_email || f.email || '',
                }));
            }
            return d.faculty_name
                ? [{
                      ...d,
                      department_name: deptName,
                      faculty_email: d.faculty_email || d.email || '',
                  }]
                : [];
        });

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (f) =>
                    (f.faculty_name || f.name || '').toLowerCase().includes(q) ||
                    (f.faculty_email || f.email || '').toLowerCase().includes(q) ||
                    (f.designation || '').toLowerCase().includes(q) ||
                    (f.department_name || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [facultyBenchmarks, searchQuery]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            Analytics & Reports
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            Reports & Analytics
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Madhav Institute of Technology and Science, Gwalior
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:border-brand-500 dark:hover:border-brand-500 self-start sm:self-auto"
                >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Export Report (CSV)</span>
                </button>
            </div>

            {loading ? (
                <MetricCardSkeleton count={4} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Complaints"
                        value={executiveSummary.total_cases}
                        subtitle="All submitted complaints"
                        icon={Building2}
                        color="blue"
                    />
                    <MetricCard
                        title="Resolved Complaints"
                        value={executiveSummary.total_resolved}
                        subtitle="Successfully closed"
                        icon={CheckCircle2}
                        color="emerald"
                    />
                    <MetricCard
                        title="In Review"
                        value={executiveSummary.active_cases}
                        subtitle={`${executiveSummary.total_under_review} in review • ${executiveSummary.total_pending} pending`}
                        icon={Clock}
                        color="amber"
                    />
                    <MetricCard
                        title="On-Time Rate"
                        value={`${executiveSummary.sla_compliance_rate}%`}
                        subtitle={`Target: 90% • ${executiveSummary.total_sla_breached} overdue`}
                        icon={Percent}
                        color="purple"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Resolution</span>
                        <Clock className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {executiveSummary.avg_resolution_hours} <span className="text-xs font-semibold text-slate-400">hrs</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Average turnaround time</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution Rate</span>
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {executiveSummary.institutional_resolution_rate}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Solved successfully</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closure Rate</span>
                        <CheckCircle2 className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
                        {executiveSummary.institutional_closure_rate}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Total closed cases</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {executiveSummary.total_rejected}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{executiveSummary.institutional_rejection_rate}% rejection rate</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Students</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {executiveSummary.student_total}
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Faculty</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {executiveSummary.faculty_total}
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Staff & Admin</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {executiveSummary.admin_total}
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Inquiries</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {executiveSummary.total_direct_queries}
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Formal Grievances</span>
                    </div>
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                        {executiveSummary.total_statutory}
                    </div>
                </div>
            </div>

            <div className="glass p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search department or faculty..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                <div>
                    <select
                        disabled={isHod && !isAdmin}
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                    >
                        {isAdmin || isLeadership ? <option value="">All Departments</option> : null}
                        {departments.map((d) => (
                            <option key={d.id || d.custom_id || d._id} value={d.id || d.custom_id || d._id}>
                                {formatTitle(d.department_name || d.name)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="total_desc">Total Complaints (High to Low)</option>
                        <option value="total_asc">Total Complaints (Low to High)</option>
                        <option value="rate_desc">Resolution Rate (High to Low)</option>
                        <option value="rate_asc">Resolution Rate (Low to High)</option>
                        <option value="name_asc">Department Name (A to Z)</option>
                    </select>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setSearchQuery('');
                        if (!isHod || isAdmin) setDepartmentFilter('');
                        setSortBy('total_desc');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                    Reset Filters
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <ChartSkeleton height="h-80" />
                    </div>
                    <div>
                        <ChartSkeleton height="h-80" />
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
                            {barChartData.length === 0 && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                                    No Active Data
                                </span>
                            )}
                        </div>
                        <div className="w-full h-80">
                            {barChartData.length === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-medium">No department complaint activity recorded</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={barChartData}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
                                    >
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={10}
                                            tickLine={false}
                                            interval={0}
                                            angle={-25}
                                            textAnchor="end"
                                        />
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
                                        <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Under Review" fill="#2f7cff" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
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
                            <div className="w-full h-80 relative flex items-center justify-center">
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
                            <div className="w-full h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Flame className="w-4 h-4 text-rose-500" />
                            <span>Complaints by Priority</span>
                        </h4>
                        <span className="text-xs font-semibold text-slate-400">
                            {displayPriorityMatrix.reduce((acc, curr) => acc + (curr.count || curr.total || 0), 0)} Total Tracked
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {displayPriorityMatrix.map((item, idx) => {
                            const priorityName = String(item.priority || item._id || item.level || 'Standard').toLowerCase();
                            const count = item.count ?? item.total ?? item.cases ?? 0;
                            const color = PRIORITY_COLORS[priorityName] || '#64748b';
                            const percentage = executiveSummary.total_cases > 0
                                ? Math.round((count / executiveSummary.total_cases) * 100)
                                : 0;

                            return (
                                <div
                                    key={idx}
                                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                                {priorityName} Priority
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">{percentage}%</span>
                                    </div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                        {count} <span className="text-xs font-normal text-slate-400">complaints</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%`, backgroundColor: color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-500" />
                        <span>Complaints by User Type</span>
                    </h4>
                    {!hasStakeholderData ? (
                        <div className="w-full h-64 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[{ name: 'No Data', value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        <Cell fill="#cbd5e1" className="dark:fill-slate-700" stroke="none" />
                                    </Pie>
                                    <Tooltip content={() => null} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-lg font-black text-slate-400 dark:text-slate-500">0</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Complaints
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stakeholderPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stakeholderPieData.map((entry, index) => (
                                            <Cell
                                                key={`stakeholder-cell-${index}`}
                                                fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]}
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

            <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-500" />
                            <span>Department Performance Breakdown ({processedMetrics.length})</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Comprehensive department workload, resolution metrics, and turnaround times.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                        {departmentFilter ? 'Filtered View' : 'All Departments'}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                            <tr>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Total Complaints</th>
                                <th className="py-3 px-4">Resolved</th>
                                <th className="py-3 px-4">Rejected</th>
                                <th className="py-3 px-4">In Review</th>
                                <th className="py-3 px-4">Pending</th>
                                <th className="py-3 px-4">Overdue</th>
                                <th className="py-3 px-4">Average Time</th>
                                <th className="py-3 px-4 text-right">Resolution Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                            {loading ? (
                                <TableRowsSkeleton columns={9} rows={4} />
                            ) : processedMetrics.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                                        No department records found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                processedMetrics.map((dept, i) => (
                                    <tr key={dept._id || dept.department_id || i} className="hover:bg-slate-500/5 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                            {formatTitle(
                                                dept.department_name ||
                                                dept.department?.department_name ||
                                                dept.department_code ||
                                                dept._id ||
                                                'Department'
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold">{dept.overall_total ?? dept.total_cases ?? 0}</td>
                                        <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                                            {dept.overall_resolved ?? dept.resolved ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-bold">
                                            {dept.overall_rejected ?? dept.rejected ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-blue-600 dark:text-blue-400 font-bold">
                                            {dept.overall_under_review ?? dept.under_review ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                                            {dept.overall_pending ?? dept.pending ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">
                                            {dept.sla_breached || 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                            {dept.avg_resolution_hours ? `${dept.avg_resolution_hours} hrs` : 'N/A'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-black text-brand-600 dark:text-brand-400">
                                            {dept.institutional_resolution_rate ?? 0}%
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            <span>Faculty Performance Summary ({allFacultyBenchmarks.length})</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Individual faculty workload, on-time rate, resolved, and rejected metrics.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                            <tr>
                                <th className="py-3 px-4">Faculty Member</th>
                                <th className="py-3 px-4">Designation</th>
                                <th className="py-3 px-4">Assigned</th>
                                <th className="py-3 px-4">Resolved</th>
                                <th className="py-3 px-4">Rejected</th>
                                <th className="py-3 px-4">In Progress</th>
                                <th className="py-3 px-4">Overdue</th>
                                <th className="py-3 px-4">Average Time</th>
                                <th className="py-3 px-4 text-right">Resolution Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                            {loading ? (
                                <TableRowsSkeleton columns={9} rows={4} />
                            ) : allFacultyBenchmarks.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                                        No faculty members found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                allFacultyBenchmarks.map((fac, idx) => (
                                    <tr key={fac.faculty_id || fac._id || idx} className="hover:bg-slate-500/5 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                    {(fac.faculty_name || fac.name || 'F').charAt(0)}
                                                </div>
                                                <div>
                                                    <span>{formatTitle(fac.faculty_name || fac.name || fac.officer_name || 'Faculty Member')}</span>
                                                    {(fac.faculty_email || fac.email) ? (
                                                        <span className="block text-[10px] font-mono font-normal text-slate-400">
                                                            {fac.faculty_email || fac.email}
                                                        </span>
                                                    ) : (
                                                        <span className="block text-[10px] text-slate-400/60 font-normal italic">
                                                            No Email
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                            {(() => {
                                                switch (String(fac?.designation || '').toLowerCase()) {
                                                    case 'assistant_professor':
                                                        return 'Assistant Professor';
                                                    case 'associate_professor':
                                                        return 'Associate Professor';
                                                    case 'professor':
                                                        return 'Professor';
                                                    case 'adhoc_faculty':
                                                        return 'Adhoc Faculty';
                                                    case 'hod':
                                                        return 'HOD';
                                                    case 'dean':
                                                        return 'Dean';
                                                    case 'pro_vice_chancellor':
                                                        return 'Pro Vice Chancellor';
                                                    case 'vice_chancellor':
                                                        return 'Vice Chancellor';
                                                    case 'director':
                                                        return 'Director';
                                                    default:
                                                        return formatTitle(fac?.designation || 'Faculty');
                                                }
                                            })()}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold">{fac.total_assigned ?? fac.assigned_cases ?? 0}</td>
                                        <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                                            {fac.resolved ?? fac.resolved_cases ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-semibold">
                                            {fac.rejected ?? fac.rejected_cases ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400">
                                            {fac.active_under_review ?? fac.under_review ?? fac.pending_cases ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">
                                            {fac.sla_breached || 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                            {fac.avg_resolution_hours ? `${fac.avg_resolution_hours} hrs` : 'N/A'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-black text-brand-600 dark:text-brand-400">
                                            {fac.resolution_rate != null ? `${fac.resolution_rate}%` : '100%'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}