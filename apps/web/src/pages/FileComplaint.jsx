import {useState, useEffect, useMemo} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {
    Upload,
    AlertCircle,
    Loader2,
    Shield,
    ShieldAlert,
    User,
    EyeOff,
    ArrowRight,
    ArrowLeft,
    Paperclip,
    Trash2,
    Check,
    FileCheck,
    Tag,
    FolderPlus,
} from 'lucide-react';
import BackButton from '../components/common/BackButton';
import PriorityBadge from '../components/common/PriorityBadge';
import api from '../services/api';
import {uploadToCloudinary} from '../utils/cloudinary';
import {formatTitle} from '../utils/formatters';
import {useAuth} from '../context/AuthContext';
import {useToast} from '../context/ToastContext';

const STEPS = [
    {id: 1, label: 'Type & Department'},
    {id: 2, label: 'Category'},
    {id: 3, label: 'Details & Attachments'},
    {id: 4, label: 'Review & Submit'},
];

export default function FileComplaint() {
    const {user, isAdmin} = useAuth();
    const {showSuccess, showError} = useToast();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);

    const [categories, setCategories] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allOfficers, setAllOfficers] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [isEmptyDatabase, setIsEmptyDatabase] = useState(false);

    const [ticketType, setTicketType] = useState('STATUTORY_GRIEVANCE');
    const [targetDepartmentId, setTargetDepartmentId] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        async function loadFormOptions() {
            try {
                setLoadingOptions(true);
                setError('');

                const res = await api.get('/complain/form-options');
                const payload = res?.data || res || {};

                let fetchedCategories = payload.categories || [];
                let fetchedDepartments = payload.departments || [];
                let fetchedOfficers = payload.all_officers || [];

                if (!fetchedCategories || fetchedCategories.length === 0) {
                    try {
                        const [catRes, subRes] = await Promise.all([
                            api.get('/complain/category'),
                            api.get('/complain/subcategory'),
                        ]);

                        const flatCategories = catRes?.data || catRes || [];
                        const flatSubcategories = subRes?.data?.subcategories || subRes?.data || subRes || [];

                        const userRole = (user?.role || '').toLowerCase();
                        const permittedAudiences = ['all'];
                        if (userRole === 'student') permittedAudiences.push('student');
                        else if (userRole === 'faculty') permittedAudiences.push('faculty');
                        else if (userRole === 'admin') permittedAudiences.push('student', 'faculty');

                        if (Array.isArray(flatCategories) && flatCategories.length > 0) {
                            fetchedCategories = flatCategories
                                .filter((c) => c.status === 'active')
                                .map((cat) => {
                                    const cId = String(cat.id || cat._id || cat.custom_id);
                                    const validSubs = (Array.isArray(flatSubcategories) ? flatSubcategories : [])
                                        .filter(
                                            (s) =>
                                                String(s.category_id) === cId &&
                                                s.status === 'active' &&
                                                permittedAudiences.includes((s.target_audience || 'all').toLowerCase())
                                        )
                                        .map((s) => ({
                                            id: String(s.id || s._id || s.custom_id),
                                            title: s.title,
                                            description: s.description,
                                            default_priority: s.default_priority,
                                            target_audience: s.target_audience || 'all',
                                        }));

                                    return {
                                        id: cId,
                                        title: cat.title,
                                        description: cat.description,
                                        default_priority: cat.default_priority,
                                        subcategories: validSubs,
                                    };
                                })
                                .filter((cat) => cat.subcategories.length > 0);
                        }
                    } catch (fallbackErr) {
                        console.warn('Direct category query fallback failed:', fallbackErr);
                    }
                }

                if (!fetchedOfficers || fetchedOfficers.length === 0) {
                    const flattened = fetchedDepartments.flatMap((d) => d.faculties || []);
                    const uniqueMap = new Map();
                    flattened.forEach((item) => {
                        const id = String(item.id || item._id || item.custom_id);
                        if (!uniqueMap.has(id)) {
                            uniqueMap.set(id, {
                                ...item,
                                department_id: item.department_id || null,
                            });
                        }
                    });
                    fetchedOfficers = Array.from(uniqueMap.values());
                }

                if (fetchedCategories.length === 0) {
                    setIsEmptyDatabase(true);
                } else {
                    setIsEmptyDatabase(false);
                }

                setCategories(fetchedCategories);
                setDepartments(fetchedDepartments);
                setAllOfficers(fetchedOfficers);
            } catch (err) {
                console.error('Failed to load form options:', err);
                setError(err?.error || 'Unable to load form options. Please refresh the page and try again.');
            } finally {
                setLoadingOptions(false);
            }
        }

        loadFormOptions();
    }, [user]);

    const selectedDepartment = useMemo(
        () => departments.find((d) => String(d.id || d._id || d.custom_id) === String(targetDepartmentId)),
        [departments, targetDepartmentId]
    );

    const availableFaculties = useMemo(() => {
        if (targetDepartmentId) {
            return selectedDepartment?.faculties || [];
        }
        if (ticketType === 'DIRECT_QUERY') {
            return allOfficers;
        }
        return [];
    }, [targetDepartmentId, selectedDepartment, ticketType, allOfficers]);

    const selectedTargetUser = useMemo(() => {
        return (
            allOfficers.find((f) => String(f.id || f._id || f.custom_id) === String(targetUserId)) ||
            availableFaculties.find((f) => String(f.id || f._id || f.custom_id) === String(targetUserId))
        );
    }, [allOfficers, availableFaculties, targetUserId]);

    const selectedCategory = useMemo(
        () => categories.find((c) => String(c.id || c._id || c.custom_id) === String(categoryId)),
        [categories, categoryId]
    );

    const availableSubcategories = useMemo(
        () => selectedCategory?.subcategories || [],
        [selectedCategory]
    );

    const selectedSubcategory = useMemo(
        () => availableSubcategories.find((s) => String(s.id || s._id || s.custom_id) === String(subcategoryId)),
        [availableSubcategories, subcategoryId]
    );

    const isConflictOfInterest = useMemo(() => {
        if (ticketType !== 'STATUTORY_GRIEVANCE') return false;
        if (!selectedDepartment || !targetUserId) return false;
        return String(selectedDepartment.head_id) === String(targetUserId);
    }, [ticketType, selectedDepartment, targetUserId]);

    const derivedPriority = useMemo(() => {
        if (selectedSubcategory?.default_priority) return selectedSubcategory.default_priority;
        if (selectedCategory?.default_priority) return selectedCategory.default_priority;
        return 'MEDIUM';
    }, [selectedSubcategory, selectedCategory]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const addFiles = (newFiles) => {
        setError('');
        const valid = [];
        for (const f of newFiles) {
            if (f.size > 10 * 1024 * 1024) {
                setError(`"${f.name}" is larger than the 10MB limit.`);
                continue;
            }
            valid.push(f);
        }
        if (files.length + valid.length > 5) {
            setError('You can attach up to 5 files.');
            return;
        }
        setFiles((prev) => [...prev, ...valid]);
    };

    const handleRemoveFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const validateStep1 = () => {
        if (!targetDepartmentId) {
            setError('Please select a department.');
            return false;
        }
        if (ticketType === 'DIRECT_QUERY' && !targetUserId) {
            setError('Please select a faculty or staff member for your inquiry.');
            return false;
        }
        setError('');
        return true;
    };

    const validateStep2 = () => {
        if (!categoryId) {
            setError('Please select a category.');
            return false;
        }
        if (!subcategoryId) {
            setError('Please select a subcategory.');
            return false;
        }
        setError('');
        return true;
    };

    const validateStep3 = () => {
        if (!title.trim() || title.trim().length < 5) {
            setError('Title must be at least 5 characters long.');
            return false;
        }
        if (title.trim().length > 200) {
            setError('Title cannot exceed 200 characters.');
            return false;
        }
        if (!description.trim() || description.trim().length < 10) {
            setError('Description must be at least 10 characters long.');
            return false;
        }
        if (description.trim().length > 5000) {
            setError('Description cannot exceed 5,000 characters.');
            return false;
        }
        setError('');
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        if (currentStep === 3 && !validateStep3()) return;
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const handlePrev = () => {
        setError('');
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);

        try {
            let uploadedDocs = [];
            if (files.length > 0) {
                uploadedDocs = await Promise.all(
                    files.map(async (file) => await uploadToCloudinary(file))
                );
            }

            const payload = {
                ticket_type: ticketType,
                target_department_id: targetDepartmentId,
                category_id: categoryId,
                subcategory_id: subcategoryId,
                title: title.trim(),
                description: description.trim(),
                is_anonymous: ticketType === 'DIRECT_QUERY' ? false : isAnonymous,
                attachments: uploadedDocs,
            };

            if (targetUserId) {
                payload.target_user_id = targetUserId;
            }

            const res = await api.post('/complain', payload);
            const ticketNumber = res?.data?.ticket_number || 'New Case';

            showSuccess(`Complaint submitted successfully! Reference number: ${ticketNumber}`);

            if (user?.role === 'student') navigate('/student/dashboard');
            else if (user?.designation === 'hod') navigate('/hod/dashboard');
            else if (user?.role === 'faculty') navigate('/faculty/dashboard');
            else navigate('/admin/dashboard');
        } catch (err) {
            const errMsg = err?.error || err?.message || 'Unable to submit your complaint. Please check your details and try again.';
            setError(errMsg);
            showError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <BackButton/>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            Campus Care Portal
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            Submit a Complaint
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Madhav Institute of Technology and Science, Gwalior
                        </p>
                    </div>
                </div>
            </div>

            {isEmptyDatabase && !loadingOptions && (
                <div
                    className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0"/>
                        <span>No Categories Available</span>
                    </div>
                    <p className="leading-relaxed">
                        There are currently no complaint categories set up in the system.
                        {isAdmin ? (
                            <span> You can add them now in Organization Settings or through Bulk Data Import.</span>
                        ) : (
                            <span> Please contact the administrator to set up complaint categories.</span>
                        )}
                    </p>
                    {isAdmin && (
                        <div className="pt-2 flex items-center gap-3">
                            <Link
                                to="/admin/governance"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow"
                            >
                                <FolderPlus className="w-3.5 h-3.5"/>
                                <span>Set Up Categories</span>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            <div className="glass p-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <div className="flex items-center justify-between min-w-125">
                    {STEPS.map((step) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;

                        return (
                            <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                                            isCompleted
                                                ? 'bg-emerald-600 text-white shadow-md'
                                                : isCurrent
                                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25 ring-4 ring-brand-500/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4"/> : step.id}
                                    </div>
                                    <span
                                        className={`text-xs font-bold tracking-tight whitespace-nowrap ${
                                            isCurrent
                                                ? 'text-slate-900 dark:text-white'
                                                : isCompleted
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-slate-400'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {step.id !== STEPS.length && (
                                    <div
                                        className={`flex-1 h-0.5 mx-4 transition-colors ${
                                            isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div
                    className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0"/>
                    <span>{error}</span>
                </div>
            )}

            <div
                className="glass p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative">
                {loadingOptions ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-7 h-7 animate-spin text-brand-500"/>
                        <span className="text-xs font-semibold text-slate-400">Loading form options...</span>
                    </div>
                ) : (
                    <>
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Select Complaint Type & Department
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Choose whether you are filing a formal complaint or sending a direct inquiry.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => {
                                            setTicketType('STATUTORY_GRIEVANCE');
                                            setError('');
                                        }}
                                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                            ticketType === 'STATUTORY_GRIEVANCE'
                                                ? 'border-brand-600 bg-brand-500/10 dark:bg-brand-500/15 shadow-md'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                                                Formal Complaint
                                            </span>
                                            <Shield className="w-4 h-4 text-brand-500"/>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                                            Submitted to the department and reviewed by the Head of Department.
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => {
                                            setTicketType('DIRECT_QUERY');
                                            setIsAnonymous(false);
                                            setError('');
                                        }}
                                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                            ticketType === 'DIRECT_QUERY'
                                                ? 'border-brand-600 bg-brand-500/10 dark:bg-brand-500/15 shadow-md'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                General Inquiry
                                            </span>
                                            <User className="w-4 h-4 text-indigo-500"/>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                                            Sent directly to a specific faculty or staff member.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label
                                        className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Department <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={targetDepartmentId}
                                        onChange={(e) => {
                                            setTargetDepartmentId(e.target.value);
                                            setTargetUserId('');
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="">Select department</option>
                                        {departments.map((d) => (
                                            <option key={String(d.id || d._id || d.custom_id)}
                                                    value={String(d.id || d._id || d.custom_id)}>
                                                {formatTitle(d.name || d.department_name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {(ticketType === 'DIRECT_QUERY' || targetDepartmentId) && (
                                    <div className="space-y-2">
                                        <label
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Faculty or Staff Member{' '}
                                            {ticketType === 'DIRECT_QUERY' ?
                                                <span className="text-rose-500">*</span> : '(Optional)'}
                                        </label>
                                        <select
                                            value={targetUserId}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                setTargetUserId(selectedId);

                                                if (!targetDepartmentId && selectedId) {
                                                    const officer = allOfficers.find(
                                                        (o) => String(o.id || o._id || o.custom_id) === String(selectedId)
                                                    );
                                                    if (officer?.department_id) {
                                                        setTargetDepartmentId(officer.department_id);
                                                    }
                                                }
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <option value="">
                                                {ticketType === 'DIRECT_QUERY'
                                                    ? 'Select a faculty or staff member'
                                                    : 'None (Review by department)'}
                                            </option>
                                            {availableFaculties.map((f) => (
                                                <option key={String(f.id || f._id || f.custom_id)}
                                                        value={String(f.id || f._id || f.custom_id)}>
                                                    {formatTitle(f.name || f.full_name)} ({formatTitle(f.designation || f.role || 'Staff')})
                                                </option>
                                            ))}
                                        </select>
                                        {availableFaculties.length === 0 && targetDepartmentId && (
                                            <p className="text-[11px] text-amber-500 font-medium mt-1">
                                                No individual staff members are assigned to this department yet. Your
                                                complaint will be reviewed by the department directly.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {isConflictOfInterest && (
                                    <div
                                        className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5"/>
                                        <div>
                                            <strong className="block font-bold">Routing Notice</strong>
                                            Because this complaint involves the Head of Department, it will be
                                            automatically routed to Central Administration for an independent review.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Category & Priority
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Select the category that best matches your issue. Priority is set automatically
                                        based on college guidelines.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => {
                                                setCategoryId(e.target.value);
                                                setSubcategoryId('');
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <option value="">Select category</option>
                                            {categories.map((c) => (
                                                <option key={String(c.id || c._id || c.custom_id)}
                                                        value={String(c.id || c._id || c.custom_id)}>
                                                    {formatTitle(c.title)}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedCategory?.description && (
                                            <p className="text-[11px] text-slate-500">{selectedCategory.description}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Subcategory <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            disabled={!categoryId}
                                            value={subcategoryId}
                                            onChange={(e) => setSubcategoryId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                        >
                                            <option value="">Select subcategory</option>
                                            {availableSubcategories.map((s) => (
                                                <option key={String(s.id || s._id || s.custom_id)}
                                                        value={String(s.id || s._id || s.custom_id)}>
                                                    {formatTitle(s.title)}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedSubcategory?.description && (
                                            <p className="text-[11px] text-slate-500">{selectedSubcategory.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div
                                            className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                                            <Tag className="w-3.5 h-3.5 text-brand-500"/>
                                            <span>Assigned Priority</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Set automatically based on the selected category and college guidelines.
                                        </p>
                                    </div>
                                    <PriorityBadge priority={derivedPriority}/>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Complaint Details & Attachments
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Describe the issue clearly and attach any relevant files.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Subject / Title <span className="text-rose-500">*</span>
                                        </label>
                                        <span
                                            className={`text-[10px] font-mono ${
                                                title.length > 200 ? 'text-rose-500 font-bold' : 'text-slate-400'
                                            }`}
                                        >
                                            {title.length}/200
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Issue with midterm evaluation marks"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Description <span className="text-rose-500">*</span>
                                        </label>
                                        <span
                                            className={`text-[10px] font-mono ${
                                                description.length > 5000 ? 'text-rose-500 font-bold' : 'text-slate-400'
                                            }`}
                                        >
                                            {description.length}/5000
                                        </span>
                                    </div>
                                    <textarea
                                        rows={6}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe what happened, including dates, locations, people involved, and how you would like this resolved..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white text-xs font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>

                                {ticketType !== 'DIRECT_QUERY' && (
                                    <div
                                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="anonymity-check"
                                            checked={isAnonymous}
                                            onChange={(e) => setIsAnonymous(e.target.checked)}
                                            className="w-4 h-4 mt-0.5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                                        />
                                        <label htmlFor="anonymity-check" className="cursor-pointer select-none">
                                            <div className="flex items-center gap-1.5">
                                                <EyeOff className="w-3.5 h-3.5 text-brand-500"/>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    Submit Anonymously
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                Your name and contact details will be hidden from the department and all
                                                assigned reviewers.
                                            </p>
                                        </label>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label
                                        className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Attach Files (Optional — max 5 files, up to 10MB each)
                                    </label>
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                                            dragActive
                                                ? 'border-brand-500 bg-brand-500/10'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-brand-500/50'
                                        }`}
                                    >
                                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2"/>
                                        <input
                                            type="file"
                                            multiple
                                            id="file-input"
                                            onChange={(e) => addFiles(Array.from(e.target.files || []))}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="file-input"
                                            className="text-xs font-bold text-brand-600 dark:text-brand-400 cursor-pointer hover:underline"
                                        >
                                            Choose files to upload or drag them here
                                        </label>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Supported formats: PDF, DOCX, PNG, JPG, and CSV
                                        </p>
                                    </div>

                                    {files.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {files.map((f, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                                >
                                                    <Paperclip className="w-3.5 h-3.5 text-brand-500"/>
                                                    <span className="truncate max-w-37.5">{f.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        ({(f.size / (1024 * 1024)).toFixed(1)} MB)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(i)}
                                                        className="text-slate-400 hover:text-rose-500 p-0.5"
                                                    >
                                                        <Trash2 className="w-3 h-3"/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Review Your Complaint
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Please review your details before submitting. Once submitted, your complaint
                                        will be forwarded for review.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Type
                                        </span>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {ticketType === 'DIRECT_QUERY' ? 'General Inquiry' : 'Formal Complaint'}
                                        </div>
                                    </div>

                                    <div
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Priority
                                        </span>
                                        <div>
                                            <PriorityBadge priority={derivedPriority}/>
                                        </div>
                                    </div>

                                    <div
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Department
                                        </span>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {formatTitle(selectedDepartment?.name || selectedDepartment?.department_name || 'N/A')}
                                        </div>
                                    </div>

                                    <div
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Assigned To
                                        </span>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {selectedTargetUser
                                                ? `${formatTitle(selectedTargetUser.name || selectedTargetUser.full_name)} (${formatTitle(
                                                    selectedTargetUser.designation || selectedTargetUser.role || 'Staff'
                                                )})`
                                                : 'Department Review'}
                                        </div>
                                    </div>

                                    <div
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Category & Subcategory
                                        </span>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {formatTitle(selectedCategory?.title)} → {formatTitle(selectedSubcategory?.title)}
                                        </div>
                                    </div>

                                    <div
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Privacy
                                        </span>
                                        <div
                                            className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            {isAnonymous ? (
                                                <>
                                                    <EyeOff className="w-3.5 h-3.5 text-amber-500"/>
                                                    <span>Anonymous Submission</span>
                                                </>
                                            ) : (
                                                <>
                                                    <User className="w-3.5 h-3.5 text-emerald-500"/>
                                                    <span>Standard (Name Included)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Complaint Details
                                    </span>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {description}
                                    </p>
                                </div>

                                <div
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Attached Files ({files.length})
                                    </span>
                                    {files.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">No files attached.</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {files.map((f, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                                >
                                                    {f.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div
                            className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5"/>
                                    <span>Back</span>
                                </button>
                            ) : (
                                <div/>
                            )}

                            {currentStep < 4 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/25 transition-all"
                                >
                                    <span>Next</span>
                                    <ArrowRight className="w-3.5 h-3.5"/>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin"/>
                                            <span>Submitting complaint...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileCheck className="w-4 h-4"/>
                                            <span>Submit Complaint</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}