/**
 * AdminRegistrations.jsx — review account requests from the sign-up page
 * (permission assign-role). Approving grants the chosen role on this site,
 * which lets the person log in; rejecting keeps them out.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { approveRegistration, getRegistrations, getRoles, rejectRegistration } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';

const STATUSES = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']];
const formatDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const AdminRegistrations = () => {
    const { hasPermission, loading: authLoading } = useCurrentUser();
    const canReview = hasPermission('assign-role');
    const [status, setStatus] = useState('pending');
    const [requests, setRequests] = useState(null);
    const [roles, setRoles] = useState([]);
    const [roleFor, setRoleFor] = useState({});   // request id -> chosen role id
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!canReview) return;
        getRoles().then(setRoles).catch(() => setRoles([]));
    }, [canReview]);

    useEffect(() => {
        if (!canReview) return;
        setRequests(null);
        getRegistrations(status).then(setRequests).catch((err) => setError(err.message));
    }, [canReview, status]);

    const defaultRole = roles.find((r) => r.name === 'user') ?? roles[0];

    const decide = async (request, approve) => {
        setBusy(request.id);
        setError(null);
        try {
            if (approve) {
                const roleId = Number(roleFor[request.id] ?? defaultRole?.id);
                await approveRegistration(request.id, roleId);
                setMessage(`${request.name} can now log in.`);
            } else {
                await rejectRegistration(request.id);
                setMessage(`${request.name}'s request was rejected.`);
            }
            setRequests((list) => list.filter((r) => r.id !== request.id));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    };

    if (authLoading) return null;
    if (!canReview) return (
        <div className="container" style={{ paddingBlock: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Administrators only</h3>
                <p>You need the assign-role permission to review account requests.</p>
            </div>
        </div>
    );

    return (
        <div className="container reviews-page" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/" className="report-back"><ArrowLeft size={16} /> Back to projects</Link>
            <header>
                <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>Account requests</h1>
                <p className="report-lede">People who asked for an account on the sign-up page. Approving gives them the chosen role on this site.</p>
            </header>

            <div className="review-tabs" role="tablist" aria-label="Request status">
                {STATUSES.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={status === key}
                        className={`review-tab${status === key ? ' is-active' : ''}`}
                        onClick={() => { setStatus(key); setMessage(null); }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {message && <div role="status" className="glass-panel review-note review-note-published">{message}</div>}
            {error && <div role="alert" className="glass-panel report-error">{error}</div>}

            {requests === null ? (
                <p className="report-empty">Loading…</p>
            ) : requests.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p className="report-empty">{status === 'pending' ? 'No requests waiting.' : 'None.'}</p>
                </div>
            ) : (
                <ul className="review-list">
                    {requests.map((r) => (
                        <li key={r.id} className="glass-panel registration-row">
                            <div className="review-row-main">
                                <strong>{r.name}</strong>
                                <span className="review-row-meta">{[r.email, r.organisation, `requested ${formatDate(r.created_at)}`].filter(Boolean).join(' · ')}</span>
                                {r.registration_note && <blockquote className="review-comments">{r.registration_note}</blockquote>}
                            </div>
                            {status === 'pending' && (
                                <div className="registration-actions">
                                    <label className="input-label" htmlFor={`role-${r.id}`} style={{ margin: 0 }}>Role</label>
                                    <select
                                        id={`role-${r.id}`}
                                        className="input-field"
                                        value={roleFor[r.id] ?? defaultRole?.id ?? ''}
                                        onChange={(e) => setRoleFor((m) => ({ ...m, [r.id]: e.target.value }))}
                                        style={{ width: 'auto' }}
                                    >
                                        {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                                    </select>
                                    <button type="button" className="btn btn-primary" disabled={busy === r.id || !roles.length} onClick={() => decide(r, true)}>
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        disabled={busy === r.id}
                                        onClick={() => decide(r, false)}
                                        style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.35)' }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AdminRegistrations;
