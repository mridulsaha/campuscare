import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ShieldAlert,
    FileCheck,
    Layers,
    FileSpreadsheet,
    BarChart3,
    PieChart as PieIcon,
    Building2,
    ArrowRight,
    Inbox,
    Send,
    Clock,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    Users,
    GraduationCap,
    Briefcase,
    Percent,
    Award,
    Eye,
    Flame,
    FileText,
    RefreshCw,
    UserCheck,
    ArrowRightLeft,
    CheckSquare,
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
import ComplaintFilters from '../components/complaint/ComplaintFilters';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import ComplaintActionModal from '../components/complaint/ComplaintActionModal';
import LoadMoreButton from '../components/common/LoadMoreButton';
import EmptyState from '../components/common/EmptyState';
import { ComplaintListSkeleton, ChartSkeleton } from '../components/common/LoadingSkeleton';
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

export default function HodDashboard() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const [tab, setTab] = useState('INBOUND');
    const [complaints, setComplaints] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 2, total: 0, total_pages: 1 });
    const [filters, setFilters] = useState({});
    const [loading, setLoading] = useState(true);

    const [hodCounts, setHodCounts] = useState({
        active_inbound_count: 0,
        total_outbound_count: 0,
        overall_total: 0,
        overall_resolved: 0,
        sla_breached: 0,
    });

    const [selectedId, setSelectedId] = useState(null);
    const [actionTicket, setActionTicket] = useState(null);
    const [actionType, setActionType] = useState(null);

    const [departmentFaculties, setDepartmentFaculties] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);

    const [executiveSummary, setExecutiveSummary] = useState(INITIAL_EXECUTIVE_SUMMARY);
    const [departmentBenchmarks, setDepartmentBenchmarks] = useState([]);
    const [facultyBenchmarks, setFacultyBenchmarks] = useState([]);
    const [priorityMatrix, setPriorityMatrix] = useState([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    const userDeptId = String(user?.department_id?._id || user?.department_id || '');
    const userDepartmentName =
        user?.department?.department_name ||
        allDepartments.find((d) => String(d.id || d.custom_id || d._id) === userDeptId)?.department_name ||
        'Academic Department';

    const fetchHodSummary = useCallback(async () => {
        try {
            const res = await api.get('/complain/hod/dashboard');
            const data = res?.data?.data || res?.data || {};
            const deptMetrics = data.metrics || {};

            setHodCounts({
                active_inbound_count: data.active_inbound_count ?? 0,
                total_outbound_count: data.total_outbound_count ?? 0,
                overall_total: deptMetrics.overall_total ?? data.active_inbound_count ?? 0,
                overall_resolved: deptMetrics.overall_resolved ?? 0,
                sla_breached: deptMetrics.sla_breached ?? 0,
            });
        } catch {
            // Non-blocking metrics fetch failure
        }
    }, []);

    const fetchDepartmentQueue = useCallback(
        async (page = 1, append = false) => {
            try {
                setLoading(true);
                const endpoint =
                    tab === 'INBOUND' ? '/complain/department/inbound' : '/complain/department/outbound';

                const params = new URLSearchParams({
                    page: String(page),
                    limit: '2',
                    populate: 'true',
                    ...filters,
                });

                const res = await api.get(`${endpoint}?${params.toString()}`);
                const listData = res?.data?.data || res?.data || {};
                const list = Array.isArray(listData) ? listData : (listData.complains || []);
                const metaData = res?.data?.meta || listData?.meta || {
                    page,
                    limit: 2,
                    total: list.length,
                    total_pages: 1,
                };

                if (append) {
                    setComplaints((prev) => [...prev, ...list]);
                } else {
                    setComplaints(list);
                }
                setMeta(metaData);
            } catch (err) {
                console.error('Failed to load HOD queue:', err);
                showError('Unable to load department complaints. Please try again.');
            } finally {
                setLoading(false);
            }
        },
        [tab, filters, showError]
    );

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoadingAnalytics(true);
            const res = await api.get('/complain/analytics/report');
            const reportPayload = res?.data?.data || res?.data || {};

            setExecutiveSummary({
                ...INITIAL_EXECUTIVE_SUMMARY,
                ...(reportPayload.executive_summary || {}),
            });
            setDepartmentBenchmarks(reportPayload.department_benchmarks || []);
            setFacultyBenchmarks(reportPayload.faculty_benchmarks || []);
            setPriorityMatrix(reportPayload.priority_matrix || []);
        } catch (err) {
            console.error('Failed to load department analytics:', err);
            showError('Unable to load department reports. Please try again.');
        } finally {
            setLoadingAnalytics(false);
        }
    }, [showError]);

    useEffect(() => {
        if (tab === 'ANALYTICS') {
            fetchAnalytics();
        } else {
            setComplaints([]);
            fetchDepartmentQueue(1, false);
        }
    }, [tab, fetchDepartmentQueue, fetchAnalytics]);

    useEffect(() => {
        Promise.all([api.get('/complain/form-options'), api.get('/department')])
            .then(([optionsRes, deptRes]) => {
                const optionsData = optionsRes?.data?.data || optionsRes?.data || {};
                const deptList = optionsData.departments || [];
                const matchingDept = deptList.find(
                    (d) => String(d.id || d._id || d.code) === userDeptId
                );
                setDepartmentFaculties(matchingDept?.faculties || optionsData.all_officers || []);

                const allDeptsData = deptRes?.data?.data || deptRes?.data || [];
                setAllDepartments(Array.isArray(allDeptsData) ? allDeptsData : (allDeptsData.departments || []));
            })
            .catch(() => {});

        fetchHodSummary();
    }, [userDeptId, fetchHodSummary]);

    const openAction = (ticket, type) => {
        if (ticket.status === 'RESOLVED' || ticket.status === 'REJECTED') {
            showError(`This complaint is already ${ticket.status.toLowerCase()} and cannot be modified.`);
            return;
        }
        setActionTicket(ticket);
        setActionType(type);
    };

    const handleActionSuccess = () => {
        showSuccess('Complaint updated successfully.');
        setActionTicket(null);
        setActionType(null);
        fetchHodSummary();
        fetchDepartmentQueue(1, false);
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/bulk/compliance/export', { responseType: 'blob' });
            const blobData = response?.data || response;
            const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `department_report_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSuccess('Report exported successfully.');
        } catch {
            showError('Unable to export report. Please try again.');
        }
    };

    const barData = useMemo(() => {
        if (!departmentBenchmarks.length) return [];

        return departmentBenchmarks.map((d) => {
            const rawName = d.department_name || d.department?.department_name || d._id || 'Dept';
            const formatted = formatTitle(rawName);
            return {
                name: formatted.length > 18 ? `${formatted.slice(0, 16)}...` : formatted,
                fullName: formatted,
                Resolved: Number(d.overall_resolved || d.total_resolved || 0),
                'Under Review': Number(d.overall_under_review || d.total_under_review || 0),
                Pending: Number(d.overall_pending || d.total_pending || 0),
                Rejected: Number(d.overall_rejected || d.total_rejected || 0),
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
        const trackedFaculties = facultyBenchmarks.flatMap((d) => d.faculties || []);
        if (trackedFaculties.length > 0) {
            return trackedFaculties.map((f) => ({
                ...f,
                faculty_email: f.faculty_email || f.email || '',
            }));
        }

        return departmentFaculties.map((f) => ({
            faculty_id: f.id || f.custom_id || f._id,
            faculty_name: f.full_name || f.name,
            faculty_email: f.email || f.faculty_email || '',
            designation: f.designation || 'Faculty Member',
            total_assigned: 0,
            resolved: 0,
            rejected: 0,
            active_under_review: 0,
            sla_breached: 0,
            avg_resolution_hours: null,
            resolution_rate: 100,
        }));
    }, [facultyBenchmarks, departmentFaculties]);

    return (
        <div className="space-y-6">
            <div className="glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        Department Management
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                        Welcome back, {formatTitle(user?.full_name || 'HOD')}!
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Building2 className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {formatTitle(userDepartmentName)}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-500">
                            Department Queue & Performance Overview
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            fetchHodSummary();
                            if (tab === 'ANALYTICS') fetchAnalytics();
                            else fetchDepartmentQueue(1, false);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Refresh overview"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:border-brand-500 dark:hover:border-brand-500"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <span>Export Report (CSV)</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Inbound</span>
                        <Inbox className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {hodCounts.active_inbound_count}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Awaiting assignment / review</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Outgoing</span>
                        <Send className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {hodCounts.total_outbound_count}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Filed to other departments</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Solved Cases</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {hodCounts.overall_resolved}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully closed complaints</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overdue (SLA)</span>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {hodCounts.sla_breached}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Exceeded target turnaround</p>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setTab('INBOUND')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        tab === 'INBOUND'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    Incoming Complaints Preview
                </button>
                <button
                    type="button"
                    onClick={() => setTab('OUTBOUND')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        tab === 'OUTBOUND'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    Outgoing Complaints Preview
                </button>
                <button
                    type="button"
                    onClick={() => setTab('ANALYTICS')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        tab === 'ANALYTICS'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    Department Analytics & Performance
                </button>
            </div>

            {tab !== 'ANALYTICS' ? (
                <>
                    <ComplaintFilters
                        filters={filters}
                        onChange={setFilters}
                        onReset={() => setFilters({})}
                        showDepartmentFilter={tab === 'OUTBOUND'}
                    />

                    <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
                            Showing {complaints.length} of {meta.total} {tab === 'INBOUND' ? 'incoming' : 'outgoing'} complaints
                        </span>
                        <Link
                            to={tab === 'INBOUND' ? '/complaints/inbound' : '/complaints/outbound'}
                            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                        >
                            <span>Open Dedicated {tab === 'INBOUND' ? 'Incoming' : 'Outgoing'} Queue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {loading && complaints.length === 0 ? (
                        <ComplaintListSkeleton count={2} />
                    ) : complaints.length === 0 ? (
                        <EmptyState
                            icon={tab === 'INBOUND' ? Inbox : Send}
                            title={tab === 'INBOUND' ? 'No Incoming Complaints' : 'No Outgoing Complaints'}
                            description="There are currently no complaints in this queue matching your current filters."
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {complaints.map((ticket) => {
                                const isTerminal = ticket.status === 'RESOLVED' || ticket.status === 'REJECTED';
                                const ticketId = ticket.id || ticket.custom_id || ticket._id;

                                return (
                                    <div
                                        key={ticketId}
                                        className="glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                                    >
                                        <ComplaintCard
                                            complaint={ticket}
                                            onClick={() => setSelectedId(ticketId)}
                                        />

                                        <div className="p-3 bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
                                            <span className="text-[11px] font-bold text-slate-500">
                                                {tab === 'INBOUND'
                                                    ? `Assigned: ${ticket.active_respondent?.full_name || 'Unassigned (Department Review)'}`
                                                    : `Target Dept: ${formatTitle(ticket.target_department?.department_name || 'Central Administration')}`}
                                            </span>

                                            {isTerminal ? (
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold py-1">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>Closed ({formatTitle(ticket.status)})</span>
                                                </div>
                                            ) : tab === 'INBOUND' ? (
                                                <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(ticket, 'ASSIGN')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        <span>Assign</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(ticket, 'TRANSFER')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                    >
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                        <span>Reassign</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(ticket, 'TRANSFER_DEPT')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                    >
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        <span>Transfer Dept</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(ticket, 'RESOLVE')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                                                    >
                                                        <CheckSquare className="w-3.5 h-3.5" />
                                                        <span>Resolve</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAction(ticket, 'REJECT')}
                                                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedId(ticketId)}
                                                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 ml-auto"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>View Details</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <LoadMoreButton
                        loading={loading && complaints.length > 0}
                        hasMore={meta.page < meta.total_pages}
                        onClick={() => fetchDepartmentQueue(meta.page + 1, true)}
                    />
                </>
            ) : (
                <div className="space-y-6">
                    {loadingAnalytics ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <ChartSkeleton height="h-80" />
                            </div>
                            <div>
                                <ChartSkeleton height="h-80" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Department Load</span>
                                        <Layers className="w-4 h-4 text-brand-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                                        {executiveSummary.total_cases}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Complaints filed to department</p>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                                        <Clock className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                        {executiveSummary.active_cases}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Pending or under review</p>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overdue (SLA)</span>
                                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                        {executiveSummary.total_sla_breached}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Past target resolution date</p>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                                        <FileCheck className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                        {executiveSummary.total_resolved}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully closed</p>
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
                                    <span className="text-[10px] text-slate-400 mt-1.5 block">Department complaints solved</span>
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
                                        {executiveSummary.total_rejected} total rejected complaints
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

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-brand-500" />
                                            <span>Department Workload Overview</span>
                                        </h4>
                                    </div>
                                    <div className="w-full h-80">
                                        {barData.length === 0 ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                                <span className="text-xs text-slate-400 font-medium">No complaints active in your department</span>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} interval={0} angle={-25} textAnchor="end" />
                                                    <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} domain={[0, (dataMax) => (dataMax === 0 ? 5 : Math.ceil(dataMax * 1.1))]} />
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
                                                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
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
                                            const priorityName = String(item.priority || item._id || 'Standard').toLowerCase();
                                            const count = item.count ?? item.total ?? 0;
                                            const color = PRIORITY_COLORS[priorityName] || '#64748b';
                                            const percentage = executiveSummary.total_cases > 0
                                                ? Math.round((count / executiveSummary.total_cases) * 100)
                                                : 0;

                                            return (
                                                <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
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
                                                    <Pie data={stakeholderPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value">
                                                        {stakeholderPieData.map((entry, index) => (
                                                            <Cell key={`stakeholder-cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
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
                                            <Award className="w-4 h-4 text-amber-500" />
                                            <span>Faculty Performance Summary</span>
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Individual faculty workload, on-time resolution, and investigation turnaround.
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {displayFaculties.length} Faculty Members
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                            <tr>
                                                <th className="py-3 px-3">Faculty Member</th>
                                                <th className="py-3 px-3">Assigned</th>
                                                <th className="py-3 px-3">Resolved</th>
                                                <th className="py-3 px-3">Rejected</th>
                                                <th className="py-3 px-3">In Progress</th>
                                                <th className="py-3 px-3">Overdue</th>
                                                <th className="py-3 px-3">Average Time</th>
                                                <th className="py-3 px-3 text-right">Resolution Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                            {displayFaculties.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="py-6 text-center text-xs text-slate-400 italic">
                                                        No faculty members registered in this department yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                displayFaculties.map((f, i) => (
                                                    <tr key={f.faculty_id || f._id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                                    {(f.faculty_name || f.name || 'F').charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <span>{formatTitle(f.faculty_name || f.name || 'Faculty Member')}</span>
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
                                                        <td className="py-3 px-3 font-bold">{f.total_assigned ?? 0}</td>
                                                        <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            {f.resolved ?? f.resolved_cases ?? 0}
                                                        </td>
                                                        <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-semibold">
                                                            {f.rejected ?? f.rejected_cases ?? 0}
                                                        </td>
                                                        <td className="py-3 px-3 text-amber-600 dark:text-amber-400">
                                                            {f.active_under_review ?? f.under_review ?? 0}
                                                        </td>
                                                        <td className="py-3 px-3 font-semibold text-rose-600 dark:text-rose-400">
                                                            {f.sla_breached || 0}
                                                        </td>
                                                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                                            {f.avg_resolution_hours ? `${f.avg_resolution_hours} hrs` : 'N/A'}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-black text-brand-600 dark:text-brand-400">
                                                            {f.resolution_rate != null ? `${f.resolution_rate}%` : '100%'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ComplaintActionModal
                isOpen={Boolean(actionTicket)}
                onClose={() => {
                    setActionTicket(null);
                    setActionType(null);
                }}
                actionType={actionType}
                complaint={actionTicket}
                faculties={departmentFaculties}
                departments={allDepartments}
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