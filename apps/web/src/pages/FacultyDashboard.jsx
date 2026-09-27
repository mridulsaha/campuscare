import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Inbox,
    CheckCircle,
    XCircle,
    ArrowRightLeft,
    CheckSquare,
    Sparkles,
    Building2,
    Layers,
    Eye,
    Percent,
    Calendar,
    Tag,
    ArrowRight,
    Clock,
    AlertTriangle,
    User,
    Shield,
    Lock,
    BarChart3,
    PieChart as PieIcon,
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
import { Link } from 'react-router-dom';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import ComplaintActionModal from '../components/complaint/ComplaintActionModal';
import EmptyState from '../components/common/EmptyState';
import {
    ComplaintListSkeleton,
    ChartSkeleton,
} from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTitle, formatDate } from '../utils/formatters';

const INITIAL_DASHBOARD_DATA = {
    faculty_id: null,
    active_assigned_count: 0,
    total_resolved_count: 0,
    total_rejected_count: 0,
    lifetime_assigned_tasks_count: 0,
    active_tasks: [],
    resolved_tasks: [],
    rejected_tasks: [],
};

const PRIORITY_COLORS = {
    critical: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/50',
    high: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50',
    low: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50',
};

export default function FacultyDashboard() {
    const { user, isHod, isLeadership, isAdmin } = useAuth();
    const { showError, showSuccess } = useToast();
    const [dashboardData, setDashboardData] = useState(INITIAL_DASHBOARD_DATA);
    const [activeTab, setActiveTab] = useState('ACTIVE');
    const [loading, setLoading] = useState(true);

    const [selectedComplaintId, setSelectedComplaintId] = useState(null);
    const [actionComplaint, setActionComplaint] = useState(null);
    const [actionType, setActionType] = useState(null);

    const [colleagueFaculties, setColleagueFaculties] = useState([]);
    const [departments, setDepartments] = useState([]);

    const canTransferDepartment = isHod || isLeadership || isAdmin;

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [dashRes, optionsRes, deptRes] = await Promise.all([
                api.get('/complain/faculty/dashboard'),
                api.get('/complain/form-options'),
                api.get('/department'),
            ]);

            const rawDashboard = dashRes?.data?.data || dashRes?.data || {};
            setDashboardData({
                faculty_id: rawDashboard.faculty_id || null,
                active_assigned_count: rawDashboard.active_assigned_count ?? 0,
                total_resolved_count: rawDashboard.total_resolved_count ?? 0,
                total_rejected_count: rawDashboard.total_rejected_count ?? 0,
                lifetime_assigned_tasks_count: rawDashboard.lifetime_assigned_tasks_count ?? 0,
                active_tasks: Array.isArray(rawDashboard.active_tasks) ? rawDashboard.active_tasks : [],
                resolved_tasks: Array.isArray(rawDashboard.resolved_tasks) ? rawDashboard.resolved_tasks : [],
                rejected_tasks: Array.isArray(rawDashboard.rejected_tasks) ? rawDashboard.rejected_tasks : [],
            });

            const optionsData = optionsRes?.data?.data || optionsRes?.data || {};
            const allDepts = optionsData.departments || [];
            const flatFaculties = allDepts.flatMap((d) => d.faculties || []);
            const allOfficers = optionsData.all_officers || [];
            setColleagueFaculties(allOfficers.length > 0 ? allOfficers : flatFaculties);

            const deptList = deptRes?.data?.data || deptRes?.data || [];
            setDepartments(Array.isArray(deptList) ? deptList : (deptList.departments || []));
        } catch (err) {
            console.error('Failed to load faculty dashboard:', err);
            showError('Unable to load your dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openAction = (complaint, type) => {
        if (complaint.status === 'RESOLVED' || complaint.status === 'REJECTED') {
            showError(`This complaint is already ${complaint.status.toLowerCase()} and cannot be modified.`);
            return;
        }
        setActionComplaint(complaint);
        setActionType(type);
    };

    const handleActionSuccess = () => {
        showSuccess('Complaint status updated successfully.');
        setActionComplaint(null);
        setActionType(null);
        loadData();
    };

    const activeTasks = dashboardData.active_tasks;
    const resolvedTasks = dashboardData.resolved_tasks;
    const rejectedTasks = dashboardData.rejected_tasks;

    const activeCount = dashboardData.active_assigned_count;
    const resolvedCount = dashboardData.total_resolved_count;
    const rejectedCount = dashboardData.total_rejected_count;
    const lifetimeCount = dashboardData.lifetime_assigned_tasks_count;

    const overdueActiveCount = useMemo(() => {
        return activeTasks.filter((t) => t.is_sla_breached).length;
    }, [activeTasks]);

    const totalHandled = resolvedCount + rejectedCount;
    const resolutionRate =
        totalHandled > 0 ? Math.round((resolvedCount / totalHandled) * 100) : 100;

    const barData = useMemo(() => {
        const priorities = ['critical', 'high', 'medium', 'low'];
        const allTasks = [
            ...activeTasks.map((t) => ({ ...t, _statusGroup: 'In Progress' })),
            ...resolvedTasks.map((t) => ({ ...t, _statusGroup: 'Resolved' })),
            ...rejectedTasks.map((t) => ({ ...t, _statusGroup: 'Rejected' })),
        ];

        return priorities.map((p) => {
            const formatted = formatTitle(p);
            const matching = allTasks.filter(
                (t) => String(t.priority || 'low').toLowerCase() === p
            );
            return {
                name: formatted,
                fullName: `${formatted} Priority`,
                'In Progress': matching.filter((t) => t._statusGroup === 'In Progress').length,
                Resolved: matching.filter((t) => t._statusGroup === 'Resolved').length,
                Rejected: matching.filter((t) => t._statusGroup === 'Rejected').length,
            };
        });
    }, [activeTasks, resolvedTasks, rejectedTasks]);

    const hasBarData = useMemo(() => {
        return barData.some((d) => d['In Progress'] + d.Resolved + d.Rejected > 0);
    }, [barData]);

    const statusPieData = useMemo(() => {
        return [
            { name: 'Resolved', value: resolvedCount || 0 },
            { name: 'In Progress', value: activeCount || 0 },
            { name: 'Rejected', value: rejectedCount || 0 },
        ].filter((p) => p.value > 0);
    }, [resolvedCount, activeCount, rejectedCount]);

    const hasStatusData = statusPieData.length > 0;

    return (
        <div className="space-y-8">
            <div className="glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        Faculty Portal
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                        Welcome back, {formatTitle(user?.full_name || 'Faculty Member')}!
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Building2 className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {user?.department?.department_name
                                ? formatTitle(user.department.department_name)
                                : 'Academic Department'}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                            {formatTitle(user?.designation || 'Faculty')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <Link
                        to="/complaints/assigned"
                        className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:border-brand-500 dark:hover:border-brand-500"
                    >
                        <Layers className="w-4 h-4 text-brand-500" />
                        <span>View Assigned Queue</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Assigned</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {lifetimeCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lifetime assigned complaints</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {activeCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {overdueActiveCount > 0 ? (
                            <span className="text-rose-600 font-semibold">{overdueActiveCount} overdue (SLA)</span>
                        ) : (
                            'Requiring your review'
                        )}
                    </p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {resolvedCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully closed</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {rejectedCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Declined / ineligible</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution Rate</span>
                        <Percent className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {resolutionRate}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{resolvedCount} of {totalHandled || 0} completed</p>
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
                                <span>Complaints by Priority</span>
                            </h4>
                            {!hasBarData && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                                    No Active Data
                                </span>
                            )}
                        </div>
                        <div className="w-full h-80">
                            {!hasBarData ? (
                                <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-medium">No assigned task activity recorded</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={barData}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                    >
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={11}
                                            tickLine={false}
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
                                        <Bar dataKey="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
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
                                            {statusPieData.map((entry, index) => {
                                                const color =
                                                    entry.name === 'Resolved'
                                                        ? '#10b981'
                                                        : entry.name === 'In Progress'
                                                        ? '#f59e0b'
                                                        : '#ef4444';
                                                return <Cell key={`status-cell-${index}`} fill={color} />;
                                            })}
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

            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ACTIVE')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                activeTab === 'ACTIVE'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                            }`}
                        >
                            <Inbox className="w-3.5 h-3.5" />
                            <span>In Progress ({activeCount})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('RESOLVED')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                activeTab === 'RESOLVED'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                            }`}
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Resolved ({resolvedCount})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('REJECTED')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                activeTab === 'REJECTED'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                            }`}
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected ({rejectedCount})</span>
                        </button>
                    </div>

                    <Link
                        to="/complaints/assigned"
                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                        <span>Open Full Assigned Queue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <ComplaintListSkeleton count={3} />
                ) : (
                    <>
                        {activeTab === 'ACTIVE' && (
                            activeTasks.length === 0 ? (
                                <EmptyState
                                    icon={Sparkles}
                                    title="No Complaints In Progress"
                                    description="You have addressed all active complaints assigned to you."
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {activeTasks.map((ticket) => {
                                        const ticketId = ticket.id || ticket.custom_id || ticket._id;
                                        const priorityKey = String(ticket.priority || 'low').toLowerCase();
                                        const priorityBadgeClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.low;
                                        const isAnonymous =
                                            ticket.is_anonymous &&
                                            (!ticket.complainant?.email || ticket.complainant?.is_anonymous);

                                        return (
                                            <div
                                                key={ticketId}
                                                className="glass p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 transition-all hover:border-brand-500/40 relative overflow-hidden"
                                            >
                                                {ticket.is_sla_breached && (
                                                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-600 to-rose-500" />
                                                )}

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold text-brand-600 bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">
                                                            {ticket.ticket_number || ticket.custom_id || 'COMPLAINT'}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                                            {ticket.ticket_type === 'DIRECT_QUERY' ? 'General Inquiry' : 'Formal Complaint'}
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityBadgeClass}`}>
                                                            {ticket.priority} Priority
                                                        </span>
                                                        {ticket.is_sla_breached && (
                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Overdue (SLA)
                                                            </span>
                                                        )}
                                                        {(ticket.category?.title || ticket.category?.category_name) && (
                                                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                <Tag className="w-3 h-3" />
                                                                {ticket.category.title || ticket.category.category_name}
                                                                {ticket.subcategory?.title && ` • ${ticket.subcategory.title}`}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>{formatDate(ticket.createdAt)}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4
                                                        onClick={() => setSelectedComplaintId(ticketId)}
                                                        className="text-base font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-500 transition-colors"
                                                    >
                                                        {ticket.title}
                                                    </h4>
                                                </div>

                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                    {ticket.description}
                                                </p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 px-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                                Target Department
                                                            </span>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                                {formatTitle(ticket.target_department?.department_name || ticket.target_department_id || 'Department')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                                Complainant
                                                            </span>
                                                            {isAnonymous ? (
                                                                <span className="font-semibold text-slate-600 dark:text-slate-400 italic flex items-center gap-1">
                                                                    <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                                                                    Anonymous ({formatTitle(ticket.complainant?.role || ticket.complainant_role || 'User')})
                                                                </span>
                                                            ) : (
                                                                <div className="truncate">
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                                        {formatTitle(ticket.complainant?.full_name || 'Complainant')}
                                                                        {ticket.complainant_role && ` (${formatTitle(ticket.complainant_role)})`}
                                                                    </span>
                                                                    {ticket.complainant?.email && (
                                                                        <span className="text-[10px] font-mono text-slate-400 truncate block">
                                                                            {ticket.complainant.email}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedComplaintId(ticketId)}
                                                        className="text-xs font-semibold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View Details & Discussion</span>
                                                    </button>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => openAction(ticket, 'RESOLVE')}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                                        >
                                                            <CheckSquare className="w-3.5 h-3.5" />
                                                            <span>Resolve</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => openAction(ticket, 'TRANSFER')}
                                                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                                                        >
                                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                                            <span>Transfer Member</span>
                                                        </button>

                                                        {canTransferDepartment && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openAction(ticket, 'TRANSFER_DEPT')}
                                                                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-900/40 transition-all"
                                                            >
                                                                <Building2 className="w-3.5 h-3.5" />
                                                                <span>Transfer Dept</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => openAction(ticket, 'REJECT')}
                                                            className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 text-xs font-bold flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/40 transition-all"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            <span>Reject</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {activeTab === 'RESOLVED' && (
                            resolvedTasks.length === 0 ? (
                                <EmptyState
                                    icon={CheckCircle}
                                    title="No Resolved Complaints Yet"
                                    description="Complaints you resolve will appear here."
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {resolvedTasks.map((ticket) => {
                                        const ticketId = ticket.id || ticket.custom_id || ticket._id;
                                        const priorityKey = String(ticket.priority || 'low').toLowerCase();
                                        const priorityBadgeClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.low;
                                        const isAnonymous =
                                            ticket.is_anonymous &&
                                            (!ticket.complainant?.email || ticket.complainant?.is_anonymous);

                                        return (
                                            <div
                                                key={ticketId}
                                                className="glass p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
                                            >
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                                                            {ticket.ticket_number || ticket.custom_id || 'COMPLAINT'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded uppercase">
                                                            Resolved
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityBadgeClass}`}>
                                                            {ticket.priority} Priority
                                                        </span>
                                                        {(ticket.category?.title || ticket.category?.category_name) && (
                                                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                <Tag className="w-3 h-3" />
                                                                {ticket.category.title || ticket.category.category_name}
                                                                {ticket.subcategory?.title && ` • ${ticket.subcategory.title}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        Closed on {formatDate(ticket.resolution_details?.resolved_at || ticket.updatedAt)}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h4
                                                        onClick={() => setSelectedComplaintId(ticketId)}
                                                        className="text-base font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-500 transition-colors"
                                                    >
                                                        {ticket.title}
                                                    </h4>
                                                </div>

                                                {ticket.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        {ticket.description}
                                                    </p>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 px-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                                Department
                                                            </span>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                                {formatTitle(ticket.target_department?.department_name || ticket.target_department_id || 'Department')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                                Complainant
                                                            </span>
                                                            {isAnonymous ? (
                                                                <span className="font-semibold text-slate-600 dark:text-slate-400 italic flex items-center gap-1">
                                                                    <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                                                                    Anonymous ({formatTitle(ticket.complainant?.role || ticket.complainant_role || 'User')})
                                                                </span>
                                                            ) : (
                                                                <div className="truncate">
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                                        {formatTitle(ticket.complainant?.full_name || 'Complainant')}
                                                                    </span>
                                                                    {ticket.complainant?.email && (
                                                                        <span className="text-[10px] font-mono text-slate-400 truncate block">
                                                                            {ticket.complainant.email}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(ticket.resolution_details?.remarks || ticket.resolution_details?.reason) && (
                                                    <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Resolution Notes: </span>
                                                        <span className="text-slate-600 dark:text-slate-300">
                                                            {ticket.resolution_details.remarks || ticket.resolution_details.reason}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>Closed (Resolved)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedComplaintId(ticketId)}
                                                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View History & Chat</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {activeTab === 'REJECTED' && (
                            rejectedTasks.length === 0 ? (
                                <EmptyState
                                    icon={XCircle}
                                    title="No Rejected Complaints"
                                    description="Complaints you reject or decline will appear here."
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {rejectedTasks.map((ticket) => {
                                        const ticketId = ticket.id || ticket.custom_id || ticket._id;
                                        const priorityKey = String(ticket.priority || 'low').toLowerCase();
                                        const priorityBadgeClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.low;
                                        const isAnonymous =
                                            ticket.is_anonymous &&
                                            (!ticket.complainant?.email || ticket.complainant?.is_anonymous);

                                        return (
                                            <div
                                                key={ticketId}
                                                className="glass p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
                                            >
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                                                            {ticket.ticket_number || ticket.custom_id || 'COMPLAINT'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded uppercase">
                                                            Rejected
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityBadgeClass}`}>
                                                            {ticket.priority} Priority
                                                        </span>
                                                        {(ticket.category?.title || ticket.category?.category_name) && (
                                                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                <Tag className="w-3 h-3" />
                                                                {ticket.category.title || ticket.category.category_name}
                                                                {ticket.subcategory?.title && ` • ${ticket.subcategory.title}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        Rejected on {formatDate(ticket.rejection_details?.rejected_at || ticket.updatedAt)}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h4
                                                        onClick={() => setSelectedComplaintId(ticketId)}
                                                        className="text-base font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-500 transition-colors"
                                                    >
                                                        {ticket.title}
                                                    </h4>
                                                </div>

                                                {ticket.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        {ticket.description}
                                                    </p>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 px-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                                Department
                                                            </span>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                                {formatTitle(ticket.target_department?.department_name || ticket.target_department_id || 'Department')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                                Complainant
                                                            </span>
                                                            {isAnonymous ? (
                                                                <span className="font-semibold text-slate-600 dark:text-slate-400 italic flex items-center gap-1">
                                                                    <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                                                                    Anonymous ({formatTitle(ticket.complainant?.role || ticket.complainant_role || 'User')})
                                                                </span>
                                                            ) : (
                                                                <div className="truncate">
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                                        {formatTitle(ticket.complainant?.full_name || 'Complainant')}
                                                                    </span>
                                                                    {ticket.complainant?.email && (
                                                                        <span className="text-[10px] font-mono text-slate-400 truncate block">
                                                                            {ticket.complainant.email}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(ticket.rejection_details?.remarks || ticket.rejection_details?.reason) && (
                                                    <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
                                                        <span className="font-bold text-rose-700 dark:text-rose-400">Reason for Rejection: </span>
                                                        <span className="text-slate-600 dark:text-slate-300">
                                                            {ticket.rejection_details.remarks || ticket.rejection_details.reason}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>Closed (Rejected)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedComplaintId(ticketId)}
                                                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View History & Chat</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            <ComplaintActionModal
                isOpen={Boolean(actionComplaint)}
                onClose={() => {
                    setActionComplaint(null);
                    setActionType(null);
                }}
                actionType={actionType}
                complaint={actionComplaint}
                faculties={colleagueFaculties}
                departments={departments}
                onSuccess={handleActionSuccess}
            />

            <ComplaintTimelineModal
                isOpen={Boolean(selectedComplaintId)}
                onClose={() => setSelectedComplaintId(null)}
                complaintId={selectedComplaintId}
            />
        </div>
    );
}