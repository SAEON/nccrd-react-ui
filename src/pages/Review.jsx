/**
 * Review.jsx — the reviewer's queue (validate-submission permission).
 *
 * Tabs list submissions by review state, oldest first, so the queue is worked
 * in the order things arrived. Decisions are made on each project's page
 * (components/ReviewPanel.jsx), where the reviewer can read it in full.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getSubmissions, getReviewCounts } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { REVIEW_STATES } from '../utils/reviewStatus';
import StatusBadge from '../components/StatusBadge';
import InterventionBadge from '../components/InterventionBadge';
import { sourceLabel } from '../utils/dataSources';

const TABS = ['awaiting_review', 'not_accepted', 'draft', 'published'];
const PAGE_SIZE = 50;

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const Review = () => {
    const { hasPermission, loading: authLoading } = useCurrentUser();
    const [tab, setTab] = useState('awaiting_review');
    const [counts, setCounts] = useState(null);
    const [items, setItems] = useState([]);
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isReviewer = hasPermission('validate-submission');

    useEffect(() => {
        if (!isReviewer) return;
        getReviewCounts().then(setCounts).catch((err) => console.warn('[NCCRD] Could not load review counts.', err));
    }, [isReviewer]);

    useEffect(() => {
        if (!isReviewer) return undefined;
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        getSubmissions({ review_status: tab }, { signal: controller.signal })
            .then((data) => {
                const oldestFirst = [...data].sort((a, b) => (a.createdate || '').localeCompare(b.createdate || ''));
                setItems(oldestFirst);
                setVisible(PAGE_SIZE);
                setLoading(false);
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setError(err.message || 'Could not load the review queue.');
                setLoading(false);
            });
        return () => controller.abort();
    }, [tab, isReviewer]);

    if (authLoading) return null;
    if (!isReviewer) return (
        <div className="container" style={{ paddingBlock: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Reviewers only</h3>
                <p>You need the reviewer permission (validate-submission) to see the review queue.</p>
            </div>
        </div>
    );

    return (
        <div className="container reviews-page" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/" className="report-back"><ArrowLeft size={16} /> Back to projects</Link>
            <header>
                <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>Review submissions</h1>
                <p className="report-lede">
                    Open a project to read it in full, then accept it to publish it, or mark it not accepted with a reason for the submitter.
                    {' '}<Link to="/admin/pipeline">Data pipeline: loaded sources and data-quality worklists →</Link>
                </p>
            </header>

            <div className="review-tabs" role="tablist" aria-label="Review state">
                {TABS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        className={`review-tab${tab === key ? ' is-active' : ''}`}
                        onClick={() => setTab(key)}
                    >
                        {REVIEW_STATES[key].label}
                        {counts && <span className="review-tab-count">{counts[key].toLocaleString()}</span>}
                    </button>
                ))}
            </div>

            {error && <div className="glass-panel report-error" role="alert">{error}</div>}
            {loading ? (
                <p className="report-empty">Loading…</p>
            ) : items.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p className="report-empty">Nothing here. {tab === 'awaiting_review' && 'The queue is clear.'}</p>
                </div>
            ) : (
                <ul className="review-list">
                    {items.slice(0, visible).map((s) => (
                        <li key={s.id}>
                            <Link to={`/submission/${s.id}`} className="glass-panel review-row">
                                <span className="review-row-main">
                                    <span className="review-row-badges">
                                        <StatusBadge submission={s} />
                                        <InterventionBadge type={s.intervention_measurement} />
                                    </span>
                                    <strong>{s.title || 'Untitled project'}</strong>
                                    <span className="review-row-meta">
                                        {[s.implementation_organization, sourceLabel(s.data_source), s.createdate && `added ${formatDate(s.createdate)}`]
                                            .filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <ChevronRight size={20} color="var(--accent-primary)" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {!loading && visible < items.length && (
                <button type="button" className="btn btn-outline" style={{ justifySelf: 'center' }} onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                    Show more ({(items.length - visible).toLocaleString()} remaining)
                </button>
            )}
        </div>
    );
};

export default Review;
