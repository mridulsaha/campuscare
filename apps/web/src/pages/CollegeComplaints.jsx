import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    ArrowUpDown,
    Building2,
    FileSpreadsheet,
    CheckSquare,
    ArrowRightLeft,
    XCircle,
    UserCheck,
    RefreshCw,
    Lock,
    Layers,
    CheckCircle2,
    ShieldAlert,
    Calendar,
    Filter,
    X,
    AlertTriangle,
    Eye,
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import ComplaintCard from '../components/complaint/ComplaintCard';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import ComplaintActionModal from '../components/complaint/ComplaintActionModal';
import LoadMoreButton from '../components/common/LoadMoreButton';
import EmptyState from '../components/common/EmptyState';
import { ComplaintListSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatTitle } from '../utils/formatters';

const INITIAL_METRICS = {
    total_cases: 0,
    active_cases: 0,
    total_resolved: 0,
    total_sla_breached: 0,
};

export default function CollegeComplaints() {
    const { showSuccess, showError } = useToast();

    const [complaints, setComplaints] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, total_pages: 1 });
    const [metrics, setMetrics] = useState(INITIAL_METRICS);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [ticketTypeFilter, setTicketTypeFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortOption, setSortOption] = useState('createdAt:desc');

    const [departments, setDepartments] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [faculties, setFaculties] = useState([]);

    const [selectedId, setSelectedId] = useState(null);
    const [actionTicket, setActionTicket] = useState(null);
    const [actionType, setActionType] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const availableSubcategories = useMemo(() => {
        if (!category) return [];
        const selected = categoryOptions.find((c) => {
            const id = c.id || c.custom_id || c._id;
            return String(id) === String(category);
        });
        return Array.isArray(selected?.subcategories) ? selected.subcategories : [];
    }, [category, categoryOptions]);

    const fetchInstitutionalMetrics = useCallback(async () => {
        try {
            const res = await api.get('/complain/analytics/report');
            const summary = res?.data?.data?.executive_summary || res?.data?.executive_summary || {};
            setMetrics({
                total_cases: summary.total_cases ?? 0,
                active_cases: summary.active_cases ?? 0,
                total_resolved: summary.total_resolved ?? 0,
                total_sla_breached: summary.total_sla_breached ?? 0,
            });
        } catch {
            // Empty catch
        }
    }, []);

    useEffect(() => {
        async function fetchOptions() {
            try {
                const [deptRes, formRes, catRes] = await Promise.all([
                    api.get('/department'),
                    api.get('/complain/form-options'),
                    api.get('/complain/category?populate=true'),
                ]);

                const deptList = deptRes?.data?.data || deptRes?.data || [];
                setDepartments(Array.isArray(deptList) ? deptList : (deptList.departments || []));

                const formData = formRes?.data?.data || formRes?.data || {};
                const allDepts = formData.departments || [];
                const flatFaculties = allDepts.flatMap((d) => d.faculties || []);
                const uniqueFaculties = Array.from(
                    new Map(flatFaculties.map((f) => [f.id || f._id || f.custom_id, f])).values()
                );
                setFaculties(formData.all_officers || uniqueFaculties);

                const rawCats = catRes?.data?.data || catRes?.data?.categories || catRes?.data || [];
                setCategoryOptions(Array.isArray(rawCats) ? rawCats : []);
            } catch {
                setDepartments([]);
                setFaculties([]);
                setCategoryOptions([]);
            }
        }

        fetchOptions();
        fetchInstitutionalMetrics();
    }, [fetchInstitutionalMetrics]);

    const fetchCollegeComplaints = useCallback(
        async (page = 1, append = false) => {
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    page: String(page),
                    limit: '12',
                    populate: 'true',
                });

                if (departmentFilter) params.append('target_department_id', departmentFilter);
                if (category) params.append('category_id', category);
                if (subcategory) params.append('subcategory_id', subcategory);
                if (statusFilter) params.append('status', statusFilter);
                if (priorityFilter) params.append('priority', priorityFilter);
                if (roleFilter) params.append('role', roleFilter);
                if (ticketTypeFilter) params.append('ticket_type', ticketTypeFilter);
                if (fromDate) params.append('from_date', fromDate);
                if (toDate) params.append('to_date', toDate);
                if (debouncedSearch) params.append('search', debouncedSearch);

                const [field, dir] = sortOption.split(':');
                if (field) params.append('sort_by', field);
                if (dir) params.append('sort_order', dir);

                const res = await api.get(`/complain/college/all?${params.toString()}`);
                const payload = res?.data?.data || res?.data || {};
                const list = Array.isArray(payload) ? payload : (payload.complains || []);
                const metaData = res?.data?.meta || payload?.meta || {
                    page,
                    limit: 12,
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
                const errorMsg =
                    err?.response?.data?.message ||
                    err?.message ||
                    'Unable to load complaints. Please try again.';
                showError(errorMsg);
            } finally {
                setLoading(false);
            }
        },
        [
            departmentFilter,
            category,
            subcategory,
            statusFilter,
            priorityFilter,
            roleFilter,
            ticketTypeFilter,
            fromDate,
            toDate,
            debouncedSearch,
            sortOption,
            showError,
        ]
    );

    useEffect(() => {
        fetchCollegeComplaints(1, false);
    }, [fetchCollegeComplaints]);

    const resetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setDepartmentFilter('');
        setCategory('');
        setSubcategory('');
        setStatusFilter('');
        setPriorityFilter('');
        setRoleFilter('');
        setTicketTypeFilter('');
        setFromDate('');
        setToDate('');
        setSortOption('createdAt:desc');
    };

    const hasActiveFilters = Boolean(
        searchQuery ||
        departmentFilter ||
        category ||
        subcategory ||
        statusFilter ||
        priorityFilter ||
        roleFilter ||
        ticketTypeFilter ||
        fromDate ||
        toDate ||
        sortOption !== 'createdAt:desc'
    );

    const openAction = (ticket, type) => {
        if (ticket.status === 'RESOLVED' || ticket.status === 'REJECTED') {
            showError(`This complaint has already been ${ticket.status.toLowerCase()} and cannot be modified.`);
            return;
        }
        setActionTicket(ticket);
        setActionType(type);
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/bulk/compliance/export', {
                responseType: 'blob',
            });
            const blobData = response?.data || response;
            const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `college_complaints_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSuccess('Report downloaded successfully.');
        } catch {
            showError('Unable to export report. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton fallback="/admin/dashboard" />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            College Administration
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            All Complaints
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Review, assign, and track complaints across all college departments.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            fetchInstitutionalMetrics();
                            fetchCollegeComplaints(1, false);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Refresh list"
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cases</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {metrics.total_cases || meta.total}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">All complaints submitted</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {metrics.active_cases}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pending or under review</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {metrics.total_resolved}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully closed cases</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA Breaches</span>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {metrics.total_sla_breached}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Exceeded SLA timeline</p>
                </div>
            </div>

            <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Search & Filters
                        </span>
                        {meta.total > 0 && (
                            <span className="text-[11px] text-slate-400 font-medium">
                                ({complaints.length} of {meta.total} showing)
                            </span>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Reset Filters</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search title, ID, ticket number..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id || d.custom_id || d._id} value={d.id || d.custom_id || d._id}>
                                    {formatTitle(d.department_name || d.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value);
                                setSubcategory('');
                            }}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Categories</option>
                            {categoryOptions.map((c) => (
                                <option key={c.id || c.custom_id || c._id} value={c.id || c.custom_id || c._id}>
                                    {formatTitle(c.title || c.category_name || c.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            disabled={!category || availableSubcategories.length === 0}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">All Subcategories</option>
                            {availableSubcategories.map((sc) => (
                                <option key={sc.id || sc.custom_id || sc._id} value={sc.id || sc.custom_id || sc._id}>
                                    {formatTitle(sc.title || sc.subcategory_name || sc.name)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Priorities</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Complainants</option>
                            <option value="student">Students</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Staff & Admin</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={ticketTypeFilter}
                            onChange={(e) => setTicketTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Types</option>
                            <option value="STATUTORY_GRIEVANCE">Formal Complaints</option>
                            <option value="DIRECT_QUERY">General Inquiries</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-400 shrink-0">From:</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full text-xs bg-transparent border-0 text-slate-900 dark:text-white focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-400 shrink-0">To:</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full text-xs bg-transparent border-0 text-slate-900 dark:text-white focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-1.5">
                        <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="createdAt:desc">Newest First</option>
                            <option value="createdAt:asc">Oldest First</option>
                            <option value="priority:desc">Priority (High to Low)</option>
                            <option value="status:asc">Status</option>
                            <option value="title:asc">Title (A to Z)</option>
                            <option value="ticket_number:asc">Complaint Number</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading && complaints.length === 0 ? (
                <ComplaintListSkeleton count={4} />
            ) : complaints.length === 0 ? (
                <EmptyState
                    icon={hasActiveFilters ? Filter : ShieldAlert}
                    title={hasActiveFilters ? "No Matching Complaints" : "No Complaints Found"}
                    description={
                        hasActiveFilters
                            ? "No complaints match your current search filters. Try adjusting or clearing your criteria."
                            : "There are currently no complaints recorded."
                    }
                    actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
                    actionIcon={hasActiveFilters ? X : undefined}
                    onAction={hasActiveFilters ? resetFilters : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
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
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[11px] font-bold text-slate-500">
                                            Department:{' '}
                                            {ticket.target_department?.department_name
                                                ? formatTitle(ticket.target_department.department_name)
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
                                            <span>Closed ({formatTitle(ticket.status)})</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {!ticket.active_respondent_id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openAction(ticket, 'ASSIGN')}
                                                    className="px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                                                >
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    <span>Assign</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => openAction(ticket, 'TRANSFER')}
                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                                >
                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    <span>Reassign Member</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => openAction(ticket, 'TRANSFER_DEPT')}
                                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                            >
                                                <Building2 className="w-3.5 h-3.5" />
                                                <span>Change Department</span>
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
                onClick={() => fetchCollegeComplaints(meta.page + 1, true)}
            />

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
                onSuccess={() => {
                    showSuccess('Complaint updated successfully.');
                    setActionTicket(null);
                    setActionType(null);
                    fetchInstitutionalMetrics();
                    fetchCollegeComplaints(1, false);
                }}
            />

            <ComplaintTimelineModal
                isOpen={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                complaintId={selectedId}
            />
        </div>
    );
}