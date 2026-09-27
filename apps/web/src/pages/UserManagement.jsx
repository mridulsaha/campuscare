import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    Edit2,
    Trash2,
    AlertCircle,
    Users,
    Eye,
    UserCheck,
    ShieldAlert,
    FileText,
    Loader2
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import Modal from '../components/common/Modal';
import LoadMoreButton from '../components/common/LoadMoreButton';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';
import ComplaintTimelineModal from '../components/complaint/ComplaintTimelineModal';
import { TableRowsSkeleton } from '../components/common/LoadingSkeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTitle, formatRole, formatDate } from '../utils/formatters';

const COMPLAINTS_PAGE_SIZE = 5;

export default function UserManagement() {
    const { user, isAdmin, isHod, isLeadership } = useAuth();
    const { showSuccess, showError } = useToast();

    const [users, setUsers] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const userDeptId = useMemo(() => {
        if (!user) return '';
        return (
            user.department_id?._id ||
            user.department_id?.custom_id ||
            user.department_id ||
            user.department?._id ||
            user.department ||
            ''
        ).toString();
    }, [user]);

    const [departmentFilter, setDepartmentFilter] = useState(
        isHod && !isAdmin && userDeptId ? userDeptId : ''
    );
    const [branchFilter, setBranchFilter] = useState('');
    const [admissionYearFilter, setAdmissionYearFilter] = useState('');

    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);

    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        full_name: '',
        role: '',
        branch_id: '',
        designation: '',
        department_id: '',
        status: '',
        admission_year: '',
    });
    const [updating, setUpdating] = useState(false);
    const [modalError, setModalError] = useState('');

    const [deletingUser, setDeletingUser] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [viewingUser, setViewingUser] = useState(null);
    const [detailedUser, setDetailedUser] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [userComplaints, setUserComplaints] = useState([]);
    const [userComplaintsMeta, setUserComplaintsMeta] = useState({ page: 1, total_pages: 1, total: 0 });
    const [loadingUserComplaints, setLoadingUserComplaints] = useState(false);

    const [selectedComplaintId, setSelectedComplaintId] = useState(null);

    useEffect(() => {
        if (isHod && !isAdmin && userDeptId) {
            setDepartmentFilter(userDeptId);
        }
    }, [isHod, isAdmin, userDeptId]);

    const fetchUsers = useCallback(
        async (page = 1, append = false) => {
            try {
                setLoading(true);
                const activeDept = isHod && !isAdmin && userDeptId ? userDeptId : departmentFilter;

                const params = new URLSearchParams({
                    page: String(page),
                    limit: '15',
                    populate: 'true',
                });

                if (roleFilter) params.append('role', roleFilter);
                if (statusFilter) params.append('status', statusFilter);
                if (activeDept) params.append('department_id', activeDept);
                if (branchFilter) params.append('branch_id', branchFilter);
                if (admissionYearFilter) params.append('admission_year', admissionYearFilter);

                const res = await api.get(`/user?${params.toString()}`);
                const userList = res.data?.users || res.data || res.users || [];
                const safeList = Array.isArray(userList) ? userList : [];

                if (append) {
                    setUsers((prev) => [...prev, ...safeList]);
                } else {
                    setUsers(safeList);
                }
                setMeta(res.data?.meta || res.meta || { page, total: safeList.length, total_pages: 1 });
            } catch (err) {
                console.error('Failed to load users:', err);
            } finally {
                setLoading(false);
            }
        },
        [roleFilter, statusFilter, admissionYearFilter, branchFilter, departmentFilter, isHod, isAdmin, userDeptId]
    );

    useEffect(() => {
        fetchUsers(1, false);
        Promise.all([api.get('/department'), api.get('/branch')]).then(([deptRes, branchRes]) => {
            const depts = deptRes.data?.departments || deptRes.data || [];
            const brns = branchRes.data?.branches || branchRes.data || [];
            setDepartments(Array.isArray(depts) ? depts : []);
            setBranches(Array.isArray(brns) ? brns : []);
        });
    }, [fetchUsers]);

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.full_name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                u.enrollment_number?.toLowerCase().includes(q)
        );
    }, [users, search]);

    const studentCount = useMemo(() => users.filter((u) => u.role === 'student').length, [users]);
    const facultyCount = useMemo(() => users.filter((u) => u.role === 'faculty').length, [users]);
    const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);

    const availableBranches = useMemo(() => {
        if (isHod && !isAdmin && userDeptId) {
            return branches.filter((b) => {
                const bDeptId = (b.department_id?._id || b.department_id?.custom_id || b.department_id || '').toString();
                return bDeptId === userDeptId;
            });
        }
        return branches;
    }, [branches, isHod, isAdmin, userDeptId]);

    const canEditUser = useCallback(
        (target) => {
            if (isAdmin) return true;
            const targetRole = (target.role || '').toLowerCase();
            if (targetRole === 'admin') return false;

            const targetDesig = String(target.designation || '').toLowerCase().trim();
            const isTargetTopMgmt = ['director', 'vice_chancellor', 'pro_vice_chancellor', 'dean'].includes(targetDesig);
            if (isTargetTopMgmt) return false;

            const targetDept = (
                target.department_id?._id ||
                target.department_id?.custom_id ||
                target.department_id ||
                target.department?._id ||
                target.department ||
                ''
            ).toString();

            if (isHod) {
                const isTargetHod = targetDesig === 'hod';
                const isSelf = (target.id || target._id || target.custom_id) === (user?.id || user?._id || user?.custom_id);
                if (isTargetHod && !isSelf) return false;
                return targetDept === userDeptId;
            }

            if (isLeadership) return true;
            return false;
        },
        [isAdmin, isHod, isLeadership, user, userDeptId]
    );

    const fetchUserComplaints = async (targetId, page = 1, append = false) => {
        if (!targetId) return;
        try {
            setLoadingUserComplaints(true);
            const res = await api.get(
                `/complain/user?user_id=${targetId}&page=${page}&limit=${COMPLAINTS_PAGE_SIZE}&populate=true`
            );
            const list = res.data?.data || res.data?.complains || res.data || [];
            const safeList = Array.isArray(list) ? list : [];
            const metaInfo = res.data?.meta || { page, total_pages: 1, total: safeList.length };

            if (append) {
                setUserComplaints((prev) => [...prev, ...safeList]);
            } else {
                setUserComplaints(safeList);
            }
            setUserComplaintsMeta(metaInfo);
        } catch {
            if (!append) setUserComplaints([]);
        } finally {
            setLoadingUserComplaints(false);
        }
    };

    const handleOpenViewUser = async (targetUser) => {
        const targetId = targetUser.id || targetUser.custom_id || targetUser._id;
        setViewingUser(targetUser);
        setDetailedUser(null);
        setUserComplaints([]);
        setUserComplaintsMeta({ page: 1, total_pages: 1, total: 0 });
        setLoadingDetails(true);

        try {
            const [userRes] = await Promise.all([
                api.get(`/user/${targetId}?populate=true`),
                fetchUserComplaints(targetId, 1, false),
            ]);
            setDetailedUser(userRes.data?.data || userRes.data || targetUser);
        } catch {
            setDetailedUser(targetUser);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleOpenEdit = (targetUser) => {
        setEditingUser(targetUser);
        setEditForm({
            full_name: targetUser.full_name || '',
            role: targetUser.role || 'student',
            branch_id: targetUser.branch_id || targetUser.branch?._id || '',
            designation: targetUser.role === 'student' ? '' : targetUser.designation || '',
            department_id: targetUser.department_id || targetUser.department?._id || '',
            status: targetUser.status || 'active',
            admission_year: targetUser.admission_year || '',
        });
        setModalError('');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setModalError('');
        setUpdating(true);

        const targetId = editingUser.id || editingUser.custom_id || editingUser._id;

        try {
            const payload = {
                full_name: editForm.full_name,
                status: editForm.status,
            };

            if (isAdmin) {
                payload.role = editForm.role;
            }

            if (editForm.role === 'student') {
                payload.branch_id = editForm.branch_id;
                payload.designation = null;
                if (editForm.admission_year) {
                    payload.admission_year = Number(editForm.admission_year);
                }
            } else {
                payload.department_id = isHod && !isAdmin ? userDeptId : editForm.department_id;
                payload.designation = editForm.designation || '';
            }

            await api.patch(`/user/${targetId}`, payload);
            showSuccess(`Profile for "${editForm.full_name}" updated successfully.`);
            setEditingUser(null);
            fetchUsers(1, false);
        } catch (err) {
            setModalError(err.error || err.response?.data?.message || err.message || 'Unable to update profile.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        setDeleting(true);
        const targetId = deletingUser.id || deletingUser.custom_id || deletingUser._id;
        const targetName = deletingUser.full_name;

        try {
            await api.delete(`/user/${targetId}`);
            showSuccess(`User account for "${targetName}" deleted.`);
            setDeletingUser(null);
            fetchUsers(1, false);
        } catch (err) {
            showError(err.error || err.response?.data?.message || err.message || 'Unable to delete user.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            {isAdmin ? 'System Administration' : isHod ? 'Department Administration' : 'Executive Management'}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            User Directory
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isHod && !isAdmin
                                ? 'Directory of student and faculty accounts registered in your department.'
                                : 'Manage campus user accounts, roles, and departmental assignments.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Users</span>
                        <Users className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {meta.total}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {isHod && !isAdmin ? 'In your department' : 'Across institution'}
                    </p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Showing</span>
                        <Eye className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {users.length} <span className="text-xs text-slate-400 font-semibold">/ {meta.total}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Loaded on this page</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search Matches</span>
                        <UserCheck className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {filteredUsers.length}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Matching current query</p>
                </div>

                <div className="glass p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-center gap-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role Breakdown</span>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="text-brand-600 dark:text-brand-400">Students: {studentCount}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Faculty: {facultyCount}</span>
                        <span>•</span>
                        <span className="text-purple-600 dark:text-purple-400">Admin: {adminCount}</span>
                    </div>
                </div>
            </div>

            <div className="glass p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or enrollment..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Administrators</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                <select
                    disabled={isHod && !isAdmin}
                    value={isHod && !isAdmin ? userDeptId : departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60"
                >
                    {isAdmin || isLeadership ? <option value="">All Departments</option> : null}
                    {departments.map((d) => (
                        <option key={d.id || d._id || d.custom_id} value={`${d.id || d._id || d.custom_id}`}>
                            {formatTitle(d.department_name)}
                        </option>
                    ))}
                </select>

                <select
                    hidden={!(roleFilter && roleFilter === 'student')}
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                    <option value="">All Branches</option>
                    {availableBranches.map((b) => (
                        <option key={b.id || b._id || b.custom_id} value={`${b.id || b._id || b.custom_id}`}>
                            {formatTitle(b.branch_name)}
                        </option>
                    ))}
                </select>

                <div hidden={!(roleFilter && roleFilter === 'student')} className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="number"
                        min="1990"
                        max="2050"
                        value={admissionYearFilter}
                        onChange={(e) => setAdmissionYearFilter(e.target.value)}
                        placeholder="Admission Year e.g. 2024"
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                            <tr>
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Role & Designation</th>
                                <th className="py-3 px-4">Branch / Dept</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                            {loading && users.length === 0 ? (
                                <TableRowsSkeleton columns={6} rows={6} />
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const editable = canEditUser(u);
                                    const canDelete =
                                        isAdmin ||
                                        (isHod && !isAdmin && editable && u.role !== 'admin');

                                    return (
                                        <tr key={u.id || u.custom_id || u._id} className="hover:bg-slate-500/5 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                <div
                                                    onClick={() => handleOpenViewUser(u)}
                                                    className="flex items-center gap-2.5 cursor-pointer group"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black text-xs uppercase shrink-0 group-hover:scale-105 transition-transform">
                                                        {u.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <span className="group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                        {formatTitle(u.full_name)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                                                {u.email}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {formatRole(u.role)}
                                                </div>
                                                {u.designation && (
                                                    <div className="text-[10px] text-slate-400">
                                                        {formatTitle(u.designation)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                {u.branch?.branch_name
                                                    ? formatTitle(u.branch.branch_name)
                                                    : u.department?.department_name
                                                    ? formatTitle(u.department.department_name)
                                                    : 'Not Assigned'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                        u.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                                    }`}
                                                >
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenViewUser(u)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="View Profile & Complaints"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenViewUser(u)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                                                        title="View User Complaints"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                    {editable && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEdit(u)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Edit User Profile"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingUser(u)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <LoadMoreButton
                loading={loading && users.length > 0}
                hasMore={meta.page < meta.total_pages}
                onClick={() => fetchUsers(meta.page + 1, true)}
            />

            <Modal
                isOpen={Boolean(viewingUser)}
                onClose={() => {
                    setViewingUser(null);
                    setDetailedUser(null);
                    setUserComplaints([]);
                }}
                title={detailedUser?.full_name ? formatTitle(detailedUser.full_name) : 'User Details'}
                subtitle={`${detailedUser?.email || viewingUser?.email || ''} • ${formatRole(detailedUser?.role || viewingUser?.role || '')}`}
            >
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                    {loadingDetails ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                            <span className="text-xs text-slate-400">Loading user profile...</span>
                        </div>
                    ) : detailedUser ? (
                        <>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                                            {formatRole(detailedUser.role)}
                                        </span>
                                        {detailedUser.designation && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                                {formatTitle(detailedUser.designation)}
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                            detailedUser.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                        }`}
                                    >
                                        {detailedUser.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                            Department
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {detailedUser.department?.department_name || detailedUser.department_id?.department_name
                                                ? formatTitle(detailedUser.department?.department_name || detailedUser.department_id?.department_name)
                                                : 'Not Assigned'}
                                        </span>
                                    </div>

                                    {detailedUser.role === 'student' && (
                                        <>
                                            <div>
                                                <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                    Branch
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {detailedUser.branch?.branch_name || detailedUser.branch_id?.branch_name
                                                        ? formatTitle(detailedUser.branch?.branch_name || detailedUser.branch_id?.branch_name)
                                                        : 'Not Assigned'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                    Enrollment Number
                                                </span>
                                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                    {detailedUser.enrollment_number || 'N/A'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                    Admission Year
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {detailedUser.admission_year || 'N/A'}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                            Profile Verification
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {detailedUser.is_profile_completed ? 'Completed' : 'Pending Completion'}
                                            {detailedUser.profile_locked ? ' (Locked)' : ''}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                            Member Since
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {formatDate(detailedUser.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-brand-500" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                            Grievances & Inquiries Filed ({userComplaintsMeta.total})
                                        </h4>
                                    </div>
                                </div>

                                {loadingUserComplaints && userComplaints.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                                        <span className="text-xs text-slate-400">Fetching filed complaints...</span>
                                    </div>
                                ) : userComplaints.length === 0 ? (
                                    <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs italic">
                                        No complaints have been submitted by this user yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {userComplaints.map((c) => {
                                            const cId = c.id || c.custom_id || c._id;
                                            return (
                                                <div
                                                    key={cId}
                                                    onClick={() => setSelectedComplaintId(cId)}
                                                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/50 bg-white/50 dark:bg-slate-900/40 cursor-pointer transition-all space-y-1.5 group"
                                                >
                                                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-[11px] bg-brand-500/10 px-2 py-0.5 rounded">
                                                                {c.ticket_number || c.custom_id}
                                                            </span>
                                                            <PriorityBadge priority={c.priority} />
                                                            <StatusBadge status={c.status} />
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {formatDate(c.createdAt)}
                                                        </span>
                                                    </div>

                                                    <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors line-clamp-1">
                                                        {c.title}
                                                    </h5>

                                                    <p className="text-[11px] text-slate-500 line-clamp-2">
                                                        {c.description}
                                                    </p>
                                                </div>
                                            );
                                        })}

                                        <LoadMoreButton
                                            loading={loadingUserComplaints}
                                            hasMore={userComplaintsMeta.page < userComplaintsMeta.total_pages}
                                            onClick={() => {
                                                const targetId = detailedUser?.id || detailedUser?.custom_id || detailedUser?._id;
                                                fetchUserComplaints(targetId, userComplaintsMeta.page + 1, true);
                                            }}
                                            className="py-2"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}

                    <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                setViewingUser(null);
                                setDetailedUser(null);
                                setUserComplaints([]);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={Boolean(editingUser)}
                onClose={() => setEditingUser(null)}
                title="Edit User Profile"
                subtitle={`${editingUser?.email} (${formatRole(editingUser?.role || '')})`}
            >
                <form onSubmit={handleSaveEdit} className="space-y-4">
                    {modalError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{modalError}</span>
                        </div>
                    )}

                    {!isAdmin && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                            <span>
                                Role modifications and institutional leadership elevations are restricted to System Administrators.
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Role
                        </label>
                        {isAdmin ? (
                            <select
                                value={editForm.role}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        role: e.target.value,
                                        designation: e.target.value === 'student' ? '' : editForm.designation,
                                    })
                                }
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                            >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty Member</option>
                                <option value="admin">Administrator</option>
                            </select>
                        ) : (
                            <div className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-between">
                                <span>{formatRole(editForm.role)}</span>
                                <span className="text-[10px] font-normal text-slate-400">Locked</span>
                            </div>
                        )}
                    </div>

                    {editForm.role === 'student' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Branch
                                </label>
                                <select
                                    required
                                    value={editForm.branch_id}
                                    onChange={(e) => setEditForm({ ...editForm, branch_id: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                >
                                    <option value="">Select branch</option>
                                    {availableBranches.map((b) => (
                                        <option key={b.id || b.custom_id || b._id} value={b.id || b.custom_id || b._id}>
                                            {formatTitle(b.branch_name)} ({b.branch_code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Admission Year
                                </label>
                                <input
                                    type="number"
                                    min="1990"
                                    max="2050"
                                    placeholder="e.g. 2024"
                                    value={editForm.admission_year}
                                    onChange={(e) => setEditForm({ ...editForm, admission_year: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                />
                            </div>
                        </>
                    )}

                    {editForm.role !== 'student' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Department
                            </label>
                            <select
                                disabled={isHod && !isAdmin}
                                value={isHod && !isAdmin ? userDeptId : editForm.department_id}
                                onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-60"
                            >
                                <option value="">Select department</option>
                                {departments.map((d) => (
                                    <option key={d.id || d.custom_id || d._id} value={d.id || d.custom_id || d._id}>
                                        {formatTitle(d.department_name)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {editForm.role !== 'student' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Designation
                            </label>
                            <select
                                value={editForm.designation}
                                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            >
                                <option value="">No designation</option>
                                <option value="assistant_professor">Assistant Professor</option>
                                <option value="associate_professor">Associate Professor</option>
                                <option value="professor">Professor</option>
                                <option value="adhoc_faculty">Adhoc Faculty</option>
                                {isAdmin && (
                                    <>
                                        <option value="hod">Head of Department (HOD)</option>
                                        <option value="dean">Dean</option>
                                        <option value="pro_vice_chancellor">Pro Vice Chancellor</option>
                                        <option value="vice_chancellor">Vice Chancellor</option>
                                        <option value="director">Director</option>
                                    </>
                                )}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Account Status
                        </label>
                        <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updating}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-md"
                        >
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(deletingUser)}
                onClose={() => setDeletingUser(null)}
                title="Delete User Account"
                subtitle="This action will permanently delete the user account and clean up dependencies."
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete <b className="text-slate-900 dark:text-white">{deletingUser?.full_name}</b> ({deletingUser?.email})?
                        All grievances assigned to or filed by this user will be handled according to institutional compliance policies.
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setDeletingUser(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteUser}
                            disabled={deleting}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md"
                        >
                            <span>Delete Account</span>
                        </button>
                    </div>
                </div>
            </Modal>

            <ComplaintTimelineModal
                isOpen={Boolean(selectedComplaintId)}
                onClose={() => setSelectedComplaintId(null)}
                complaintId={selectedComplaintId}
            />
        </div>
    );
}