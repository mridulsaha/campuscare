import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    PlusCircle,
    Inbox,
    Layers,
    Eye,
    CheckCircle2,
    Clock,
    Search,
    ArrowUpDown,
    RefreshCw,
    Calendar,
    Filter,
    X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import ComplaintCard from '../components/complaint/ComplaintCard';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import LoadMoreButton from '../components/common/LoadMoreButton';
import EmptyState from '../components/common/EmptyState';
import { ComplaintListSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatTitle } from '../utils/formatters';

export default function MyComplaints() {
    const { showError } = useToast();
    const [complaints, setComplaints] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [departments, setDepartments] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [ticketTypeFilter, setTicketTypeFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortOption, setSortOption] = useState('createdAt:desc');
    const [formOptions, setFormOptions] = useState([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        async function fetchDepartments() {
            try {
                const res = await api.get('/department');
                const deptList = res?.data?.data || res?.data || res || [];
                setDepartments(Array.isArray(deptList) ? deptList : (deptList.departments || []));
            } catch {
                setDepartments([]);
            }
        }

        async function fetchCategoryOptions() {
            try {
                const res = await api.get('/complain/form-options');
                const options =
                    res?.data?.categories ||
                    res?.data?.data ||
                    res?.categories ||
                    res?.data ||
                    [];
                setFormOptions(Array.isArray(options) ? options : []);
            } catch {
                setFormOptions([]);
            }
        }

        fetchDepartments();
        fetchCategoryOptions();
    }, []);

    const availableSubcategories = useMemo(() => {
        if (!category) return [];
        const activeCat = formOptions.find(
            (c) => (c.id || c.custom_id || c._id) === category
        );
        return activeCat?.subcategories || [];
    }, [category, formOptions]);

    const loadComplaints = useCallback(async (page = 1, append = false) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: '12',
                populate: 'true',
            });

            if (statusFilter) params.append('status', statusFilter);
            if (priorityFilter) params.append('priority', priorityFilter);
            if (ticketTypeFilter) params.append('ticket_type', ticketTypeFilter);
            if (departmentFilter) params.append('target_department_id', departmentFilter);
            if (fromDate) params.append('from_date', fromDate);
            if (toDate) params.append('to_date', toDate);
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (category) params.append('category_id', category);
            if (subcategory) params.append('subcategory_id', subcategory);

            const [field, dir] = sortOption.split(':');
            if (field) params.append('sort_by', field);
            if (dir) params.append('sort_order', dir);

            const res = await api.get(`/complain/my?${params.toString()}`);
            const payload = res?.data?.data || res?.data || res || {};
            const list = Array.isArray(payload) ? payload : (payload.complains || []);
            const metaData = res?.data?.meta || res?.meta || payload?.meta || {
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
                err?.error ||
                err?.message ||
                'Unable to load your complaints. Please try again.';
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, priorityFilter, ticketTypeFilter, departmentFilter, fromDate, toDate, debouncedSearch, sortOption, showError, category, subcategory]);

    useEffect(() => {
        loadComplaints(1, false);
    }, [loadComplaints]);

    const resetAllFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setStatusFilter('');
        setPriorityFilter('');
        setTicketTypeFilter('');
        setDepartmentFilter('');
        setCategory('');
        setSubcategory('');
        setFromDate('');
        setToDate('');
        setSortOption('createdAt:desc');
    };

    const hasActiveFilters = Boolean(
        searchQuery ||
        statusFilter ||
        priorityFilter ||
        ticketTypeFilter ||
        departmentFilter ||
        fromDate ||
        toDate ||
        sortOption !== 'createdAt:desc' ||
        category ||
        subcategory
    );

    const resolvedCount = useMemo(
        () => complaints.filter((c) => c.status === 'RESOLVED').length,
        [complaints]
    );

    const activeCount = useMemo(
        () => complaints.filter((c) => c.status === 'PENDING' || c.status === 'UNDER_REVIEW').length,
        [complaints]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            My Complaints
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Track the status and history of the complaints you have submitted.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => loadComplaints(1, false)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Refresh list"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <Link
                        to="/complaints/file"
                        className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Submit Complaint</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Submitted</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {meta.total}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Your submitted complaints</p>
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
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {activeCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Under active review</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {resolvedCount}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Successfully resolved</p>
                </div>
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
                            onClick={resetAllFilters}
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id || d.custom_id || d._id} value={d.id || d.custom_id || d._id}>
                                    {formatTitle(d.department_name)}
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
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="createdAt:desc">Newest First</option>
                            <option value="createdAt:asc">Oldest First</option>
                            <option value="updatedAt:desc">Recently Updated First</option>
                            <option value="priority:desc">Priority (High to Low)</option>
                            <option value="status:asc">Status</option>
                            <option value="ticket_number:asc">Complaint Number</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
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
                            {formOptions.map((c) => (
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
            </div>

            {loading && complaints.length === 0 ? (
                <ComplaintListSkeleton count={4} />
            ) : complaints.length === 0 ? (
                <EmptyState
                    icon={hasActiveFilters ? Filter : Inbox}
                    title={hasActiveFilters ? "No Matching Complaints" : "No Complaints Submitted"}
                    description={
                        hasActiveFilters
                            ? "No complaints match your current search filters. Try adjusting your criteria."
                            : "You haven't submitted any complaints yet. When you submit a complaint, it will appear here."
                    }
                    actionLabel={hasActiveFilters ? "Clear Filters" : "Submit Complaint"}
                    actionLink={hasActiveFilters ? undefined : "/complaints/file"}
                    actionIcon={hasActiveFilters ? X : PlusCircle}
                    onAction={hasActiveFilters ? resetAllFilters : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {complaints.map((c) => (
                        <ComplaintCard
                            key={c.id || c.custom_id || c._id}
                            complaint={c}
                            onClick={() => setSelectedId(c.id || c.custom_id || c._id)}
                        />
                    ))}
                </div>
            )}

            <LoadMoreButton
                loading={loading && complaints.length > 0}
                hasMore={meta.page < meta.total_pages}
                onClick={() => loadComplaints(meta.page + 1, true)}
            />

            <ComplaintTimelineModal
                isOpen={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                complaintId={selectedId}
            />
        </div>
    );
}