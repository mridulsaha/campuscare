import {useState} from 'react';
import {Upload, FileCheck, AlertCircle, Loader2, Database} from 'lucide-react';
import api from '../services/api';

export default function BulkOperations() {
    const [selectedResource, setSelectedResource] = useState('departments');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const resources = [
        {key: 'departments', label: 'Departments', endpoint: '/bulk/departments/import'},
        {key: 'programmes', label: 'Programmes', endpoint: '/bulk/programmes/import'},
        {key: 'branches', label: 'Branches', endpoint: '/bulk/branches/import'},
        {key: 'categories', label: 'Categories & Subcategories', endpoint: '/bulk/categories/import'},
        {key: 'students', label: 'Students', endpoint: '/bulk/students/import'},
        {key: 'faculty', label: 'Faculty Members', endpoint: '/bulk/faculty/import'},
    ];

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setError('');
        setResult(null);
        setLoading(true);

        const activeRes = resources.find((r) => r.key === selectedResource);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(activeRes.endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResult(res);
            setFile(null);
        } catch (err) {
            setError(err.error || err.message || 'Unable to import file. Please check your data format and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="glass p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                        Data Management
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        Bulk Data Import
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Upload a CSV file to add or update records in bulk.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {resources.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => {
                                setSelectedResource(r.key);
                                setResult(null);
                                setError('');
                            }}
                            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                selectedResource === r.key
                                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div
                        className="p-4 mb-4 rounded-xl bg-rose-500/10 text-rose-600 text-xs border border-rose-500/20 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0"/>
                        <span>{error}</span>
                    </div>
                )}

                {result && (
                    <div
                        className="p-4 mb-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs border border-emerald-500/20 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 shrink-0"/>
                        <span>{result.message || 'Data imported successfully.'}</span>
                    </div>
                )}

                <form onSubmit={handleUpload} className="space-y-4">
                    <div
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2"/>
                        <input
                            type="file"
                            accept=".csv"
                            required
                            id="csv-file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                        <label
                            htmlFor="csv-file"
                            className="text-xs font-bold text-brand-600 dark:text-brand-400 cursor-pointer hover:underline"
                        >
                            {file ? file.name : 'Choose a CSV file to upload'}
                        </label>
                        <p className="text-[11px] text-slate-400 mt-1">Only CSV files (.csv) are supported</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4"/>}
                        Upload and Import
                    </button>
                </form>
            </div>
        </div>
    );
}