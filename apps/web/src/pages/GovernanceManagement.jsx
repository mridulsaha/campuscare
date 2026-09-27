import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Layers,
    Plus,
    Edit2,
    Trash2,
    Building2,
    BookOpen,
    GitBranch,
    Bookmark,
    AlertCircle,
    Search,
    FolderPlus,
    ChevronDown,
    ChevronUp,
    Eye,
    Loader2,
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import EmptyState from '../components/common/EmptyState';
import {
    AccordionGroupSkeleton,
    TableRowsSkeleton,
} from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { formatTitle, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

const TAB_CONFIG = {
    CATEGORIES: { singular: 'Category', plural: 'Categories', icon: Bookmark },
    SUBCATEGORIES: { singular: 'Subcategory', plural: 'Subcategories', icon: Layers },
    DEPARTMENTS: { singular: 'Department', plural: 'Departments', icon: Building2 },
    PROGRAMMES: { singular: 'Programme', plural: 'Programmes', icon: BookOpen },
    BRANCHES: { singular: 'Branch', plural: 'Branches', icon: GitBranch },
};

export default function GovernanceManagement() {
    const { showSuccess, showError } = useToast();
    const [tab, setTab] = useState('CATEGORIES');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [departments, setDepartments] = useState([]);
    const [programmes, setProgrammes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [allFaculties, setAllFaculties] = useState([]);

    const [expandedGroups, setExpandedGroups] = useState({});

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({});

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);
    const [viewingType, setViewingType] = useState('CATEGORIES');
    const [viewLoading, setViewLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            if (tab === 'DEPARTMENTS') {
                const res = await api.get('/department?populate=true');
                const list = res.data?.departments || res.data || [];
                setItems(Array.isArray(list) ? list : []);
            } else if (tab === 'PROGRAMMES') {
                const res = await api.get('/programme');
                const list = res.data?.programmes || res.data || [];
                setItems(Array.isArray(list) ? list : []);
            } else if (tab === 'BRANCHES') {
                const res = await api.get('/branch?populate=true');
                const list = res.data?.branches || res.data || [];
                setItems(Array.isArray(list) ? list : []);
            } else if (tab === 'CATEGORIES') {
                const res = await api.get('/complain/category');
                const list = res.data?.categories || res.data || [];
                setItems(Array.isArray(list) ? list : []);
            } else if (tab === 'SUBCATEGORIES') {
                const [subRes, catRes] = await Promise.all([
                    api.get('/complain/subcategory'),
                    api.get('/complain/category'),
                ]);
                const subData = subRes.data?.subcategories || subRes.data || [];
                const catData = catRes.data?.categories || catRes.data || [];
                setItems(Array.isArray(subData) ? subData : []);
                setCategories(Array.isArray(catData) ? catData : []);

                const initialExpandState = {};
                (Array.isArray(catData) ? catData : []).forEach((c) => {
                    const id = c.id || c.custom_id || c._id;
                    initialExpandState[id] = true;
                });
                setExpandedGroups(initialExpandState);
            }
        } catch (err) {
            console.error('Failed to load governance records:', err);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        api.get('/department')
            .then((r) => setDepartments(r.data?.departments || r.data || []))
            .catch(() => {});

        api.get('/programme')
            .then((r) => setProgrammes(r.data?.programmes || r.data || []))
            .catch(() => {});

        api.get('/complain/category')
            .then((r) => setCategories(r.data?.categories || r.data || []))
            .catch(() => {});

        api.get('/user?role=faculty&limit=0')
            .then((r) => {
                const list = r.data?.users || r.data || [];
                setAllFaculties(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                api.get('/complain/form-options')
                    .then((fo) => {
                        const officers = fo.data?.data?.all_officers || fo.data?.all_officers || [];
                        setAllFaculties(officers);
                    })
                    .catch(() => {});
            });
    }, []);

    const departmentFaculties = useMemo(() => {
        if (tab !== 'DEPARTMENTS') return [];

        const deptId = String(editingItem?.id || editingItem?.custom_id || editingItem?._id || '');
        const deptCode = String(editingItem?.department_code || formData.department_code || '');
        const targetIds = [deptId, deptCode].filter(Boolean);

        if (!targetIds.length) return [];

        return allFaculties.filter((f) => {
            const fDept = String(
                f.department_id?._id ||
                f.department_id?.custom_id ||
                f.department_id ||
                f.department ||
                ''
            );
            return targetIds.includes(fDept);
        });
    }, [tab, editingItem, formData.department_code, allFaculties]);

    const groupedSubcategories = useMemo(() => {
        if (tab !== 'SUBCATEGORIES') return [];

        const query = searchQuery.toLowerCase().trim();
        const map = new Map();

        categories.forEach((cat) => {
            const catId = cat.id || cat.custom_id || cat._id;
            map.set(catId, {
                category: cat,
                subcategories: [],
            });
        });

        items.forEach((sub) => {
            const parentId = sub.category_id;
            if (map.has(parentId)) {
                map.get(parentId).subcategories.push(sub);
            } else {
                map.set(parentId || 'unassigned', {
                    category: {
                        id: parentId,
                        title: sub.category?.title || 'Unassigned Category',
                        default_priority: 'MEDIUM',
                    },
                    subcategories: [sub],
                });
            }
        });

        return Array.from(map.values())
            .map((group) => {
                const filteredSubs = group.subcategories.filter(
                    (s) =>
                        s.title?.toLowerCase().includes(query) ||
                        s.description?.toLowerCase().includes(query) ||
                        s.target_audience?.toLowerCase().includes(query) ||
                        group.category.title?.toLowerCase().includes(query)
                );
                return {
                    ...group,
                    subcategories: filteredSubs,
                };
            })
            .filter((group) => group.subcategories.length > 0 || group.category.title?.toLowerCase().includes(query));
    }, [tab, items, categories, searchQuery]);

    const filteredFlatItems = useMemo(() => {
        if (tab === 'SUBCATEGORIES') return [];
        const query = searchQuery.toLowerCase().trim();
        if (!query) return items;

        return items.filter((it) => {
            const name = it.department_name || it.programme_name || it.branch_name || it.title || '';
            const code = it.department_code || it.programme_code || it.branch_code || '';
            return name.toLowerCase().includes(query) || code.toLowerCase().includes(query);
        });
    }, [tab, items, searchQuery]);

    const toggleGroup = (categoryId) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    const toggleAllGroups = (expand) => {
        const nextState = {};
        categories.forEach((c) => {
            const id = c.id || c.custom_id || c._id;
            nextState[id] = expand;
        });
        setExpandedGroups(nextState);
    };

    const handleViewItem = async (item, itemType) => {
        setViewingType(itemType);
        setViewingItem(item);
        setIsViewModalOpen(true);

        const itemId = item.id || item.custom_id || item._id;

        let needsFetch = false;
        let endpoint = '';

        if (itemType === 'DEPARTMENTS') {
            if (!item.department_head && item.department_head_id) {
                needsFetch = true;
                endpoint = `/department/${itemId}`;
            }
        } else if (itemType === 'BRANCHES') {
            if (
                typeof item.department === 'string' ||
                typeof item.programme === 'string' ||
                (!item.department && item.department_id)
            ) {
                needsFetch = true;
                endpoint = `/branch/${itemId}`;
            }
        } else if (itemType === 'CATEGORIES') {
            if (!item.subcategories && !item.description) {
                needsFetch = true;
                endpoint = `/complain/category/${itemId}`;
            }
        } else if (itemType === 'SUBCATEGORIES') {
            if (!item.category && item.category_id && !categories.find((c) => (c.id || c._id) === item.category_id)) {
                needsFetch = true;
                endpoint = `/complain/subcategory/${itemId}`;
            }
        } else if (itemType === 'PROGRAMMES') {
            if (!item.duration_year && !item.total_semester) {
                needsFetch = true;
                endpoint = `/programme/${itemId}`;
            }
        }

        if (needsFetch && endpoint) {
            try {
                setViewLoading(true);
                const res = await api.get(endpoint);
                const fetched =
                    res.data?.data ||
                    res.data?.department ||
                    res.data?.category ||
                    res.data?.subcategory ||
                    res.data?.programme ||
                    res.data?.branch ||
                    res.data;
                if (fetched && typeof fetched === 'object') {
                    setViewingItem((prev) => ({ ...prev, ...fetched }));
                }
            } catch (err) {
                console.error('Failed to fetch item details:', err);
            } finally {
                setViewLoading(false);
            }
        }
    };

    const handleOpenCreate = (preselectedCategoryId = null) => {
        setEditingItem(null);
        setFormData({
            status: 'active',
            default_priority: 'MEDIUM',
            target_audience: 'all',
            department_head_id: '',
            category_id: preselectedCategoryId || (categories[0]?.id || categories[0]?._id || ''),
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            ...item,
            department_head_id:
                item.department_head_id ||
                item.department_head?._id ||
                item.department_head?.id ||
                item.department_head?.custom_id ||
                '',
            category_id: item.category_id || item.category?._id || item.category?.id || '',
            target_audience: item.target_audience || 'all',
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const isEdit = Boolean(editingItem);
        const singularName = TAB_CONFIG[tab]?.singular || 'Item';

        try {
            const itemId = editingItem?.id || editingItem?.custom_id || editingItem?._id;
            const payload = { ...formData };

            if (tab === 'DEPARTMENTS') {
                payload.department_head_id = payload.department_head_id || null;
                if (isEdit) await api.patch(`/department/${itemId}`, payload);
                else await api.post('/department', payload);

                api.get('/department')
                    .then((r) => setDepartments(r.data?.departments || r.data || []))
                    .catch(() => {});
            } else if (tab === 'PROGRAMMES') {
                if (isEdit) await api.patch(`/programme/${itemId}`, payload);
                else await api.post('/programme', payload);

                api.get('/programme')
                    .then((r) => setProgrammes(r.data?.programmes || r.data || []))
                    .catch(() => {});
            } else if (tab === 'BRANCHES') {
                if (isEdit) await api.patch(`/branch/${itemId}`, payload);
                else await api.post('/branch', payload);
            } else if (tab === 'CATEGORIES') {
                const { target_audience, ...categoryPayload } = payload;
                if (isEdit) await api.patch(`/complain/category/${itemId}`, categoryPayload);
                else await api.post('/complain/category', categoryPayload);

                api.get('/complain/category')
                    .then((r) => setCategories(r.data?.categories || r.data || []))
                    .catch(() => {});
            } else if (tab === 'SUBCATEGORIES') {
                if (isEdit) {
                    const { category_id, ...updatePayload } = payload;
                    await api.patch(`/complain/subcategory/${itemId}`, updatePayload);
                } else {
                    await api.post('/complain/subcategory', payload);
                }
            }

            showSuccess(`${singularName} ${isEdit ? 'updated' : 'added'} successfully.`);
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            setError(err?.error || err?.response?.data?.message || err?.message || 'Unable to save changes.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (item) => {
        const itemId = item.id || item.custom_id || item._id;
        const itemTitle = item.department_name || item.programme_name || item.branch_name || item.title;
        const singularName = TAB_CONFIG[tab]?.singular || 'Item';

        if (!window.confirm(`Are you sure you want to delete "${itemTitle}"? Any linked items will also be updated or removed.`)) {
            return;
        }

        try {
            if (tab === 'DEPARTMENTS') await api.delete(`/department/${itemId}`);
            else if (tab === 'PROGRAMMES') await api.delete(`/programme/${itemId}`);
            else if (tab === 'BRANCHES') await api.delete(`/branch/${itemId}`);
            else if (tab === 'CATEGORIES') await api.delete(`/complain/category/${itemId}`);
            else if (tab === 'SUBCATEGORIES') await api.delete(`/complain/subcategory/${itemId}`);

            showSuccess(`"${itemTitle}" was deleted successfully.`);
            loadData();
        } catch (err) {
            showError(err?.error || err?.response?.data?.message || err?.message || `Unable to delete ${singularName.toLowerCase()}.`);
        }
    };

    const currentConfig = TAB_CONFIG[tab] || TAB_CONFIG.CATEGORIES;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton fallback="/admin/dashboard" />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            Administration
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            Organization Settings
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Manage departments, degree programmes, branches, and complaint categories.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => handleOpenCreate()}
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/25 transition-all self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add {currentConfig.singular}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section</span>
                        <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                        {currentConfig.plural}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Active category view</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Items</span>
                        <Bookmark className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {items.length}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Total recorded</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Showing</span>
                        <Eye className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {tab === 'SUBCATEGORIES'
                            ? groupedSubcategories.reduce((acc, g) => acc + g.subcategories.length, 0)
                            : filteredFlatItems.length}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Matches your search</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-center gap-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Summary</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {departments.length} Depts • {categories.length} Categories
                    </span>
                    <p className="text-[10px] text-slate-400">Campus structure</p>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
                {Object.entries(TAB_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setTab(key);
                                setSearchQuery('');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                                tab === key
                                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{config.plural}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="glass px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:max-w-md">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${currentConfig.plural.toLowerCase()}...`}
                            className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                </div>

                {tab === 'SUBCATEGORIES' && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            type="button"
                            onClick={() => toggleAllGroups(true)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Expand All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                            type="button"
                            onClick={() => toggleAllGroups(false)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Collapse All
                        </button>
                    </div>
                )}
            </div>

            {tab === 'SUBCATEGORIES' ? (
                loading ? (
                    <AccordionGroupSkeleton count={4} />
                ) : groupedSubcategories.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No Subcategories Found"
                        description="No subcategories match your search. You can add new subcategories under any category."
                        actionLabel="Add Subcategory"
                        onAction={() => handleOpenCreate()}
                    />
                ) : (
                    <div className="space-y-4">
                        {groupedSubcategories.map((group) => {
                            const catId = group.category.id || group.category.custom_id || group.category._id;
                            const isExpanded = expandedGroups[catId] ?? true;
                            const subCount = group.subcategories.length;

                            return (
                                <div
                                    key={catId || group.category.title}
                                    className="glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                                >
                                    <div
                                        onClick={() => toggleGroup(catId)}
                                        className="p-3.5 sm:p-4 bg-slate-100/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/90 dark:hover:bg-slate-900/90 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                                                <Bookmark className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {formatTitle(group.category.title)}
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        {subCount} {subCount === 1 ? 'subcategory' : 'subcategories'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenCreate(catId);
                                                }}
                                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 flex items-center gap-1 shadow-sm"
                                            >
                                                <FolderPlus className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Add</span>
                                            </button>

                                            <div className="p-1 rounded text-slate-400">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-200/60 dark:border-slate-800/60">
                                            {subCount === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-400 italic">
                                                    No subcategories added under this category yet.
                                                </div>
                                            ) : (
                                                <div className="max-h-72 overflow-y-auto pr-1">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider z-10">
                                                            <tr>
                                                                <th className="py-2 px-4">Subcategory Name</th>
                                                                <th className="py-2 px-4">Available To</th>
                                                                <th className="py-2 px-4">Description</th>
                                                                <th className="py-2 px-3">Priority</th>
                                                                <th className="py-2 px-3">Status</th>
                                                                <th className="py-2 px-4 text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                                                            {group.subcategories.map((sub) => (
                                                                <tr key={sub.id || sub.custom_id || sub._id} className="hover:bg-slate-500/5 transition-colors">
                                                                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                                        <span
                                                                            onClick={() => handleViewItem(sub, 'SUBCATEGORIES')}
                                                                            className="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                                        >
                                                                            {formatTitle(sub.title)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 whitespace-nowrap">
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                                                            {formatTitle(sub.target_audience || 'All')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                                                        {sub.description || 'No description provided.'}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                                        <PriorityBadge priority={sub.default_priority} />
                                                                    </td>
                                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                                        <StatusBadge status={sub.status} />
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleViewItem(sub, 'SUBCATEGORIES')}
                                                                                className="p-1 rounded-md text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                                title="View Details"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenEdit(sub)}
                                                                                className="p-1 rounded-md text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDelete(sub)}
                                                                                className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                <tr>
                                    {tab === 'CATEGORIES' && (
                                        <>
                                            <th className="py-3 px-4">Category Name</th>
                                            <th className="py-3 px-4">Description</th>
                                            <th className="py-3 px-4">Priority</th>
                                            <th className="py-3 px-4">Status</th>
                                        </>
                                    )}
                                    {tab === 'DEPARTMENTS' && (
                                        <>
                                            <th className="py-3 px-4">Department Name</th>
                                            <th className="py-3 px-4">Code</th>
                                            <th className="py-3 px-4">Department Head (HOD)</th>
                                            <th className="py-3 px-4">Status</th>
                                        </>
                                    )}
                                    {tab === 'PROGRAMMES' && (
                                        <>
                                            <th className="py-3 px-4">Programme Name</th>
                                            <th className="py-3 px-4">Code</th>
                                            <th className="py-3 px-4">Duration & Semesters</th>
                                            <th className="py-3 px-4">Status</th>
                                        </>
                                    )}
                                    {tab === 'BRANCHES' && (
                                        <>
                                            <th className="py-3 px-4">Branch Name</th>
                                            <th className="py-3 px-4">Code</th>
                                            <th className="py-3 px-4">Department</th>
                                            <th className="py-3 px-4">Status</th>
                                        </>
                                    )}
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                {loading ? (
                                    <TableRowsSkeleton columns={5} rows={5} />
                                ) : filteredFlatItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                                            No items found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredFlatItems.map((it) => (
                                        <tr key={it.id || it.custom_id || it._id} className="hover:bg-slate-500/5 transition-colors">
                                            {tab === 'CATEGORIES' && (
                                                <>
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        <span
                                                            onClick={() => handleViewItem(it, 'CATEGORIES')}
                                                            className="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                        >
                                                            {formatTitle(it.title)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                                                        {it.description || 'No description provided.'}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <PriorityBadge priority={it.default_priority} />
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <StatusBadge status={it.status} />
                                                    </td>
                                                </>
                                            )}

                                            {tab === 'DEPARTMENTS' && (
                                                <>
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        <span
                                                            onClick={() => handleViewItem(it, 'DEPARTMENTS')}
                                                            className="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                        >
                                                            {formatTitle(it.department_name)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-500">{it.department_code}</td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {(() => {
                                                            if (it.department_head?.full_name) {
                                                                return formatTitle(it.department_head.full_name);
                                                            }
                                                            if (it.department_head_id) {
                                                                const found = allFaculties.find(
                                                                    (f) => String(f.id || f._id || f.custom_id) === String(it.department_head_id)
                                                                );
                                                                if (found) return formatTitle(found.full_name || found.name);
                                                            }
                                                            return <span className="text-slate-400 italic">Not assigned</span>;
                                                        })()}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <StatusBadge status={it.status} />
                                                    </td>
                                                </>
                                            )}

                                            {tab === 'PROGRAMMES' && (
                                                <>
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        <span
                                                            onClick={() => handleViewItem(it, 'PROGRAMMES')}
                                                            className="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                        >
                                                            {formatTitle(it.programme_name)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-500">{it.programme_code}</td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {it.duration_year} Years ({it.total_semester} Semesters)
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <StatusBadge status={it.status} />
                                                    </td>
                                                </>
                                            )}

                                            {tab === 'BRANCHES' && (
                                                <>
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        <span
                                                            onClick={() => handleViewItem(it, 'BRANCHES')}
                                                            className="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                        >
                                                            {formatTitle(it.branch_name)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-500">{it.branch_code}</td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {it.department?.department_name ? formatTitle(it.department.department_name) : 'Not assigned'}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <StatusBadge status={it.status} />
                                                    </td>
                                                </>
                                            )}

                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewItem(it, tab)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(it)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(it)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setViewingItem(null);
                }}
                title={viewingItem ? `${TAB_CONFIG[viewingType]?.singular || 'Record'} Details` : 'Details'}
                subtitle={
                    viewingItem
                        ? formatTitle(
                              viewingItem.title ||
                              viewingItem.department_name ||
                              viewingItem.programme_name ||
                              viewingItem.branch_name ||
                              ''
                          )
                        : ''
                }
            >
                {viewLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        <span className="text-xs text-slate-400">Loading details...</span>
                    </div>
                ) : viewingItem ? (
                    <div className="space-y-4 text-xs">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    {viewingItem.default_priority && (
                                        <PriorityBadge priority={viewingItem.default_priority} />
                                    )}
                                    <StatusBadge status={viewingItem.status || 'active'} />
                                    {viewingItem.target_audience && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                            {formatTitle(viewingItem.target_audience)}
                                        </span>
                                    )}
                                </div>
                                {(viewingItem.department_code || viewingItem.programme_code || viewingItem.branch_code) && (
                                    <span className="font-mono text-xs font-bold text-brand-600 bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">
                                        {viewingItem.department_code || viewingItem.programme_code || viewingItem.branch_code}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300">
                                {viewingType === 'DEPARTMENTS' && (
                                    <>
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Department Name
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {formatTitle(viewingItem.department_name)}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Head of Department (HOD)
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {(() => {
                                                    if (viewingItem.department_head?.full_name) {
                                                        return formatTitle(viewingItem.department_head.full_name);
                                                    }
                                                    if (viewingItem.department_head_id) {
                                                        const found = allFaculties.find(
                                                            (f) => String(f.id || f._id || f.custom_id) === String(viewingItem.department_head_id)
                                                        );
                                                        if (found) return formatTitle(found.full_name || found.name);
                                                    }
                                                    return <span className="text-slate-400 italic">Not Assigned</span>;
                                                })()}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Registered Faculties
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {allFaculties.filter((f) => {
                                                    const fDept = String(
                                                        f.department_id?._id ||
                                                        f.department_id?.custom_id ||
                                                        f.department_id ||
                                                        f.department ||
                                                        ''
                                                    );
                                                    const deptId = String(viewingItem.id || viewingItem._id || viewingItem.custom_id || '');
                                                    const deptCode = String(viewingItem.department_code || '');
                                                    return fDept === deptId || fDept === deptCode;
                                                }).length} Active Members
                                            </span>
                                        </div>
                                    </>
                                )}

                                {viewingType === 'PROGRAMMES' && (
                                    <>
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Programme Name
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {formatTitle(viewingItem.programme_name)}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Academic Structure
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {viewingItem.duration_year} Years ({viewingItem.total_semester} Semesters)
                                            </span>
                                        </div>
                                    </>
                                )}

                                {viewingType === 'BRANCHES' && (
                                    <>
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Branch Name
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {formatTitle(viewingItem.branch_name)}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Parent Department
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {formatTitle(
                                                    viewingItem.department?.department_name ||
                                                    departments.find((d) => (d.id || d._id) === (viewingItem.department_id || viewingItem.department))?.department_name ||
                                                    'Not Assigned'
                                                )}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Associated Programme
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {formatTitle(
                                                    viewingItem.programme?.programme_name ||
                                                    programmes.find((p) => (p.id || p._id) === (viewingItem.programme_id || viewingItem.programme))?.programme_name ||
                                                    'Not Specified'
                                                )}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {viewingType === 'SUBCATEGORIES' && (
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                            Parent Category
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {formatTitle(
                                                viewingItem.category?.title ||
                                                categories.find((c) => (c.id || c._id || c.custom_id) === (viewingItem.category_id || viewingItem.category))?.title ||
                                                'Unassigned'
                                            )}
                                        </span>
                                    </div>
                                )}

                                {viewingItem.createdAt && (
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                            Recorded On
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                            {formatDate(viewingItem.createdAt)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {viewingItem.description && (
                                <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                    <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                        Description / Scope
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {viewingItem.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {viewingType === 'CATEGORIES' && (
                            <div className="space-y-2 pt-1">
                                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">
                                    Linked Subcategories
                                </span>
                                {(() => {
                                    const catId = viewingItem.id || viewingItem.custom_id || viewingItem._id;
                                    const linkedSubs = items.filter(
                                        (sub) => sub.category_id === catId || (sub.category && (sub.category.id || sub.category._id) === catId)
                                    );

                                    if (linkedSubs.length === 0) {
                                        return (
                                            <p className="p-3 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                                No subcategories currently registered under this category.
                                            </p>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                            {linkedSubs.map((s) => (
                                                <div
                                                    key={s.id || s.custom_id || s._id}
                                                    onClick={() => handleViewItem(s, 'SUBCATEGORIES')}
                                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-brand-500 transition-colors flex items-center justify-between"
                                                >
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                        {formatTitle(s.title)}
                                                    </span>
                                                    <PriorityBadge priority={s.default_priority} />
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsViewModalOpen(false);
                                    setViewingItem(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = viewingItem;
                                    setIsViewModalOpen(false);
                                    setViewingItem(null);
                                    handleOpenEdit(current);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-md transition-all"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit Record</span>
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${editingItem ? 'Edit' : 'Add'} ${currentConfig.singular}`}
                subtitle="Enter the details below and save your changes."
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs border border-rose-500/20 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {tab === 'SUBCATEGORIES' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Parent Category {editingItem && <span className="text-slate-500 font-normal">(Cannot be changed)</span>}
                                </label>
                                <select
                                    required
                                    disabled={Boolean(editingItem)}
                                    value={formData.category_id || ''}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60"
                                >
                                    <option value="">Select category</option>
                                    {categories.map((c) => (
                                        <option key={c.id || c.custom_id || c._id} value={c.id || c.custom_id || c._id}>
                                            {formatTitle(c.title)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Subcategory Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
                                    placeholder="e.g. RESULT DELAY"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Available To
                                </label>
                                <select
                                    value={formData.target_audience || 'all'}
                                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                    <option value="all">All Users (Students & Faculty)</option>
                                    <option value="student">Students Only</option>
                                    <option value="faculty">Faculty Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={formData.default_priority || 'MEDIUM'}
                                    onChange={(e) => setFormData({ ...formData, default_priority: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add a brief description of what this subcategory covers..."
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </>
                    )}

                    {tab === 'CATEGORIES' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
                                    placeholder="e.g. EXAMINATION & EVALUATION"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={formData.default_priority || 'MEDIUM'}
                                    onChange={(e) => setFormData({ ...formData, default_priority: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add a brief description of this category..."
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </>
                    )}

                    {tab === 'DEPARTMENTS' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Department Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={Boolean(editingItem)}
                                    value={formData.department_code || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            department_code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="e.g. CSE"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Department Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.department_name || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            department_name: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="e.g. COMPUTER SCIENCE AND ENGINEERING"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Head of Department (HOD)
                                </label>
                                <select
                                    value={formData.department_head_id || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            department_head_id: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                    <option value="">No Head Assigned (None)</option>
                                    {departmentFaculties.map((fac) => {
                                        const facId = fac.id || fac._id || fac.custom_id;
                                        return (
                                            <option key={facId} value={facId}>
                                                {formatTitle(fac.full_name || fac.name)} {fac.designation ? `(${formatTitle(fac.designation)})` : ''} - {fac.email}
                                            </option>
                                        );
                                    })}
                                </select>
                                {editingItem && departmentFaculties.length === 0 && (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                        No active faculty members are currently registered under this department. Register or assign faculty to this department in the User Directory first.
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'PROGRAMMES' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Programme Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={Boolean(editingItem)}
                                    value={formData.programme_code || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            programme_code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="e.g. BTECH"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Programme Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.programme_name || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            programme_name: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="e.g. BACHELOR OF TECHNOLOGY"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Duration (Years)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={10}
                                        value={formData.duration_year || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                duration_year: Number(e.target.value),
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Total Semesters
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={20}
                                        value={formData.total_semester || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                total_semester: Number(e.target.value),
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'BRANCHES' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Branch Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={Boolean(editingItem)}
                                    value={formData.branch_code || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            branch_code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="e.g. CS"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Branch Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.branch_name || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            branch_name: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="e.g. COMPUTER SCIENCE"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Department
                                    </label>
                                    <select
                                        required
                                        value={formData.department_id || ''}
                                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    >
                                        <option value="">Select department</option>
                                        {departments.map((d) => (
                                            <option key={d.id || d.custom_id || d._id} value={d.id || d.custom_id || d._id}>
                                                {formatTitle(d.department_name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Programme
                                    </label>
                                    <select
                                        required
                                        value={formData.programme_id || ''}
                                        onChange={(e) => setFormData({ ...formData, programme_id: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    >
                                        <option value="">Select programme</option>
                                        {programmes.map((p) => (
                                            <option key={p.id || p.custom_id || p._id} value={p.id || p.custom_id || p._id}>
                                                {formatTitle(p.programme_name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Status
                        </label>
                        <select
                            value={formData.status || 'active'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/25 flex items-center gap-1.5 transition-all"
                        >
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}