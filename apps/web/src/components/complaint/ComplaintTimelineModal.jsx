import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Clock,
    CheckCircle,
    XCircle,
    ArrowRightLeft,
    User,
    Send,
    Loader2,
    Lock,
    Layers,
    Eye,
    MessageSquare,
    FileText,
    Shield,
    RefreshCw,
} from 'lucide-react';
import Modal from '../common/Modal';
import PriorityBadge from '../common/PriorityBadge';
import StatusBadge from '../common/StatusBadge';
import LoadMoreButton from '../common/LoadMoreButton';
import { AttachmentList } from './AttachmentList';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatTitle, formatDate } from '../../utils/formatters';

const HISTORY_PAGE_SIZE = 5;

export default function ComplaintTimelineModal({ isOpen, onClose, complaintId }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('DETAILS');

    const [complaint, setComplaint] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);

    const [messages, setMessages] = useState([]);
    const [chatMeta, setChatMeta] = useState({ page: 1, total_pages: 1, total: 0 });
    const [loadingChat, setLoadingChat] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const currentUserId = (user?.id || user?._id || user?.custom_id || '').toString();

    useEffect(() => {
        if (isOpen && complaintId) {
            setLoadingDetails(true);
            setVisibleHistoryCount(HISTORY_PAGE_SIZE);

            Promise.all([
                api.get(`/complain/view/${complaintId}`),
                api.get(`/audit/complaint/${complaintId}`),
            ])
                .then(([compRes, auditRes]) => {
                    setComplaint(compRes.data || compRes);
                    const timelineData = auditRes?.data?.timeline || auditRes?.timeline || [];
                    setHistory(timelineData);
                })
                .catch((err) => console.error('Failed to load complaint details:', err))
                .finally(() => setLoadingDetails(false));
        }
    }, [isOpen, complaintId]);

    const fetchChatMessages = useCallback((page = 1, append = false) => {
        if (!complaintId) return;
        setLoadingChat(true);

        api.get(`/complain/${complaintId}/chat?page=${page}&limit=50`)
            .then((res) => {
                const data = res?.data?.data || res?.data || {};
                const list = data.messages || [];
                if (append) {
                    const container = scrollContainerRef.current;
                    const prevScrollHeight = container?.scrollHeight || 0;
                    setMessages((prev) => [...list, ...prev]);
                    requestAnimationFrame(() => {
                        if (container) {
                            container.scrollTop = container.scrollHeight - prevScrollHeight;
                        }
                    });
                } else {
                    setMessages(list);
                    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
                setChatMeta(data.meta || { page, total_pages: 1, total: list.length });
            })
            .catch((err) => console.error('Failed to load chat history:', err))
            .finally(() => setLoadingChat(false));
    }, [complaintId]);

    useEffect(() => {
        if (isOpen && complaintId && activeTab === 'CHAT') {
            fetchChatMessages(1, false);
        }
    }, [isOpen, complaintId, activeTab, fetchChatMessages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const text = chatInput.trim();
        if (!text || sending || isTerminal) return;

        try {
            setSending(true);
            const res = await api.post(`/complain/${complaintId}/chat`, { message: text });
            const newMsg = res?.data?.data || res?.data;

            setMessages((prev) => [...prev, newMsg]);
            setChatInput('');
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const visibleHistory = useMemo(
        () => history.slice(0, visibleHistoryCount),
        [history, visibleHistoryCount]
    );
    const hasMoreHistory = visibleHistoryCount < history.length;

    const isTerminal = complaint?.status === 'RESOLVED' || complaint?.status === 'REJECTED';
    const isAnonymous =
        complaint?.is_anonymous &&
        (!complaint?.complainant?.email || complaint?.complainant?.is_anonymous);

    const getActionIcon = (action) => {
        switch (action) {
            case 'SUBMITTED':
                return <Send className="w-3.5 h-3.5 text-brand-500" />;
            case 'ASSIGNED':
                return <User className="w-3.5 h-3.5 text-indigo-500" />;
            case 'TRANSFERRED':
                return <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />;
            case 'RESOLVED':
                return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
            case 'REJECTED':
                return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
            default:
                return <Clock className="w-3.5 h-3.5 text-slate-400" />;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={complaint ? `Grievance #${complaint.ticket_number}` : 'Loading Complaint...'}
            subtitle={complaint?.title}
        >
            <div className="flex flex-col h-[75dvh] max-h-160 sm:max-h-175 min-h-95 w-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 shrink-0 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setActiveTab('DETAILS')}
                            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                                activeTab === 'DETAILS'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="sm:hidden">Details</span>
                            <span className="hidden sm:inline">Description & History</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('CHAT')}
                            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                                activeTab === 'CHAT'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            <span className="sm:hidden">Chat</span>
                            <span className="hidden sm:inline">Discussion & Chat</span>
                            {messages.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold">
                                    {messages.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'CHAT' && (
                        <button
                            type="button"
                            onClick={() => fetchChatMessages(1, false)}
                            disabled={loadingChat}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shrink-0"
                            title="Refresh chat messages"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingChat ? 'animate-spin text-brand-500' : ''}`} />
                        </button>
                    )}
                </div>

                {activeTab === 'DETAILS' && (
                    <div className="overflow-y-auto pr-1 space-y-4 sm:space-y-5 flex-1 min-h-0 pt-2">
                        {loadingDetails ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                <span className="text-xs text-slate-400">Loading details & audit history...</span>
                            </div>
                        ) : complaint ? (
                            <>
                                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                Total Events
                                            </span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                {history.length}
                                            </span>
                                        </div>
                                        <Layers className="w-4 h-4 text-brand-500" />
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                Showing
                                            </span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                {visibleHistory.length}{' '}
                                                <span className="text-xs font-semibold text-slate-400">
                                                    / {history.length}
                                                </span>
                                            </span>
                                        </div>
                                        <Eye className="w-4 h-4 text-emerald-500" />
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <PriorityBadge priority={complaint.priority} />
                                            <StatusBadge status={complaint.status} />
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            Submitted on {formatDate(complaint.createdAt)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Department
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                                {formatTitle(
                                                    complaint.target_department?.department_name ||
                                                    complaint.target_department_id ||
                                                    'Department'
                                                )}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Submitted By
                                            </span>
                                            {isAnonymous ? (
                                                <div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 italic">
                                                        Anonymous
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400">
                                                        ({formatTitle(complaint.complainant?.role || complaint.complainant_role || 'User')})
                                                    </span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                                        {formatTitle(complaint.complainant?.full_name || 'Complainant')}
                                                    </span>
                                                    {complaint.complainant?.email && (
                                                        <span className="block text-[10px] font-mono text-slate-400 truncate">
                                                            {complaint.complainant.email}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                                                Assigned To
                                            </span>
                                            {complaint.active_respondent?.full_name ? (
                                                <div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                                        {formatTitle(complaint.active_respondent.full_name)}
                                                    </span>
                                                    {complaint.active_respondent.email && (
                                                        <span className="block text-[10px] font-mono text-slate-400 truncate">
                                                            {complaint.active_respondent.email}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-medium text-slate-400">Unassigned</span>
                                            )}
                                        </div>
                                    </div>

                                    {isTerminal && (
                                        <div className="p-2.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                            <span>This complaint has been closed and can no longer be edited.</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Description
                                    </h5>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 whitespace-pre-wrap">
                                        {complaint.description}
                                    </p>
                                </div>

                                {complaint.attachments && complaint.attachments.length > 0 && (
                                    <AttachmentList attachments={complaint.attachments} />
                                )}

                                <div className="space-y-3 pt-2">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Activity History ({visibleHistory.length} of {history.length})
                                    </h5>

                                    <div className="relative pl-6 space-y-3 sm:space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                        {visibleHistory.map((h, i) => (
                                            <div key={h.id || h.custom_id || i} className="relative group">
                                                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                                    {getActionIcon(h.action)}
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 space-y-1 text-xs">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                                                            {formatTitle(h.action)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {formatDate(h.createdAt)}
                                                        </span>
                                                    </div>
                                                    {h.remarks && (
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                            {h.remarks}
                                                        </p>
                                                    )}
                                                    {h.actor && (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5 flex-wrap">
                                                            <span>
                                                                Updated by <strong>{formatTitle(h.actor.full_name || (h.actor.is_anonymous ? 'Anonymous' : 'User'))}</strong> ({formatTitle(h.actor.role || 'Member')})
                                                            </span>
                                                            {h.actor.email && (
                                                                <span className="font-mono text-slate-500">• {h.actor.email}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <LoadMoreButton
                                        loading={false}
                                        hasMore={hasMoreHistory}
                                        onClick={() => setVisibleHistoryCount((prev) => prev + HISTORY_PAGE_SIZE)}
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {activeTab === 'CHAT' && (
                    <div className="flex flex-col flex-1 min-h-0 w-full pt-2">
                        <div
                            ref={scrollContainerRef}
                            className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3.5 space-y-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80"
                        >
                            {chatMeta.page < chatMeta.total_pages && (
                                <div className="text-center pb-2">
                                    <button
                                        type="button"
                                        disabled={loadingChat}
                                        onClick={() => fetchChatMessages(chatMeta.page + 1, true)}
                                        className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                                    >
                                        {loadingChat ? 'Loading earlier messages...' : 'Load Earlier Messages'}
                                    </button>
                                </div>
                            )}

                            {loadingChat && messages.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                    <span className="text-xs text-slate-400">Loading conversation...</span>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="py-20 text-center space-y-2">
                                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                        No messages in this discussion yet.
                                    </p>
                                    <p className="text-[11px] text-slate-400 max-w-xs sm:max-w-sm mx-auto">
                                        Send a message below to coordinate directly with the department reviewer or complainant.
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const sender = msg.sender || {};
                                    const senderId = (msg.sender_id || sender._id || sender.id || '').toString();
                                    const isSelf = currentUserId && senderId === currentUserId;
                                    const isMsgAnonymous = sender.is_anonymous || (!sender.email && !isSelf && complaint?.is_anonymous);

                                    return (
                                        <div
                                            key={msg.id || msg._id || index}
                                            className={`flex flex-col w-full ${isSelf ? 'items-end' : 'items-start'}`}
                                        >
                                            <div
                                                className={`flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1 flex-wrap ${
                                                    isSelf ? 'justify-end' : 'justify-start'
                                                }`}
                                            >
                                                {isMsgAnonymous ? (
                                                    <span className="font-bold flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                                        <Shield className="w-3 h-3 text-amber-500" />
                                                        Anonymous ({formatTitle(sender.role || 'Author')})
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        {isSelf ? 'You' : formatTitle(sender.full_name || 'Member')}
                                                    </span>
                                                )}

                                                {!isMsgAnonymous && sender.email && (
                                                    <span className="font-mono text-slate-400 text-[10px] max-w-[150px] sm:max-w-xs truncate">
                                                        &lt;{sender.email}&gt;
                                                    </span>
                                                )}

                                                {sender.designation && !isMsgAnonymous && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                                        {formatTitle(sender.designation)}
                                                    </span>
                                                )}

                                                <span>•</span>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                    {msg.createdAt && !isNaN(new Date(msg.createdAt).getTime())
                                                        ? new Date(msg.createdAt).toLocaleString('en-IN', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                              hour12: true,
                                                              day: '2-digit',
                                                              month: 'short',
                                                          })
                                                        : ''}
                                                </span>
                                            </div>

                                            <div
                                                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                                    isSelf
                                                        ? 'bg-brand-600 text-white rounded-tr-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-sm'
                                                }`}
                                            >
                                                {msg.message}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {isTerminal ? (
                            <div className="pt-2.5 sm:pt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>This grievance is closed. Discussion history is archived in read-only mode.</span>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSendMessage}
                                className="pt-2.5 sm:pt-3 flex items-center gap-1.5 sm:gap-2 shrink-0 w-full"
                            >
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    disabled={sending}
                                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !chatInput.trim()}
                                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-all shrink-0"
                                    title="Send Message"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}