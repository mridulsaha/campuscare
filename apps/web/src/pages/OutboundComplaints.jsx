import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Send,
    Search,
    ArrowUpDown,
    RefreshCw,
    Layers,
    Eye,
    CheckCircle2,
    ShieldAlert,
    Calendar,
    Filter,
    X,
    Lock,
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import ComplaintCard from '../components/complaint/ComplaintCard';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import LoadMoreButton from '../components/common/LoadMoreButton';
import EmptyState from '../components/common/EmptyState';
import { ComplaintListSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatTitle } from '../utils/formatters';

export default function OutboundComplaints() {
    const { showError } = useToast();

    const [complaints, setComplaints] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, total_pages: 1 });
    const [totalOutbound, setTotalOutbound] = useState(0);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [targetDepartmentFilter, setTargetDepartmentFilter] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [ticketTypeFilter, setTicketTypeFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortOption, setSortOption] = useState('createdAt:desc');

    const [departments, setDepartments] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);

    const [selectedId, setSelectedId] = useState(null);

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

    const fetchHodSummary = useCallback(async () => {
        try {
            const res = await api.get('/complain/hod/dashboard');
            const data = res?.data?.data || res?.data || {};
            setTotalOutbound(data.total_outbound_count ?? 0);
        } catch {
            // Empty Catch
        }
    }, []);

    useEffect(() => {
        async function fetchOptions() {
            try {
                const [deptRes, catRes] = await Promise.all([
                    api.get('/department'),
                    api.get('/complain/category?populate=true'),
                ]);

                const deptList = deptRes?.data?.data || deptRes?.data || [];
                setDepartments(Array.isArray(deptList) ? deptList : (deptList.departments || []));

                const rawCats = catRes?.data?.data || catRes?.data?.categories || catRes?.data || [];
                setCategoryOptions(Array.isArray(rawCats) ? rawCats : []);
            } catch {
                setDepartments([]);
                setCategoryOptions([]);
            }
        }

        fetchOptions();
        fetchHodSummary();
    }, [fetchHodSummary]);

    const fetchOutbound = useCallback(
        async (page = 1, append = false) => {
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    page: String(page),
                    limit: '12',
                    populate: 'true',
                });

                if (targetDepartmentFilter) params.append('target_department_id', targetDepartmentFilter);
                if (category) params.append('category_id', category);
                if (subcategory) params.append('subcategory_id', subcategory);
                if (statusFilter) params.append('status', statusFilter);
                if (priorityFilter) params.append('priority', priorityFilter);
                if (ticketTypeFilter) params.append('ticket_type', ticketTypeFilter);
                if (roleFilter) params.append('role', roleFilter);
                if (fromDate) params.append('from_date', fromDate);
                if (toDate) params.append('to_date', toDate);
                if (debouncedSearch) params.append('search', debouncedSearch);

                const [field, dir] = sortOption.split(':');
                if (field) params.append('sort_by', field);
                if (dir) params.append('sort_order', dir);

                const res = await api.get(`/complain/department/outbound?${params.toString()}`);
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
                    'Unable to load outgoing complaints. Please try again.';
                showError(errorMsg);
            } finally {
                setLoading(false);
            }
        },
        [
            targetDepartmentFilter,
            category,
            subcategory,
            statusFilter,
            priorityFilter,
            ticketTypeFilter,
            roleFilter,
            fromDate,
            toDate,
            debouncedSearch,
            sortOption,
            showError,
        ]
    );

    useEffect(() => {
        fetchOutbound(1, false);
    }, [fetchOutbound]);

    const resetFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setTargetDepartmentFilter('');
        setCategory('');
        setSubcategory('');
        setStatusFilter('');
        setPriorityFilter('');
        setTicketTypeFilter('');
        setRoleFilter('');
        setFromDate('');
        setToDate('');
        setSortOption('createdAt:desc');
    };

    const hasActiveFilters = Boolean(
        searchQuery ||
        targetDepartmentFilter ||
        category ||
        subcategory ||
        statusFilter ||
        priorityFilter ||
        ticketTypeFilter ||
        roleFilter ||
        fromDate ||
        toDate ||
        sortOption !== 'createdAt:desc'
    );

    const activeCount = useMemo(
        () => complaints.filter((c) => c.status === 'PENDING' || c.status === 'UNDER_REVIEW').length,
        [complaints]
    );
    const resolvedCount = useMemo(
        () => complaints.filter((c) => c.status === 'RESOLVED').length,
        [complaints]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton fallback="/hod/dashboard" />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            Department Queue
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            Outgoing Complaints
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Track complaints filed by members of your department to other departments or facilities.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        fetchHodSummary();
                        fetchOutbound(1, false);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors self-start sm:self-auto"
                    title="Refresh list"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Outbound</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {totalOutbound || meta.total}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">All outgoing complaints</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Showing</span>
                        <Eye className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {complaints.length} <span className="text-xs text-slate-400 font-semibold">/ {meta.total}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Loaded on this page</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {activeCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pending or under review</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {resolvedCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully closed</p>
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
                            placeholder="Search by title or complaint number..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <select
                            value={targetDepartmentFilter}
                            onChange={(e) => setTargetDepartmentFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Destination Departments</option>
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
                            value={ticketTypeFilter}
                            onChange={(e) => setTicketTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Types</option>
                            <option value="STATUTORY_GRIEVANCE">Formal Complaints</option>
                            <option value="DIRECT_QUERY">General Inquiries</option>
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
                    icon={hasActiveFilters ? Filter : Send}
                    title={hasActiveFilters ? "No Matching Complaints" : "No Outgoing Complaints"}
                    description={
                        hasActiveFilters
                            ? "No outgoing complaints match your current search filters. Try adjusting your criteria."
                            : "There are currently no complaints filed by your department to other divisions."
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
                                            Destination Department:{' '}
                                            {ticket.target_department?.department_name
                                                ? formatTitle(ticket.target_department.department_name)
                                                : 'External Facility / Cell'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(ticketId)}
                                            className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>View Details & Discussion</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold py-1">
                                        {isTerminal ? (
                                            <>
                                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Closed ({formatTitle(ticket.status)})</span>
                                            </>
                                        ) : (
                                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                Under Review at Target Department
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <LoadMoreButton
                loading={loading && complaints.length > 0}
                hasMore={meta.page < meta.total_pages}
                onClick={() => fetchOutbound(meta.page + 1, true)}
            />

            <ComplaintTimelineModal
                isOpen={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                complaintId={selectedId}
            />
        </div>
    );
}