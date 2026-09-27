import {Download, ExternalLink, FileText} from 'lucide-react';
import {getCloudinaryDownloadUrl, downloadFileBlob} from '../../utils/downloader';

export function AttachmentList({attachments = []}) {
    if (!attachments || attachments.length === 0) return null;

    return (
        <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Attached Files ({attachments.length})
            </h5>

            <div className="flex flex-wrap gap-2.5">
                {attachments.map((att, i) => {
                    const fileName = att.file_name || `Attachment_${i + 1}`;
                    const downloadUrl = getCloudinaryDownloadUrl(att.file_url, fileName);

                    return (
                        <div
                            key={i}
                            className="glass px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs bg-white/70 dark:bg-slate-900/70 shadow-sm"
                        >
                            <div
                                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold min-w-0">
                                <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0"/>
                                <span className="truncate max-w-40" title={fileName}>
                                    {fileName}
                                </span>
                                {att.file_type && (
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                                        ({att.file_type})
                                    </span>
                                )}
                            </div>

                            <div
                                className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2 shrink-0">
                                <a
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                    title="Open file"
                                >
                                    <ExternalLink className="w-3.5 h-3.5"/>
                                </a>

                                <a
                                    href={downloadUrl}
                                    download={fileName}
                                    onClick={(e) => {
                                        if (!downloadUrl.includes('fl_attachment')) {
                                            e.preventDefault();
                                            downloadFileBlob(att.file_url, fileName);
                                        }
                                    }}
                                    className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition-colors"
                                    title="Download file"
                                >
                                    <Download className="w-3.5 h-3.5"/>
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}