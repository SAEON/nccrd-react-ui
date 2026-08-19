import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSubmissionById, deleteSubmission, API_BASE_URL } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import {
    ArrowLeft, Clock, Banknote, MapPin, Building,
    Target, Activity, Edit2, Trash2, Mail,
    Leaf, Zap, FileDown, FolderOpen,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// South African Rand formatter  (Phase 2 — Localisation)
// Intl.NumberFormat produces e.g. "R 1 234 567,89" in the en-ZA locale.
// ─────────────────────────────────────────────────────────────────────────────
const formatZAR = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar fact row — keeps the sidebar DRY
// ─────────────────────────────────────────────────────────────────────────────
const SidebarRow = ({ icon, label, children }) => (
    <div className="flex items-start gap-3" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.6rem', flexShrink: 0 }}>
            {icon}
        </div>
        <div>
            <div className="input-label" style={{ margin: 0 }}>{label}</div>
            {children}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Detail list sub-panel (used for Mitigation / Adaptation sections)
// ─────────────────────────────────────────────────────────────────────────────
const resolveValue = (v) => {
    if (Array.isArray(v)) return v.map(item => item?.term ?? item).filter(Boolean).join(', ') || null;
    if (v && typeof v === 'object' && 'term' in v) return v.term;
    return v;
};

/**
 * New progress-report uploads store a root-relative file_url (served by the
 * API itself); legacy rows have a full external URL already. Only prefix
 * the ones that need it.
 */
const resolveFileUrl = (fileUrl) => (fileUrl?.startsWith('/') ? `${API_BASE_URL}${fileUrl}` : fileUrl);

const DetailPanel = ({ icon, title, rows }) => {
    const items = rows.map(([l, v]) => [l, resolveValue(v)]).filter(([, v]) => v);
    if (!items.length) return null;
    return (
        <div className="glass-panel mt-4" style={{ padding: '1.5rem', background: 'var(--bg-primary)', border: '1px solid rgba(28,61,47,0.12)' }}>
            <h4 className="mb-4 flex items-center gap-2">{icon} {title}</h4>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', margin: 0 }}>
                {items.map(([label, value]) => (
                    <li key={label} className="mb-1">
                        <strong>{label}:</strong> {value}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SubmissionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useCurrentUser();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { loadProject(); }, [id]);

    const loadProject = async () => {
        setLoading(true);
        try {
            const data = await getSubmissionById(id);
            if (!data) throw new Error('Submission not found.');
            setProject(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load this project. Ensure the database connection is active.');
        } finally {
            setLoading(false);
        }
    };

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
    const m = project.mitigation;
    const a = project.adaptation;

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            {/* Back button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link
                    to="/"
                    className="btn btn-outline mb-6"
                    style={{ display: 'inline-flex', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', marginTop: '2rem' }}
                >
                    <ArrowLeft size={16} /> Back to Projects
                </Link>

            </div>


            <div className="glass-panel animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>

                {/* ── Header ──────────────────────────────────────────────── */}
                <div style={{ background: 'var(--bg-primary)', padding: '2.5rem 3rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="flex justify-between items-start mb-4">
                        {/* Status badges */}
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            <span className="badge badge-success">{project.submission_status || 'Pending'}</span>
                            <span className="badge">{project.intervention_measurement || 'General'}</span>
                            {project.implementation_status && (
                                <span className="badge">{project.implementation_status}</span>
                            )}
                        </div>

                        {/* Action buttons — grouped top-right (Phase 2) */}
                        <div className="flex gap-2" style={{ flexShrink: 0 }}>
                            {hasPermission('update-submission') && (
                                <Link
                                    to={`/submission/edit/${id}`}
                                    className="btn btn-outline flex items-center gap-2"
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                    <Edit2 size={15} /> Edit
                                </Link>
                            )}
                            {hasPermission('delete-submission') && (
                                <button
                                    onClick={handleDelete}
                                    className="btn btn-outline flex items-center gap-2"
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                >
                                    <Trash2 size={15} /> Delete
                                </button>
                            )}
                        </div>
                    </div>

                    <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                        {project.title || `Project ${project.id}`}
                    </h1>
                    <p style={{ fontSize: '1.05rem', maxWidth: '800px', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {project.description || 'No detailed description available for this climate response project.'}
                    </p>
                    {project.link && (
                        <a
                            href={project.link} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--accent-primary)' }}
                        >
                            View Project Website →
                        </a>
                    )}
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="flex" style={{ padding: '3rem' }}>

                    {/* ── Main column ─────────────────────────────────────── */}
                    <div style={{ flex: 2, paddingRight: '2.5rem', borderRight: '1px solid var(--border-light)' }}>
                        <h3 className="mb-4 flex items-center gap-2">
                            <Target size={19} color="var(--accent-primary)" /> Project Context
                        </h3>

                        {/* Key identifiers */}
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-primary)', border: '1px solid rgba(28,61,47,0.1)' }}>
                            <h4 className="mb-4">Key Identifiers</h4>
                            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', margin: 0 }}>
                                {/* <li className="mb-2"><strong>Project ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{project.id}</span></li> */}
                                <li className="mb-2"><strong>Created:</strong> {project.createdate ? new Date(project.createdate).toLocaleDateString('en-ZA') : 'Unknown'}</li>
                                <li className="mb-2"><strong>Intervention Type:</strong> {project.intervention_measurement || '—'}</li>
                                <li className="mb-2"><strong>Implementation Status:</strong> {project.implementation_status || '—'}</li>
                                {project.research && <li className="mb-2"><strong>Research:</strong> {project.research}</li>}
                                {project.platform && <li className="mb-2"><strong>Platform:</strong> {project.platform}</li>}
                                {project.data_source && <li className="mb-2"><strong>Data Source:</strong> {project.data_source}</li>}
                                {project.implementation_partners_other && (
                                    <li className="mb-2"><strong>Other Partners:</strong> {project.implementation_partners_other}</li>
                                )}
                            </ul>
                        </div>

                        {/* Geographic location */}
                        {(geo.country || geo.province || geo.district) && (
                            <DetailPanel
                                icon={<MapPin size={15} color="var(--accent-primary)" />}
                                title="Location"
                                rows={[
                                    ['Country', geo.country],
                                    ['Province', geo.province],
                                    ['District', geo.district],
                                    ['Local Municipality', geo.local_municipality],
                                    ['Town / Suburb', geo.town_suburb],
                                ]}
                            />
                        )}

                        {/* Mitigation details */}
                        {m && (
                            <DetailPanel
                                icon={<Zap size={15} color="var(--accent-primary)" />}
                                title="Mitigation Details"
                                rows={[
                                    ['Sector', m.sector],
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
                        )}

                        {/* Adaptation details */}
                        {a && (
                            <DetailPanel
                                icon={<Leaf size={15} color="var(--accent-primary)" />}
                                title="Adaptation Details"
                                rows={[
                                    ['Sector', a.sector],
                                    ['Hazard', a.hazard],
                                    ['National Policy', a.national_policy],
                                    ['Provincial / Municipal', a.provincial_municipal],
                                    ['Intervention Goal', a.intervention_goal],
                                    ['Climate Impact', a.climate_impact],
                                    ['Address Climate Impact', a.address_climate_impact],
                                    ['Impact Response', a.impact_response],
                                ]}
                            />
                        )}

                        {/* ── MRV / Progress Reports (Phase 2) ──────────────── */}
                        <div className="glass-panel mt-4" style={{ padding: '1.5rem', background: 'var(--bg-primary)', border: '1px solid rgba(28,61,47,0.1)' }}>
                            <h4 className="mb-4 flex items-center gap-2">
                                <FolderOpen size={15} color="var(--accent-primary)" /> Progress Reports (MRV)
                            </h4>

                            {project.progress_reports && project.progress_reports.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {project.progress_reports.map((report) => (
                                        <li key={report.id} style={{ marginBottom: '0.75rem' }}>
                                            <a
                                                href={resolveFileUrl(report.file_url)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                    color: 'var(--accent-primary)', textDecoration: 'none',
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                <FileDown size={15} />
                                                {report.file_name}
                                            </a>
                                            {report.upload_date && (
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                                    {new Date(report.upload_date).toLocaleDateString('en-ZA')}
                                                </span>
                                            )}
                                            {report.notes && (
                                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{report.notes}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                                    No reports attached to this submission.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Sidebar ─────────────────────────────────────────── */}
                    <div style={{ flex: 1, paddingLeft: '2.5rem' }}>
                        <h3 className="mb-5">Management Details</h3>

                        {/* Implementation org */}
                        <SidebarRow icon={<Building size={17} color="var(--accent-primary)" />} label="Implementation Org">
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {project.implementation_organization || 'N/A'}
                            </div>
                        </SidebarRow>

                        {/* Project manager */}
                        <SidebarRow icon={<Mail size={17} color="var(--accent-primary)" />} label="Project Manager">
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {project.project_manager_name || 'Unassigned'}
                            </div>
                            {project.project_manager_organization && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {project.project_manager_organization}
                                </div>
                            )}
                            {project.project_manager_email && (
                                <a
                                    href={`mailto:${project.project_manager_email}`}
                                    style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-primary)' }}
                                >
                                    {project.project_manager_email}
                                </a>
                            )}
                            {project.project_manager_contact_number && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {project.project_manager_contact_number}
                                </div>
                            )}
                        </SidebarRow>

                        {/* Funding — Banknote icon, ZAR formatting (Phase 2) */}
                        <SidebarRow icon={<Banknote size={17} color="var(--accent-primary)" />} label="Funding Details">
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {project.funding_organization || 'Not designated'}
                            </div>
                            {project.funding_type && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Type: {project.funding_type}
                                </div>
                            )}
                            {project.funding_amount != null && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Amount: {formatZAR(project.funding_amount)}
                                </div>
                            )}
                            {project.estimated_budget_cost && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Estimate: {project.estimated_budget_cost}
                                </div>
                            )}
                        </SidebarRow>

                        {/* Timeline */}
                        <SidebarRow icon={<Clock size={17} color="var(--accent-primary)" />} label="Timeline">
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {project.start_date ? new Date(project.start_date).toLocaleDateString('en-ZA') : 'TBD'}
                                {' – '}
                                {project.end_date ? new Date(project.end_date).toLocaleDateString('en-ZA') : 'TBD'}
                            </div>
                        </SidebarRow>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetails;
