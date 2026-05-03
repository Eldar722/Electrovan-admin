import { useState, useEffect, useRef, useCallback } from "react";
import Paginator from "../components/Paginator";
import { fetchLeadsPaginated, fetchLeadCounts, updateLead, updateLeadStatus, supabase } from "../api/supabase";

const ITEMS_PER_PAGE = 8;
const NOTIF_TTL      = 6000;
const SEARCH_DEBOUNCE = 300;

const STATUSES = [
    { key: 'all',         label: 'Все' },
    { key: 'new',         label: 'Новая' },
    { key: 'in_progress', label: 'В работе' },
    { key: 'done',        label: 'Выполнено' },
    { key: 'cancelled',   label: 'Отменено' },
];

function TableSkeleton() {
    return Array.from({ length: 5 }, (_, i) => (
        <tr key={i} className="skeleton-row">
            {[30, 140, 120, 90, 80].map((w, j) => (
                <td key={j}><div className="skeleton skeleton-td" style={{ width: w }} /></td>
            ))}
        </tr>
    ));
}

// Renders only the head of the queue. Badge shows how many are waiting.
function NotifQueue({ queue, onDismiss }) {
    const current = queue[0];
    if (!current) return null;
    return (
        <div className="lead-notification" key={current.id}>
            <div className="lead-notif-bell">🔔</div>
            <div className="lead-notif-body">
                <p className="lead-notif-title text-body-md">
                    Новая заявка!
                    {queue.length > 1 && (
                        <span className="lead-notif-count"> +{queue.length - 1}</span>
                    )}
                </p>
                <p className="lead-notif-name text-caption">{current.name}</p>
                <p className="lead-notif-phone text-caption">{current.phone}</p>
            </div>
            <button type="button" className="lead-notif-close" onClick={onDismiss}>×</button>
        </div>
    );
}

function OrderPage() {
    const [leads, setLeads]               = useState([]);
    const [totalCount, setTotalCount]     = useState(0);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [currentPage, setCurrentPage]   = useState(1);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery]   = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedLeadId, setSelectedLeadId] = useState(null);
    const [noteDraft, setNoteDraft]       = useState('');
    const [noteSaving, setNoteSaving]     = useState(false);
    const [noteSaved, setNoteSaved]       = useState(false);
    const [statusError, setStatusError]   = useState(null);
    const [statusSavingIds, setStatusSavingIds] = useState(new Set());
    const [notifQueue, setNotifQueue]     = useState([]);
    const [newLeadIds, setNewLeadIds]     = useState(new Set());
    const [statusCounts, setStatusCounts] = useState({ all: 0, new: 0, in_progress: 0, done: 0, cancelled: 0 });

    const channelName = useRef(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim().toLowerCase());
            setCurrentPage(1);
        }, SEARCH_DEBOUNCE);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Server-side paginated fetch
    const loadLeads = useCallback(async (retriesLeft = 2) => {
        const attempt = async (attemptsLeft) => {
            try {
                const { data, count } = await fetchLeadsPaginated({
                    page: currentPage,
                    pageSize: ITEMS_PER_PAGE,
                    status: filterStatus,
                    search: debouncedSearch,
                });
                setLeads(data);
                setTotalCount(count);
                setError(null);
            } catch (err) {
                if (attemptsLeft > 0) {
                    await new Promise(r => setTimeout(r, 2500));
                    return attempt(attemptsLeft - 1);
                }
                setError(err.message);
            }
        };
        await attempt(retriesLeft);
    }, [currentPage, filterStatus, debouncedSearch]);

    // Load status counts (lightweight query)
    const loadCounts = useCallback(async () => {
        try {
            const counts = await fetchLeadCounts();
            setStatusCounts(counts);
        } catch {
            // Non-critical — silently ignore
        }
    }, []);

    // Auto-advance notification queue: dismiss head after TTL
    const dismissFirst = useCallback(() => setNotifQueue(q => q.slice(1)), []);

    useEffect(() => {
        if (notifQueue.length === 0) return;
        const timer = setTimeout(dismissFirst, NOTIF_TTL);
        return () => clearTimeout(timer);
    }, [notifQueue, dismissFirst]);

    // Selected lead detail
    const selectedLead = selectedLeadId == null
        ? null
        : leads.find(l => l.id === selectedLeadId) || null;

    useEffect(() => {
        setNoteDraft(selectedLead?.admin_note || '');
        setNoteSaved(false);
    }, [selectedLead?.id, selectedLead?.admin_note]);

    // Main data fetch + realtime subscription (NO polling)
    useEffect(() => {
        channelName.current = `leads-${Date.now()}`;

        // Initial load
        setLoading(true);
        Promise.all([loadLeads(), loadCounts()]).finally(() => setLoading(false));

        // Realtime subscription — replaces polling entirely
        const channel = supabase
            .channel(channelName.current)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newId = payload.new.id;
                    // Refresh current page data and counts from server
                    loadLeads();
                    loadCounts();
                    setNewLeadIds(prev => new Set([...prev, newId]));
                    setTimeout(() => {
                        setNewLeadIds(prev => { const s = new Set(prev); s.delete(newId); return s; });
                    }, 900);
                    setNotifQueue(q => [...q, { id: Date.now(), name: payload.new.name, phone: payload.new.phone }]);
                } else if (payload.eventType === 'UPDATE') {
                    // Patch the row in-place if on current page
                    setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
                    loadCounts();
                } else if (payload.eventType === 'DELETE') {
                    setLeads(prev => prev.filter(l => l.id !== payload.old.id));
                    loadCounts();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadLeads, loadCounts]);

    const handleStatusChange = async (lead, newStatus) => {
        const prevStatus = lead.status || 'new';
        setStatusError(null);
        setStatusSavingIds(prev => new Set([...prev, lead.id]));
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
        try {
            const updatedLead = await updateLeadStatus(lead.id, newStatus);
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...updatedLead } : l));
            loadCounts();
        } catch (err) {
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: prevStatus } : l));
            setStatusError(`Ошибка смены статуса: ${err.message}`);
            setTimeout(() => setStatusError(null), 4000);
        } finally {
            setStatusSavingIds(prev => {
                const next = new Set(prev);
                next.delete(lead.id);
                return next;
            });
        }
    };

    const handleNoteSave = async () => {
        if (!selectedLead || noteSaving) return;
        setNoteSaving(true);
        setNoteSaved(false);
        setStatusError(null);
        try {
            const updatedLead = await updateLead(selectedLead.id, { admin_note: noteDraft.trim() });
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, ...updatedLead } : l));
            setNoteSaved(true);
            setTimeout(() => setNoteSaved(false), 2500);
        } catch (err) {
            setStatusError(`Ошибка сохранения заметки: ${err.message}`);
            setTimeout(() => setStatusError(null), 4000);
        } finally {
            setNoteSaving(false);
        }
    };

    const handleFilterChange = (key) => {
        setFilterStatus(key);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (error) return <section className="admin-section"><p className="text-body-md">Ошибка: {error}</p></section>;

    return (
        <section className="admin-section">
            <NotifQueue queue={notifQueue} onDismiss={dismissFirst} />

            <div className="order-summary-grid">
                {STATUSES.filter(s => s.key !== 'all').map(s => (
                    <button
                        key={s.key}
                        type="button"
                        className={`order-summary-card status-${s.key}${filterStatus === s.key ? ' active' : ''}`}
                        onClick={() => handleFilterChange(s.key)}
                    >
                        <span className="text-caption">{s.label}</span>
                        <strong className="text-heading-lg">{statusCounts[s.key] || 0}</strong>
                    </button>
                ))}
            </div>

            <div className="order-filter-bar">
                <input
                    className="order-search-input text-caption"
                    type="search"
                    placeholder="Поиск по имени или телефону"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {STATUSES.map(s => (
                    <button
                        key={s.key}
                        type="button"
                        className={`order-filter-btn text-caption${filterStatus === s.key ? ' active' : ''}`}
                        onClick={() => handleFilterChange(s.key)}
                    >
                        {s.label} ({statusCounts[s.key] || 0})
                    </button>
                ))}
                <button
                    type="button"
                    className="order-refresh-btn text-caption"
                    onClick={() => { loadLeads(); loadCounts(); }}
                    title="Обновить список"
                >
                    ↺ Обновить
                </button>
            </div>

            {statusError && (
                <p className="text-body-md order-status-error">{statusError}</p>
            )}

            <div className="order-table-wrap">
                <table className="order-table">
                    <thead>
                        <tr>
                            <th className="text-body-md">№</th>
                            <th className="text-body-md">Имя клиента</th>
                            <th className="text-body-md">Номер телефона</th>
                            <th className="text-body-md">Дата заявки</th>
                            <th className="text-body-md">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <TableSkeleton /> : leads.map((lead, index) => {
                            const status = lead.status || 'new';
                            const statusSaving = statusSavingIds.has(lead.id);
                            return (
                                <tr key={lead.id} className={newLeadIds.has(lead.id) ? 'lead-row--new' : ''}>
                                    <td className="text-caption">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                    <td className="text-body-md">
                                        <button type="button" className="lead-open-btn" onClick={() => setSelectedLeadId(lead.id)}>
                                            {lead.name}
                                        </button>
                                    </td>
                                    <td className="text-body-md">
                                        <a className="lead-phone-link" href={`tel:${String(lead.phone || '').replace(/\s/g, '')}`}>
                                            {lead.phone}
                                        </a>
                                    </td>
                                    <td className="text-caption">{new Date(lead.created_at).toLocaleDateString('ru-RU')}</td>
                                    <td>
                                        <select
                                            className={`lead-status-select status-${status} text-caption`}
                                            value={status}
                                            onChange={e => handleStatusChange(lead, e.target.value)}
                                            disabled={statusSaving}
                                        >
                                            {STATUSES.filter(s => s.key !== 'all').map(s => (
                                                <option key={s.key} value={s.key}>{s.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && leads.length === 0 && (
                            <tr><td colSpan={5} className="text-body-md order-empty">Заявок нет</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <Paginator totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
            )}

            {selectedLead && (
                <aside
                    className="lead-detail-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Заявка ${selectedLead.name}`}
                >
                    <div className="lead-detail-header">
                        <div>
                            <div className="text-caption lead-detail-kicker">Заявка клиента</div>
                            <h2 className="text-heading-lg">{selectedLead.name}</h2>
                        </div>
                        <button type="button" className="lead-detail-close" onClick={() => setSelectedLeadId(null)} aria-label="Закрыть">×</button>
                    </div>
                    <div className="lead-detail-body">
                        <div className="lead-detail-row">
                            <span className="text-caption">Телефон</span>
                            <a className="text-body-md" href={`tel:${String(selectedLead.phone || '').replace(/\s/g, '')}`}>
                                {selectedLead.phone}
                            </a>
                        </div>
                        <div className="lead-detail-row">
                            <span className="text-caption">Дата заявки</span>
                            <strong className="text-body-md">
                                {new Date(selectedLead.created_at).toLocaleString('ru-RU')}
                            </strong>
                        </div>
                        <div className="lead-detail-row">
                            <span className="text-caption">Статус</span>
                            <select
                                className={`lead-status-select status-${selectedLead.status || 'new'} text-caption`}
                                value={selectedLead.status || 'new'}
                                onChange={e => handleStatusChange(selectedLead, e.target.value)}
                                disabled={statusSavingIds.has(selectedLead.id)}
                            >
                                {STATUSES.filter(s => s.key !== 'all').map(s => (
                                    <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="lead-detail-actions">
                            <a className="lead-action-link text-caption" href={`tel:${String(selectedLead.phone || '').replace(/\s/g, '')}`}>
                                Позвонить
                            </a>
                            <a
                                className="lead-action-link text-caption"
                                href={`https://wa.me/${String(selectedLead.phone || '').replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                WhatsApp
                            </a>
                        </div>
                        <label className="lead-note-label text-caption" htmlFor="lead-note">Заметка менеджера</label>
                        <textarea
                            id="lead-note"
                            className="lead-note-input text-body-md"
                            value={noteDraft}
                            onChange={e => setNoteDraft(e.target.value)}
                            placeholder="Например: интересуется Geely, перезвонить завтра"
                            rows={6}
                        />
                        <button type="button" className="lead-note-save text-caption" onClick={handleNoteSave} disabled={noteSaving}>
                            {noteSaved ? 'Сохранено' : noteSaving ? 'Сохранение...' : 'Сохранить заметку'}
                        </button>
                    </div>
                </aside>
            )}
        </section>
    );
}

export default OrderPage;
