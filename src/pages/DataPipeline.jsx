/**
 * DataPipeline.jsx — curators' read-only view of the data pipeline
 * (validate-submission permission).
 *
 * What each source last loaded and what the app holds from it, projects where
 * an app edit and a source change disagree, and the data-quality issues the
 * pipeline found, each opening a worklist of the projects it affects. Loading
 * data is done with the pipeline's command line (nccrd-build/PIPELINE.md).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getPipelineStatus, getPipelineIssueProjects } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { sourceLabel } from '../utils/dataSources';

const PAGE_SIZE = 50;

const FIELDS = {
    'geo_location.province': 'Province',
    'geo_location.coordinates': 'Coordinates',
    estimated_budget_cost: 'Budget range',
    implementation_status: 'Implementation status',
    intervention_measurement: 'Type of measure',
    funding_type: 'Funding type',
};
const fieldLabel = (field) => FIELDS[field] || field.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/** "update 309, excluded 877" from a run's summary (merge actions, or a clean-up's counts). */
const runSummary = (summary) => {
    const counts = summary?.actions || summary || {};
    return Object.entries(counts).filter(([, n]) => typeof n === 'number').map(([k, n]) => `${k.replace(/_/g, ' ')} ${n.toLocaleString()}`).join(', ');
};

const Worklist = ({ issue }) => {
    const [projects, setProjects] = useState([]);
    const [total, setTotal] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = (offset) => {
        setLoading(true);
        getPipelineIssueProjects({ data_source: issue.data_source, field: issue.field, issue: issue.issue, limit: PAGE_SIZE, offset })
            .then((data) => {
                setProjects((prev) => (offset ? [...prev, ...data.projects] : data.projects));
                setTotal(data.total);
                setLoading(false);
            })
            .catch((err) => { setError(err.message || 'Could not load the projects.'); setLoading(false); });
    };
    useEffect(() => { load(0); }, [issue.data_source, issue.field, issue.issue]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error) return <p className="report-error" role="alert">{error}</p>;
    return (
        <div className="pipeline-worklist">
            {total === null ? <p className="report-empty">Loading…</p> : (
                <ul className="review-list">
                    {projects.map((p) => (
                        <li key={p.id}>
                            <Link to={`/submission/${p.id}`} className="glass-panel review-row">
                                <span className="review-row-main">
                                    <strong>{p.title || 'Untitled project'}</strong>
                                    <span className="review-row-meta">
                                        {[p.implementation_organization, p.public ? 'public' : 'not public', p.value && `found: ${p.value}`].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {total !== null && projects.length < total && (
                <button type="button" className="btn btn-outline" disabled={loading} onClick={() => load(projects.length)}>
                    Show more ({(total - projects.length).toLocaleString()} remaining)
                </button>
            )}
        </div>
    );
};

const DataPipeline = () => {
    const { hasPermission, loading: authLoading } = useCurrentUser();
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(null);
    const isCurator = hasPermission('validate-submission');

    useEffect(() => {
        if (!isCurator) return;
        getPipelineStatus().then(setStatus).catch((err) => setError(err.message || 'Could not load the data pipeline status.'));
    }, [isCurator]);

    if (authLoading) return null;
    if (!isCurator) return (
        <div className="container" style={{ paddingBlock: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Curators only</h3>
                <p>You need the reviewer permission (validate-submission) to see the data pipeline.</p>
            </div>
        </div>
    );

    const issueKey = (i) => `${i.data_source}|${i.field}|${i.issue}`;

    return (
        <div className="container pipeline-page" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/review" className="report-back"><ArrowLeft size={16} /> Back to the review queue</Link>
            <header>
                <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>Data pipeline</h1>
                <p className="report-lede">
                    What the data pipeline has loaded into the app from the legacy NCCRD and the provincial registers, projects where an
                    edit in the app and a change in the source disagree, and the data-quality issues it found. Open an issue for the list of
                    projects to fix.
                </p>
            </header>

            {error && <div className="glass-panel report-error" role="alert">{error}</div>}
            {!status && !error && <p className="report-empty">Loading…</p>}
            {status && !status.available && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <p className="report-empty">The data pipeline hasn’t been run on this database yet.</p>
                </div>
            )}
            {status?.available && (
                <div className="report-grid">
                    <section className="glass-panel report-panel is-wide" aria-labelledby="pipeline-sources">
                        <h2 className="report-panel-title" id="pipeline-sources">Sources</h2>
                        <p className="report-panel-subtitle">
                            {status.loads.map((l) => `${l.source}: ${l.file_name}, loaded ${formatDate(l.loaded_at)}`).join(' · ')}
                        </p>
                        <div className="chart-scroll">
                            <table className="report-table">
                                <thead>
                                    <tr><th>Source</th><th>Rows in the source</th><th>Kept out</th><th>In the app</th><th>Public</th></tr>
                                </thead>
                                <tbody>
                                    {status.sources.map((s) => (
                                        <tr key={s.data_source}>
                                            <td>{sourceLabel(s.data_source)}</td>
                                            <td>{s.in_source.toLocaleString()}</td>
                                            <td>{s.excluded.toLocaleString()}</td>
                                            <td>{s.in_app.toLocaleString()}</td>
                                            <td>{s.public.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="glass-panel report-panel" aria-labelledby="pipeline-runs">
                        <h2 className="report-panel-title" id="pipeline-runs">Recent runs</h2>
                        {status.runs.length === 0 ? <p className="report-empty">None yet.</p> : (
                            <ul className="pipeline-runs">
                                {status.runs.map((r) => (
                                    <li key={`${r.kind}-${r.ran_at}`}><strong>{r.kind}</strong> · {formatDate(r.ran_at)}<br /><span className="review-row-meta">{runSummary(r.summary)}</span></li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="glass-panel report-panel" aria-labelledby="pipeline-conflicts">
                        <h2 className="report-panel-title" id="pipeline-conflicts">Conflicts</h2>
                        <p className="report-panel-subtitle">Changed in the app and in the source. The app’s version is kept.</p>
                        {status.conflicts.length === 0 ? <p className="report-empty">None.</p> : (
                            <ul className="pipeline-runs">
                                {status.conflicts.map((c) => (
                                    <li key={c.id}>
                                        <Link to={`/submission/${c.id}`}>{c.title || 'Untitled project'}</Link>
                                        <br /><span className="review-row-meta">{[c.reason, (c.fields || []).map(fieldLabel).join(', ')].filter(Boolean).join(' · ')}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="glass-panel report-panel is-wide" aria-labelledby="pipeline-issues">
                        <h2 className="report-panel-title" id="pipeline-issues">Data quality</h2>
                        <p className="report-panel-subtitle">Issues found while loading, counted over projects in the app.</p>
                        {status.issues.length === 0 ? <p className="report-empty">No issues.</p> : (
                            <div className="chart-scroll">
                                <table className="report-table">
                                    <thead><tr><th>Source</th><th>Field</th><th>Issue</th><th>Projects</th><th /></tr></thead>
                                    <tbody>
                                        {status.issues.map((i) => (
                                            <tr key={issueKey(i)}>
                                                <td>{sourceLabel(i.data_source)}</td>
                                                <td>{fieldLabel(i.field)}</td>
                                                <td>{i.issue}</td>
                                                <td>{i.projects.toLocaleString()}</td>
                                                <td>
                                                    <button type="button" className="btn btn-outline btn-sm" aria-expanded={open === issueKey(i)}
                                                        onClick={() => setOpen(open === issueKey(i) ? null : issueKey(i))}>
                                                        {open === issueKey(i) ? 'Hide' : 'Show projects'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {open && <Worklist key={open} issue={status.issues.find((i) => issueKey(i) === open)} />}
                    </section>
                </div>
            )}
        </div>
    );
};

export default DataPipeline;
