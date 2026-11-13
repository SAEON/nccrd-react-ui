import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { getSubmissionById, deleteSubmission, API_BASE_URL } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { resolveValue } from '../utils/resolveValue';
import { canEditSubmission } from '../utils/reviewStatus';
import StatusBadge from '../components/StatusBadge';
import InterventionBadge from '../components/InterventionBadge';
import DownloadProjectButton from '../components/DownloadProjectButton';
import { ReviewPanel, ReviewStatusNote } from '../components/ReviewPanel';
import { sourceLabel } from '../utils/dataSources';
import { countryName, locationPoints, locationPrecision, otherPartners, timeline } from '../utils/projectDetails';
import {
    ArrowLeft, Clock, Banknote, MapPin, Building,
    Target, Activity, Edit2, Trash2, Mail,
    Leaf, Zap, FileDown, FileText, FolderOpen, CheckCircle, X,
} from 'lucide-react';

const LocationMap = lazy(() => import('../components/LocationMap'));

/** Sources loaded in bulk from a register: their "created" date is the import date. */
const IMPORTED = new Set(['gauteng_register_2024', 'wc_project_database_2020']);

// ─────────────────────────────────────────────────────────────────────────────
// South African Rand formatter  (Phase 2 — Localisation)
// Intl.NumberFormat produces e.g. "R 1 234 567,89" in the en-ZA locale.
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (iso) => new Date(iso).toLocaleDateString('en-ZA');

const formatZAR = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks (styles: .pd-* in index.css)
// ─────────────────────────────────────────────────────────────────────────────

/** Sidebar fact: grey icon, small uppercase label, value. */
const SidebarRow = ({ icon, label, children }) => (
    <div className="pd-fact">
        <span className="pd-icon" aria-hidden="true">{icon}</span>
        <div>
            <div className="pd-fact-label">{label}</div>
            {children}
        </div>
    </div>
);

/** A titled section card in the main column. */
const Section = ({ icon, title, children }) => (
    <section className="pd-section">
        <h3 className="pd-section-title"><span className="pd-icon" aria-hidden="true">{icon}</span>{title}</h3>
        {children}
    </section>
);

/** Label / value rows in a white box; empty values are left out. */
const Rows = ({ heading, rows }) => {
    const items = rows.map(([l, v]) => [l, typeof v === 'string' ? resolveValue(v) : v]).filter(([, v]) => v);
    if (!items.length && !heading) return null;
    return (
        <div className="pd-box">
            {heading && <h4 className="pd-box-heading">{heading}</h4>}
            <dl className="pd-rows">
                {items.map(([label, value]) => (
                    <div key={label} className="pd-row">
                        <dt>{label}:</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
};

/**
 * New progress-report uploads store a root-relative file_url (served by the
 * API itself); legacy rows have a full external URL already. Only prefix
 * the ones that need it.
 */
const resolveFileUrl = (fileUrl) => (fileUrl?.startsWith('/') ? `${API_BASE_URL}${fileUrl}` : fileUrl);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SubmissionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, hasPermission } = useCurrentUser();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Flash confirmation after SubmissionForm redirects here post-save —
    // dismissible, and read once so a later refresh of this same page
    // (or navigating away and back) doesn't keep re-showing it.
    const [justSaved, setJustSaved] = useState(location.state?.justSaved ?? null);
    const [reviewed, setReviewed] = useState(null);   // decision just recorded here

    const loadProject = async () => {
        setLoading(true);
        try {
            const data = await getSubmissionById(id);
            if (!data) throw new Error('Submission not found.');
            setProject(data);
        } catch (err) {
            console.error(err);
            setError(err.status === 404
                ? 'This project doesn’t exist, or it hasn’t been published yet. If it’s yours, log in to see it.'
                : 'Failed to load this project. Ensure the database connection is active.');
        } finally {
            setLoading(false);
        }
    };

    // loadProject is redefined every render — depending on `id` alone avoids a fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadProject(); }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this project?')) return;
        try {
            await deleteSubmission(id);
            navigate('/');
        } catch (err) {
            alert(`Delete failed: ${err.message}`);
        }
    };

    // ── Loading state ─────────────────────────────────────────────────────
    if (loading) return (
        <div className="container text-center" style={{ paddingTop: '5rem' }}>
            <Activity size={48} color="var(--accent-primary)" className="mx-auto block" style={{ animation: 'pulse 2s infinite' }} />
            <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading project details…</p>
        </div>
    );

    // ── Error state ───────────────────────────────────────────────────────
    if (error || !project) return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <Link to="/" className="btn btn-outline mb-6" style={{ display: 'inline-flex', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }}>
                <ArrowLeft size={16} /> Back to Projects
            </Link>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Error Loading Details</h3>
                <p>{error || 'Project not found.'}</p>
            </div>
        </div>
    );

    const geo = project.geo_location || {};
    const points = locationPoints(geo.coordinates);
    const precision = locationPrecision(geo.located_by);
    const partners = otherPartners(project.implementation_partners_other, project.implementation_organization);
    const when = timeline(project.start_date, project.end_date);
    const tag = (v) => (resolveValue(v) ? <span className="pd-tag">{resolveValue(v)}</span> : null);
    const hasFunding = project.funding_organization || project.funding_type
        || project.funding_amount != null || project.estimated_budget_cost;
    const m = project.mitigation;
    const a = project.adaptation;

    return (
        <div className="container pd-page">
            {justSaved && (
                <div
                    role="status"
                    className="glass-panel"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '0.75rem', padding: '0.85rem 1.25rem', marginTop: '2rem',
                        borderLeft: '4px solid #16a34a', color: '#15803d',
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} />
                        {justSaved === 'created' ? 'Submission created successfully.' : 'Submission updated successfully.'}
                        {project.submission_status === 'Pending' && ' It will be public once a reviewer accepts it.'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setJustSaved(null)}
                        aria-label="Dismiss"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <Link to="/" className="pd-back"><ArrowLeft size={14} /> Back to projects</Link>

            {reviewed && (
                <div role="status" className="glass-panel review-note review-note-published">
                    {reviewed === 'Accepted'
                        ? 'Accepted. The project is now public.'
                        : 'Marked not accepted. The submitter will see your comments on this page.'}
                </div>
            )}
            <ReviewStatusNote submission={project} />
            {hasPermission('validate-submission') && (
                <ReviewPanel
                    submission={project}
                    onReviewed={(decision) => { setReviewed(decision); loadProject(); }}
                />
            )}

            <article className="pd-card animate-fade-in">
                {/* ── Header ──────────────────────────────────────────────── */}
                <header className="pd-head">
                    <div className="pd-head-top">
                        <div className="pd-badges">
                            <StatusBadge submission={project} />
                            <InterventionBadge type={project.intervention_measurement} />
                            {project.implementation_status && <span className="badge pd-badge-plain">{project.implementation_status}</span>}
                        </div>
                        <div className="pd-actions">
                            <DownloadProjectButton submission={project} />
                            {canEditSubmission(project, user, hasPermission) && (
                                <Link to={`/submission/edit/${id}`} className="btn btn-outline pd-action">
                                    <Edit2 size={15} /> Edit
                                </Link>
                            )}
                            {hasPermission('delete-submission') && (
                                <button type="button" onClick={handleDelete} className="btn btn-outline pd-action pd-action-danger">
                                    <Trash2 size={15} /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                    <h1 className="pd-title">{project.title || 'Untitled project'}</h1>
                    <p className="pd-description">
                        {project.description || 'No description has been recorded for this project.'}
                    </p>
                    {project.link && (
                        <a href={project.link} target="_blank" rel="noreferrer" className="pd-link">View project website →</a>
                    )}
                </header>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="pd-body">
                    <div className="pd-main">
                        <Section icon={<Target size={16} strokeWidth={1.75} />} title="Project Context">
                            <Rows
                                heading="Key Identifiers"
                                rows={[
                                    [IMPORTED.has(project.data_source) ? 'Imported' : 'Created',
                                        project.createdate ? formatDate(project.createdate) : null],
                                    ['Last updated', project.updatedate ? formatDate(project.updatedate) : null],
                                    ['Intervention Type', project.intervention_measurement],
                                    ['Implementation Status', project.implementation_status],
                                    ['Data Source', project.data_source ? <code className="pd-code">{sourceLabel(project.data_source)}</code> : null],
                                    ['Other Partners', partners],
                                    ['Research', project.research],
                                    ['Platform', project.platform],
                                ]}
                            />
                        </Section>

                        {(geo.country || geo.province || geo.district || points.length > 0) && (
                            <Section icon={<MapPin size={16} strokeWidth={1.75} />} title="Location">
                                <Rows
                                    rows={[
                                        ['Country', countryName(geo.country)],
                                        ['Province', geo.province],
                                        ['District', geo.district],
                                        ['Local Municipality', geo.local_municipality],
                                        ['Town / Suburb', geo.town || geo.town_suburb],
                                    ]}
                                />
                                {points.length > 0 && (
                                    <div className="pd-map">
                                        <Suspense fallback={<p className="report-empty">Loading map…</p>}>
                                            <LocationMap points={points} zoom={precision.zoom} type={project.intervention_measurement} />
                                        </Suspense>
                                        <p className="pd-map-note">{precision.label}</p>
                                    </div>
                                )}
                            </Section>
                        )}

                        {m && (
                            <Section icon={<Zap size={16} strokeWidth={1.75} />} title="Mitigation Details">
                                <Rows
                                    rows={[
                                        ['Sector', tag(m.sector)],
                                        ['Subsector', m.subsector],
                                        ['Project Type', m.project_type],
                                        ['Project Subtype', m.project_subtype],
                                        ['Programme', m.mitigation_program],
                                        ['National Policy', m.national_policy],
                                        ['Provincial / Municipal', m.provincial_municipal],
                                        ['Primary Outcome', m.primary_intended_outcome],
                                        ['Environmental Co-benefit', m.environmental_co_benefit],
                                        ['Social Co-benefit', m.social_co_benefit],
                                        ['Economic Co-benefit', m.economic_co_benefit],
                                        ['Carbon Credits', m.carbon_credit],
                                    ]}
                                />
                            </Section>
                        )}

                        {a && (
                            <Section icon={<Leaf size={16} strokeWidth={1.75} />} title="Adaptation Details">
                                <Rows
                                    rows={[
                                        ['Sector', tag(a.sector)],
                                        ['Hazard', a.hazard],
                                        ['National Policy', a.national_policy],
                                        ['Provincial / Municipal', a.provincial_municipal],
                                        ['Intervention Goal', a.intervention_goal],
                                        ['Climate Impact', a.climate_impact],
                                        ['Address Climate Impact', a.address_climate_impact],
                                        ['Impact Response', a.impact_response],
                                    ]}
                                />
                            </Section>
                        )}

                        <Section icon={<FileText size={16} strokeWidth={1.75} />} title="Progress Reports (MRV)">
                            {project.progress_reports && project.progress_reports.length > 0 ? (
                                <ul className="pd-box pd-reports">
                                    {project.progress_reports.map((report) => (
                                        <li key={report.id}>
                                            <a href={resolveFileUrl(report.file_url)} target="_blank" rel="noreferrer">
                                                <FileDown size={15} /> {report.file_name}
                                            </a>
                                            {report.upload_date && <span className="pd-muted">{formatDate(report.upload_date)}</span>}
                                            {report.notes && <p className="pd-muted">{report.notes}</p>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="pd-empty">
                                    <span className="pd-empty-icon" aria-hidden="true"><FolderOpen size={20} strokeWidth={1.75} /></span>
                                    <p>No reports attached to this submission.</p>
                                </div>
                            )}
                        </Section>
                    </div>

                    {/* ── Sidebar ─────────────────────────────────────────── */}
                    <aside className="pd-side">
                        <h3 className="pd-side-title">Management Details</h3>

                        <SidebarRow icon={<Building size={16} strokeWidth={1.75} />} label="Implementation Org">
                            <div className="pd-fact-value">{project.implementation_organization || <span className="pd-none">Not recorded</span>}</div>
                        </SidebarRow>

                        <SidebarRow icon={<Mail size={16} strokeWidth={1.75} />} label="Project Manager">
                            <div className="pd-fact-value">{project.project_manager_name || <span className="pd-none">Not recorded</span>}</div>
                            {project.project_manager_organization && <div className="pd-fact-sub">{project.project_manager_organization}</div>}
                            {project.project_manager_email && (
                                <a className="pd-fact-link" href={`mailto:${project.project_manager_email}`}>{project.project_manager_email}</a>
                            )}
                            {project.project_manager_contact_number && <div className="pd-fact-sub">{project.project_manager_contact_number}</div>}
                        </SidebarRow>

                        <SidebarRow icon={<Banknote size={16} strokeWidth={1.75} />} label="Funding Details">
                            {!hasFunding && <div className="pd-none">Not designated</div>}
                            {project.funding_organization && <div className="pd-fact-value">{project.funding_organization}</div>}
                            {project.funding_type && <div className="pd-fact-sub">Type: {project.funding_type}</div>}
                            {project.funding_amount != null && <div className="pd-fact-sub">Amount: {formatZAR(project.funding_amount)}</div>}
                            {project.estimated_budget_cost && <div className="pd-fact-sub">Estimate: {project.estimated_budget_cost}</div>}
                        </SidebarRow>

                        <SidebarRow icon={<Clock size={16} strokeWidth={1.75} />} label="Timeline">
                            {when ? <div className="pd-fact-value">{when}</div> : <div className="pd-none">No dates recorded</div>}
                        </SidebarRow>
                    </aside>
                </div>
            </article>
        </div>
    );
};

export default SubmissionDetails;
