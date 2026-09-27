import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    CheckCircle,
    XCircle,
    ArrowRightLeft,
    CheckSquare,
    Sparkles,
    Archive,
    Lock,
    Layers,
    Eye,
    ShieldAlert,
    RefreshCw,
    Search,
    Filter,
    X,
    Calendar,
    ArrowUpDown,
    Tag,
    Building2,
    User,
    Shield,
    AlertTriangle,
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import ComplaintActionModal from '../components/complaint/ComplaintActionModal';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import EmptyState from '../components/common/EmptyState';
import LoadMoreButton from '../components/common/LoadMoreButton';
import { ComplaintListSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTitle, formatDate } from '../utils/formatters';

const PAGE_SIZE = 10;

const INITIAL_COUNTS = {
    active_assigned_count: 0,
    total_resolved_count: 0,
    total_rejected_count: 0,
    lifetime_assigned_tasks_count: 0,
};

export default function AssignedComplaints() {
    const { isHod, isLeadership, isAdmin } = useAuth();
    const { showError } = useToast();

    const [tab, setTab] = useState('ACTIVE');
    const [counts, setCounts] = useState(INITIAL_COUNTS);
    const [complaints, setComplaints] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);

    const [selectedId, setSelectedId] = useState(null);
    const [actionTicket, setActionTicket] = useState(null);
    const [actionType, setActionType] = useState(null);

    const [departments, setDepartments] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [colleagueFaculties, setColleagueFaculties] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [ticketTypeFilter, setTicketTypeFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortBy, setSortBy] = useState('createdAt:desc');

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

    const fetchDashboardCounts = useCallback(async () => {
        try {
            const res = await api.get('/complain/faculty/dashboard');
            const data = res?.data?.data || res?.data || {};
            setCounts({
                active_assigned_count: data.active_assigned_count ?? 0,
                total_resolved_count: data.total_resolved_count ?? 0,
                total_rejected_count: data.total_rejected_count ?? 0,
                lifetime_assigned_tasks_count: data.lifetime_assigned_tasks_count ?? 0,
            });
        } catch {
            // Empty catch
        }
    }, []);

    useEffect(() => {
        async function fetchOptions() {
            try {
                const [catRes, optionsRes] = await Promise.all([
                    api.get('/complain/category?populate=true'),
                    api.get('/complain/form-options'),
                ]);

                const rawCats = catRes?.data?.data || catRes?.data?.categories || catRes?.data || [];
                const cats = Array.isArray(rawCats) ? rawCats : (rawCats.categories || []);

                const optionsData = optionsRes?.data?.data || optionsRes?.data || {};
                const depts = optionsData.departments || [];
                const faculties = optionsData.all_officers || depts.flatMap((d) => d.faculties || []);

                setCategoryOptions(cats);
                setDepartments(Array.isArray(depts) ? depts : []);
                setColleagueFaculties(Array.isArray(faculties) ? faculties : []);
            } catch {
                setCategoryOptions([]);
                setDepartments([]);
                setColleagueFaculties([]);
            }
        }

        fetchOptions();
        fetchDashboardCounts();
    }, [fetchDashboardCounts]);

    const loadComplaints = useCallback(
        async (page = 1, append = false) => {
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    page: String(page),
                    limit: String(PAGE_SIZE),
                    populate: 'true',
                });

                if (debouncedSearch) params.append('search', debouncedSearch);
                if (priorityFilter) params.append('priority', priorityFilter);
                if (ticketTypeFilter) params.append('ticket_type', ticketTypeFilter);
                if (departmentFilter) params.append('target_department_id', departmentFilter);
                if (category) params.append('category_id', category);
                if (subcategory) params.append('subcategory_id', subcategory);
                if (fromDate) params.append('from_date', fromDate);
                if (toDate) params.append('to_date', toDate);

                const [field, dir] = sortBy.split(':');
                if (field) params.append('sort_by', field);
                if (dir) params.append('sort_order', dir);

                let endpoint = '/complain/faculty/tasks';
                if (tab === 'ACTIVE') {
                    endpoint = '/complain/faculty/tasks';
                    params.append('status', 'UNDER_REVIEW');
                } else {
                    endpoint = '/complain/faculty/history';
                    params.append('status', tab);
                }

                const res = await api.get(`${endpoint}?${params.toString()}`);
                const payload = res?.data?.data || res?.data || {};
                const list = Array.isArray(payload) ? payload : (payload.complains || payload.tasks || []);
                const metaData = res?.data?.meta || payload?.meta || {
                    page,
                    limit: PAGE_SIZE,
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
                    'Unable to load your assigned complaints. Please try again.';
                showError(errorMsg);
            } finally {
                setLoading(false);
            }
        },
        [
            tab,
            debouncedSearch,
            priorityFilter,
            ticketTypeFilter,
            departmentFilter,
            category,
            subcategory,
            fromDate,
            toDate,
            sortBy,
            showError,
        ]
    );

    useEffect(() => {
        loadComplaints(1, false);
    }, [loadComplaints]);

    const handleTabChange = (newTab) => {
        if (newTab === tab) return;
        setComplaints([]);
        setTab(newTab);
    };

    const resetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setPriorityFilter('');
        setTicketTypeFilter('');
        setDepartmentFilter('');
        setCategory('');
        setSubcategory('');
        setFromDate('');
        setToDate('');
        setSortBy('createdAt:desc');
    };

    const hasActiveFilters = Boolean(
        searchQuery ||
        priorityFilter ||
        ticketTypeFilter ||
        departmentFilter ||
        category ||
        subcategory ||
        fromDate ||
        toDate ||
        sortBy !== 'createdAt:desc'
    );

    const handleActionSuccess = () => {
        setActionTicket(null);
        setActionType(null);
        fetchDashboardCounts();
        loadComplaints(1, false);
    };

    const totalHandled = counts.total_resolved_count + counts.total_rejected_count;
    const canTransferDepartment = isHod || isLeadership || isAdmin;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            Assigned Complaints
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage complaints assigned to you, update their status, or transfer them to another member.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => {
                            fetchDashboardCounts();
                            loadComplaints(1, false);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Refresh list"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Assigned</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {counts.lifetime_assigned_tasks_count}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lifetime assigned complaints</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {counts.active_assigned_count}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Complaints requiring your action</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {totalHandled}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {counts.total_resolved_count} resolved • {counts.total_rejected_count} rejected
                    </p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Showing</span>
                        <Eye className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {complaints.length} <span className="text-xs text-slate-400 font-semibold">/ {meta.total}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">In {formatTitle(tab).toLowerCase()} tab</p>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => handleTabChange('ACTIVE')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        tab === 'ACTIVE'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    In Progress ({counts.active_assigned_count})
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('RESOLVED')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        tab === 'RESOLVED'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    Resolved ({counts.total_resolved_count})
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('REJECTED')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        tab === 'REJECTED'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    Rejected ({counts.total_rejected_count})
                </button>
            </div>

            <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Search & Filters
                        </span>
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
                            placeholder="Search by title, complaint number..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
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
                            value={ticketTypeFilter}
                            onChange={(e) => setTicketTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Types</option>
                            <option value="STATUTORY_GRIEVANCE">Formal Complaint</option>
                            <option value="DIRECT_QUERY">General Inquiry</option>
                        </select>
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
                                    {formatTitle(d.name || d.department_name)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
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
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="createdAt:desc">Newest First</option>
                            <option value="createdAt:asc">Oldest First</option>
                            <option value="priority:desc">Priority (High to Low)</option>
                            <option value="title:asc">Title (A to Z)</option>
                            <option value="ticket_number:asc">Complaint Number</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading && complaints.length === 0 ? (
                <ComplaintListSkeleton count={3} />
            ) : complaints.length === 0 ? (
                <EmptyState
                    icon={hasActiveFilters ? Filter : tab === 'ACTIVE' ? Sparkles : tab === 'RESOLVED' ? CheckCircle : Archive}
                    title={
                        hasActiveFilters
                            ? 'No Matching Complaints'
                            : tab === 'ACTIVE'
                                ? 'No Pending Complaints'
                                : tab === 'RESOLVED'
                                    ? 'No Resolved Complaints'
                                    : 'No Rejected Complaints'
                    }
                    description={
                        hasActiveFilters
                            ? 'No complaints match your filters. Try adjusting or clearing your search options.'
                            : tab === 'ACTIVE'
                                ? 'You have answered all active complaints assigned to you.'
                                : tab === 'RESOLVED'
                                    ? 'Complaints you resolve will appear here.'
                                    : 'Complaints you reject or decline will appear here.'
                    }
                    actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
                    onAction={hasActiveFilters ? resetFilters : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {complaints.map((ticket) => {
                        const isTerminal = ticket.status === 'RESOLVED' || ticket.status === 'REJECTED';
                        const ticketId = ticket.id || ticket.custom_id || ticket._id;
                        const isAnonymous =
                            ticket.is_anonymous &&
                            (!ticket.complainant?.email || ticket.complainant?.is_anonymous);

                        return (
                            <div
                                key={ticketId}
                                className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 relative overflow-hidden"
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
                                        {ticket.is_sla_breached && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold border border-red-500/20">
                                                <AlertTriangle className="w-3 h-3" />
                                                Overdue
                                            </span>
                                        )}
                                        <PriorityBadge priority={ticket.priority} />
                                        <StatusBadge status={ticket.status} />
                                        {(ticket.category?.title || ticket.category?.category_name) && (
                                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                <Tag className="w-3 h-3" />
                                                {ticket.category.title || ticket.category.category_name}
                                                {ticket.subcategory?.title && ` • ${ticket.subcategory.title}`}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 font-mono">{formatDate(ticket.createdAt)}</span>
                                </div>

                                <h4
                                    onClick={() => setSelectedId(ticketId)}
                                    className="text-base font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-500 transition-colors"
                                >
                                    {ticket.title}
                                </h4>

                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
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

                                {ticket.resolution_details?.remarks && (
                                    <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Resolution Notes: </span>
                                        <span className="text-slate-600 dark:text-slate-300">
                                            {ticket.resolution_details.remarks}
                                        </span>
                                    </div>
                                )}

                                {(ticket.rejection_details?.remarks || ticket.rejection_details?.reason) && (
                                    <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
                                        <span className="font-bold text-rose-700 dark:text-rose-400">Reason for Rejection: </span>
                                        <span className="text-slate-600 dark:text-slate-300">
                                            {ticket.rejection_details.remarks || ticket.rejection_details.reason}
                                        </span>
                                    </div>
                                )}

                                {tab === 'ACTIVE' && !isTerminal ? (
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(ticketId)}
                                            className="text-xs font-semibold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>View Details & Discussion</span>
                                        </button>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActionTicket(ticket);
                                                    setActionType('RESOLVE');
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" />
                                                <span>Resolve</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActionTicket(ticket);
                                                    setActionType('TRANSFER');
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-all"
                                            >
                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                <span>Transfer Member</span>
                                            </button>
                                            {canTransferDepartment && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActionTicket(ticket);
                                                        setActionType('TRANSFER_DEPT');
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-900/40 transition-all"
                                                >
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    <span>Transfer Dept</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActionTicket(ticket);
                                                    setActionType('REJECT');
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-900/40 transition-all"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>Reject</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex-wrap gap-2">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Closed ({formatTitle(ticket.status)})</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(ticketId)}
                                            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>View History & Chat</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <LoadMoreButton
                loading={loading && complaints.length > 0}
                hasMore={meta.page < meta.total_pages}
                onClick={() => loadComplaints(meta.page + 1, true)}
            />

            <ComplaintActionModal
                isOpen={Boolean(actionTicket)}
                onClose={() => {
                    setActionTicket(null);
                    setActionType(null);
                }}
                actionType={actionType}
                complaint={actionTicket}
                faculties={colleagueFaculties}
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