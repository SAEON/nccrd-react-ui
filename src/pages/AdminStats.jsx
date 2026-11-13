/**
 * AdminStats.jsx — the site's visitor numbers (permission view-stats): page
 * views and downloads per day, the most viewed pages and projects, and on
 * the national site, views per site. Counts only: the server keeps a number
 * per site, day and page, and nothing that identifies a visitor.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getStats } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useSite } from '../context/SiteContext';
import BarList from '../components/report/BarList';
import DailyColumns from '../components/report/DailyColumns';
import { byWeek } from '../utils/stats';

const PERIODS = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [365, 'Last year']];
const views = (n) => `${n.toLocaleString()} view${n === 1 ? '' : 's'}`;
const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

const Panel = ({ title, subtitle, children, wide = false }) => (
    <section className={`glass-panel report-panel${wide ? ' is-wide' : ''}`}>
        <h3 className="report-panel-title">{title}</h3>
        {subtitle && <p className="report-panel-subtitle">{subtitle}</p>}
        {children}
    </section>
);

const StatTile = ({ label, value, note, hero = false }) => (
    <div className={`glass-panel stat-tile${hero ? ' is-hero' : ''}`}>
        <span className="stat-tile-label">{label}</span>
        <span className="stat-tile-value">{value}</span>
        {note && <span className="stat-tile-note">{note}</span>}
    </div>
);

const AdminStats = () => {
    const { hasPermission, loading: authLoading } = useCurrentUser();
    const site = useSite();
    const canView = hasPermission('view-stats');
    const [days, setDays] = useState(30);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!canView) return;
        setError(null);
        getStats(days).then(setStats).catch((err) => setError(err.message));
    }, [canView, days]);

    const weekly = days > 90;
    const series = stats && (weekly ? byWeek(stats.days) : stats.days);

    if (authLoading) return null;
    if (!canView) return (
        <div className="container" style={{ paddingBlock: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Site administrators only</h3>
                <p>You need the view-stats permission to see the visitor numbers.</p>
            </div>
        </div>
    );

    return (
        <div className="container reports-page" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/admin/users" className="report-back"><ArrowLeft size={16} /> Back to people</Link>
            <header className="report-header">
                <h1>Visitors</h1>
                <p className="report-lede">
                    How much the {site.short_title} is used: views of its public pages and projects, and data downloads.
                    Only a count per page and day is kept: no cookies, and nothing that identifies a visitor. Visitors whose
                    browser asks not to be tracked are not counted.
                </p>
                {stats && <p className="report-scope">{longDate(stats.since)} to {longDate(stats.until)}</p>}
            </header>

            <div className="review-tabs" role="tablist" aria-label="Period">
                {PERIODS.map(([n, label]) => (
                    <button
                        key={n}
                        type="button"
                        role="tab"
                        aria-selected={days === n}
                        className={`review-tab${days === n ? ' is-active' : ''}`}
                        onClick={() => setDays(n)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && <div role="alert" className="glass-panel report-error">{error}</div>}
            {!stats ? (
                !error && <p className="report-empty">Loading…</p>
            ) : (
                <>
                    <div className="stat-tiles" style={{ marginTop: '1.25rem' }}>
                        <StatTile hero label="Page views" value={stats.views.toLocaleString()} />
                        <StatTile label="Data downloads" value={stats.downloads.toLocaleString()} note="report and project downloads" />
                        <StatTile label="People who logged in" value={stats.people_logged_in.toLocaleString()} note="on any site" />
                    </div>
                    <div className="report-grid">
                        <Panel title={`Page views per ${weekly ? 'week' : 'day'}`} wide>
                            <DailyColumns days={series} valueKey="views" noun="view" weekly={weekly} />
                        </Panel>
                        <Panel title={`Downloads per ${weekly ? 'week' : 'day'}`} wide>
                            <DailyColumns days={series} valueKey="downloads" noun="download" weekly={weekly} />
                        </Panel>
                        <Panel title="Most viewed pages">
                            <BarList rows={stats.pages.map((p) => ({ label: p.name, count: p.views }))} format={views} emptyText="No views yet." />
                        </Panel>
                        <Panel title="Most viewed projects" subtitle="The ten projects opened most often.">
                            {stats.projects.length ? (
                                <ol className="stats-projects">
                                    {stats.projects.map((p) => (
                                        <li key={p.path}><Link to={p.path}>{p.name}</Link> <span>{views(p.views)}</span></li>
                                    ))}
                                </ol>
                            ) : <p className="report-empty">No project views yet.</p>}
                        </Panel>
                        {stats.sites.length > 0 && (
                            <Panel title="Views per site" subtitle="Page views on each province site and the national one." wide>
                                <BarList rows={stats.sites.map((s) => ({ label: s.name, count: s.views }))} format={views} />
                            </Panel>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminStats;
