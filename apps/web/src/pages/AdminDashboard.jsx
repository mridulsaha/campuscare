import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Building2,
    ShieldAlert,
    FileSpreadsheet,
    BarChart3,
    PieChart as PieIcon,
    ArrowRight,
    Layers,
    Clock,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    Users,
    GraduationCap,
    Briefcase,
    Percent,
    Award,
    Flame,
    FileText,
    FileCheck,
    CheckSquare,
    ArrowRightLeft,
    UserCheck,
    Lock,
    Eye,
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
import ComplaintCard from '../components/complaint/ComplaintCard';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import ComplaintActionModal from '../components/complaint/ComplaintActionModal';
import EmptyState from '../components/common/EmptyState';
import { ChartSkeleton, ComplaintListSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTitle } from '../utils/formatters';

const CHART_COLORS = ['#10b981', '#2f7cff', '#f59e0b', '#ef4444', '#8b5cf6'];
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

export default function LeadershipDashboard() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [executiveSummary, setExecutiveSummary] = useState(INITIAL_EXECUTIVE_SUMMARY);
    const [departmentBenchmarks, setDepartmentBenchmarks] = useState([]);
    const [facultyBenchmarks, setFacultyBenchmarks] = useState([]);
    const [priorityMatrix, setPriorityMatrix] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [complaintsMeta, setComplaintsMeta] = useState({ total: 0 });
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [departments, setDepartments] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [actionTicket, setActionTicket] = useState(null);
    const [actionType, setActionType] = useState(null);

    const loadLeadershipMetrics = useCallback(async () => {
        try {
            setLoading(true);
            const [metricsRes, collegeRes, formRes, deptRes] = await Promise.all([
                api.get('/complain/analytics/report'),
                api.get('/complain/college/all?limit=2&populate=true'),
                api.get('/complain/form-options'),
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

            const collegeData = collegeRes?.data?.data || collegeRes?.data || {};
            const collegeList = Array.isArray(collegeData)
                ? collegeData
                : (collegeData.complains || []);
            const collegeMeta =
                collegeRes?.data?.meta ||
                collegeData?.meta ||
                { total: collegeList.length };

            setComplaints(collegeList);
            setComplaintsMeta(collegeMeta);

            const formData = formRes?.data?.data || formRes?.data || {};
            const allDepts = formData.departments || [];
            const flatFaculties = allDepts.flatMap((d) => d.faculties || []);
            const uniqueFaculties = Array.from(
                new Map(flatFaculties.map((f) => [f.id || f._id || f.custom_id, f])).values()
            );
            setFaculties(formData.all_officers || uniqueFaculties);

            const deptList = deptRes?.data?.departments || deptRes?.data?.data || deptRes?.data || [];
            setDepartments(Array.isArray(deptList) ? deptList : []);
        } catch (err) {
            console.error('Failed to load leadership dashboard metrics:', err);
            showError('Unable to load executive metrics. Please try again.');
            setDepartmentBenchmarks([]);
            setFacultyBenchmarks([]);
            setPriorityMatrix([]);
            setComplaints([]);
            setDepartments([]);
            setFaculties([]);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        loadLeadershipMetrics();
    }, [loadLeadershipMetrics]);

    const barData = useMemo(() => {
        if (!departmentBenchmarks || departmentBenchmarks.length === 0) {
            return [];
        }

        return departmentBenchmarks.map((d) => {
            const rawName =
                d.department_name ||
                d.department?.department_name ||
                d.department_code ||
                d._id ||
                'Dept';
            const formatted = formatTitle(rawName);
            return {
                name: formatted.length > 18 ? `${formatted.slice(0, 16)}...` : formatted,
                fullName: formatted,
                Resolved: Number(d.overall_resolved ?? d.total_resolved ?? d.resolved ?? 0),
                'Under Review': Number(d.overall_under_review ?? d.total_under_review ?? d.under_review ?? 0),
                Pending: Number(d.overall_pending ?? d.total_pending ?? d.pending ?? 0),
                Rejected: Number(d.overall_rejected ?? d.total_rejected ?? d.rejected ?? 0),
            };
        });
    }, [departmentBenchmarks]);

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

    const displayFaculties = useMemo(() => {
        return (facultyBenchmarks || []).flatMap((dept) => {
            const deptName = dept.department_name || dept.department_code || 'Central Administration';
            if (Array.isArray(dept.faculties)) {
                return dept.faculties.map((f) => ({
                    ...f,
                    department_name: deptName,
                }));
            }
            return dept.faculty_name ? [{ ...dept, department_name: deptName }] : [];
        });
    }, [facultyBenchmarks]);

    const openAction = (ticket, type) => {
        if (ticket.status === 'RESOLVED' || ticket.status === 'REJECTED') {
            showError(`This complaint has already been ${ticket.status.toLowerCase()} and cannot be modified.`);
            return;
        }
        setActionTicket(ticket);
        setActionType(type);
    };

    const handleActionSuccess = () => {
        showSuccess('Complaint updated successfully.');
        setActionTicket(null);
        setActionType(null);
        loadLeadershipMetrics();
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/bulk/compliance/export', { responseType: 'blob' });
            const blobData = response?.data || response;
            const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `institutional_report_${Date.now()}.csv`);
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

    return (
        <div className="space-y-8">
            <div className="glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Executive Overview
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                        Welcome back, {formatTitle(user?.full_name || 'Executive Leader')}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Building2 className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Office of the {formatTitle(user?.designation || 'Director')}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-500">
                            Madhav Institute of Technology and Science, Gwalior
                        </span>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cases</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {executiveSummary.total_cases}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Across all departments</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {executiveSummary.active_cases}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {executiveSummary.total_under_review} in review • {executiveSummary.total_pending} pending
                    </p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {executiveSummary.total_resolved}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully closed complaints</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA Overdue</span>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {executiveSummary.total_sla_breached}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Past target resolution date</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">On-Time Rate</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {executiveSummary.sla_compliance_rate}%
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(executiveSummary.sla_compliance_rate, 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1.5 block">Target: 90% or higher</span>
                </div>

                <div className="glass p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Resolution Rate</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {executiveSummary.institutional_resolution_rate}%
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(executiveSummary.institutional_resolution_rate, 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1.5 block">Solved successfully</span>
                </div>

                <div className="glass p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Avg Resolution</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {executiveSummary.avg_resolution_hours} <span className="text-xs font-semibold text-slate-400">hrs</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Average turnaround time</p>
                </div>

                <div className="glass p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Rejected Rate</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {executiveSummary.institutional_rejection_rate}%
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        {executiveSummary.total_rejected} total complaints rejected
                    </p>
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
                            {barData.length === 0 && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                                    No Active Data
                                </span>
                            )}
                        </div>
                        <div className="w-full h-80">
                            {barData.length === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-medium">No department complaint activity recorded</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={barData}
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
                            <span>Department Performance Summary ({departmentBenchmarks.length})</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Workload, resolved/rejected closures, and turnaround times across all academic departments.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                            <tr>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Total Load</th>
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
                            {departmentBenchmarks.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                                        No department metric records available.
                                    </td>
                                </tr>
                            ) : (
                                departmentBenchmarks.map((dept, i) => (
                                    <tr key={dept._id || dept.department_id || i} className="hover:bg-slate-500/5 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                            {formatTitle(
                                                dept.department_name ||
                                                dept.department?.department_name ||
                                                dept.department_code ||
                                                dept._id ||
                                                'Academic Cell'
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
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            <span>Faculty Performance Summary ({displayFaculties.length})</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Individual faculty workload, on-time resolution, and investigation turnaround.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                            <tr>
                                <th className="py-3 px-4">Faculty Member</th>
                                <th className="py-3 px-4">Department</th>
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
                            {displayFaculties.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                                        No faculty records or assigned complaints found.
                                    </td>
                                </tr>
                            ) : (
                                displayFaculties.map((f, i) => (
                                    <tr key={f.faculty_id || f._id || i} className="hover:bg-slate-500/5 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                    {(f.faculty_name || f.name || 'F').charAt(0)}
                                                </div>
                                                <div>
                                                    <span>{formatTitle(f.faculty_name || f.name || f.officer_name || 'Faculty Member')}</span>
                                                    {f.designation && (
                                                        <span className="block text-[10px] text-slate-400 font-normal">
                                                            {(() => {
                                                                switch (String(f.designation).toLowerCase()) {
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
                                                                        return formatTitle(f.designation);
                                                                }
                                                            })()}
                                                        </span>
                                                    )}
                                                    {(f.faculty_email || f.email) ? (
                                                        <span className="block text-[10px] font-mono font-normal text-slate-400">
                                                            {f.faculty_email || f.email}
                                                        </span>
                                                    ) : (
                                                        <span className="block text-[10px] text-slate-400/60 font-normal italic">
                                                            No Email
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                            {formatTitle(f.department_name || 'Department')}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold">
                                            {f.total_assigned ?? f.assigned_cases ?? f.total_cases ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            {f.resolved ?? f.resolved_cases ?? f.total_resolved ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-semibold">
                                            {f.rejected ?? f.rejected_cases ?? f.total_rejected ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400">
                                            {f.active_under_review ?? f.under_review ?? f.pending_cases ?? f.total_pending ?? 0}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">
                                            {f.sla_breached || 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                            {f.avg_resolution_hours ? `${f.avg_resolution_hours} hrs` : 'N/A'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-black text-brand-600 dark:text-brand-400">
                                            {f.resolution_rate != null ? `${f.resolution_rate}%` : '100%'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Recent Complaints
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            Showing the 2 most recent complaints across the college.
                        </p>
                    </div>
                    <Link
                        to="/complaints/college"
                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                        <span>View All Complaints ({complaintsMeta.total || executiveSummary.total_cases})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <ComplaintListSkeleton count={2} />
                ) : complaints.length === 0 ? (
                    <EmptyState
                        icon={ShieldAlert}
                        title="No Complaints Found"
                        description="There are currently no active or past complaints recorded."
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {complaints.slice(0, 2).map((c) => {
                            const isTerminal = c.status === 'RESOLVED' || c.status === 'REJECTED';
                            const ticketId = c.id || c.custom_id || c._id;

                            return (
                                <div
                                    key={ticketId}
                                    className="glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                                >
                                    <ComplaintCard
                                        complaint={c}
                                        onClick={() => setSelectedId(ticketId)}
                                    />

                                    <div className="p-3 bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[11px] font-bold text-slate-500">
                                                Department:{' '}
                                                {c.target_department?.department_name
                                                    ? formatTitle(c.target_department.department_name)
                                                    : 'Central Administration'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedId(ticketId)}
                                                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View Full Details & Discussion</span>
                                            </button>
                                        </div>

                                        {isTerminal ? (
                                            <div className="flex items-center gap-1.5 text-slate-400 font-semibold py-1">
                                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Closed ({formatTitle(c.status)})</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {!c.active_respondent_id ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(c, 'ASSIGN')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        <span>Assign</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(c, 'TRANSFER')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                    >
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                        <span>Reassign Member</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => openAction(c, 'TRANSFER_DEPT')}
                                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                >
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    <span>Change Department</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openAction(c, 'RESOLVE')}
                                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                                                >
                                                    <CheckSquare className="w-3.5 h-3.5" />
                                                    <span>Resolve</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openAction(c, 'REJECT')}
                                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ComplaintActionModal
                isOpen={Boolean(actionTicket)}
                onClose={() => {
                    setActionTicket(null);
                    setActionType(null);
                }}
                actionType={actionType}
                complaint={actionTicket}
                faculties={faculties}
                departments={departments}
                onSuccess={handleActionSuccess}
            />

            <ComplaintTimelineModal
                isOpen={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                complaintId={selectedId}
            />
        </div>
    );
}