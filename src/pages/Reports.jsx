/**
 * Reports.jsx — public data reports for the NCCRD.
 *
 *   – Summary: headline tiles + breakdowns (province, status, sectors, hazards,
 *     funding type, start year) from GET /report/summary.
 *   – Downloads: the filtered projects as Excel or CSV (GET /report/export).
 *   – Printable summary: the browser's print view of the same page; controls
 *     and the data-quality section are hidden by the print stylesheet.
 *   – Data quality: field completeness overall and per data source, from
 *     GET /report/quality.
 *
 * Province and type filters apply to everything on the page, including the
 * downloads, and use the same API parameters as the project search.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { getFacets, getReportSummary, getReportQuality, reportExportUrl } from '../services/api';
import FacetSelect from '../components/FacetSelect';
import BarList from '../components/report/BarList';
import YearColumns from '../components/report/YearColumns';

const TYPES = ['Mitigation', 'Adaptation', 'Cross Cutting'];
const PROVINCE_LABELS = { National: 'South Africa (National)' };

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', notation: 'compact', maximumFractionDigits: 1 });
const countOf = (rows, label) => rows?.find((r) => r.label === label)?.count ?? 0;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

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

const Reports = () => {
    const [province, setProvince] = useState('');
    const [type, setType] = useState('');
    const [provinces, setProvinces] = useState([]);
    const [summary, setSummary] = useState(null);
    const [quality, setQuality] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const params = {
        ...(province && { province }),
        ...(type && { intervention_measurement: type }),
    };
    const paramsKey = JSON.stringify(params);

    useEffect(() => {
        getFacets()
            .then((f) => setProvinces(f.province ?? []))
            .catch((err) => console.warn('[NCCRD] Could not load provinces for reports.', err));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        Promise.all([
            getReportSummary(params, { signal: controller.signal }),
            getReportQuality(params, { signal: controller.signal }),
        ])
            .then(([s, q]) => { setSummary(s); setQuality(q); setLoading(false); })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setError('Could not load the reports. Check that the API is running and try again.');
                setLoading(false);
            });
        return () => controller.abort();
    }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const scopeText = [
        province ? (PROVINCE_LABELS[province] ?? province) : 'All provinces',
        type || 'All project types',
    ].join(' · ');
    const total = summary?.total ?? 0;

    return (
        <div className="container reports-page" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/" className="no-print report-back"><ArrowLeft size={16} /> Back to projects</Link>

            <header className="report-header">
                <h1>Data reports</h1>
                <p className="report-lede">
                    Climate change response projects recorded in the National Climate Change Response Database.
                </p>
                <p className="report-scope">
                    {scopeText} · Generated {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </header>

            {/* ── Filters + actions (hidden when printing) ───────────────── */}
            <div className="glass-panel report-controls no-print">
                <div className="report-filters">
                    <FacetSelect
                        id="report-province"
                        label="Province"
                        value={province}
                        options={provinces}
                        labels={PROVINCE_LABELS}
                        pinned={['National']}
                        onChange={setProvince}
                    />
                    <FacetSelect id="report-type" label="Project type" value={type} options={TYPES} onChange={setType} />
                </div>
                <div className="report-actions">
                    <a className="btn btn-primary" href={reportExportUrl(params, 'xlsx')}>
                        <Download size={16} /> Download Excel
                    </a>
                    <a className="btn btn-outline" href={reportExportUrl(params, 'csv')}>
                        <Download size={16} /> Download CSV
                    </a>
                    <button type="button" className="btn btn-outline" onClick={() => window.print()}>
                        <Printer size={16} /> Print summary
                    </button>
                </div>
                <p className="report-note" style={{ width: '100%', margin: 0 }}>
                    Downloads include every project matching these filters. Contact emails and phone numbers are not included.
                </p>
            </div>

            {error && <div className="glass-panel report-error" role="alert">{error}</div>}

            {summary && (
                <div aria-busy={loading} style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                    {/* ── Headline figures ───────────────────────────────── */}
                    <div className="stat-tiles">
                        <StatTile hero label="Projects" value={total.toLocaleString()} />
                        {TYPES.map((t) => (
                            <StatTile
                                key={t}
                                label={t}
                                value={countOf(summary.by_type, t).toLocaleString()}
                                note={`${pct(countOf(summary.by_type, t), total)}% of projects`}
                            />
                        ))}
                        <StatTile
                            label="Recorded budget"
                            value={zar.format(summary.funding.total_amount)}
                            note={`from ${summary.funding.projects_with_amount.toLocaleString()} projects that report one`}
                        />
                        {summary.funding.median_amount !== null && (
                            <StatTile
                                label="Typical project budget"
                                value={zar.format(summary.funding.median_amount)}
                                note="median; a few very large projects dominate the total"
                            />
                        )}
                    </div>

                    {/* ── Breakdowns ─────────────────────────────────────── */}
                    <div className="report-grid">
                        <Panel title="Projects by province" subtitle="A project in several provinces counts in each.">
                            <BarList
                                rows={summary.by_province.map((r) => ({ ...r, label: PROVINCE_LABELS[r.label] ?? r.label }))}
                                total={total}
                            />
                        </Panel>
                        <Panel title="Implementation status">
                            <BarList rows={summary.by_status} total={total} />
                        </Panel>
                        <Panel title="Mitigation sectors" subtitle="Top 12, mitigation and cross-cutting projects.">
                            <BarList rows={summary.mitigation_sectors} />
                        </Panel>
                        <Panel title="Adaptation sectors" subtitle="Top 12, adaptation and cross-cutting projects.">
                            <BarList rows={summary.adaptation_sectors} />
                        </Panel>
                        <Panel title="Climate hazards addressed" subtitle="Adaptation projects; one project can address several.">
                            <BarList rows={summary.hazards} />
                        </Panel>
                        <Panel title="Funding type">
                            <BarList rows={summary.by_funding_type} total={total} />
                        </Panel>
                        <Panel title="Projects by start year" wide>
                            <YearColumns data={summary.by_start_year} unknown={summary.start_year_unknown} />
                        </Panel>
                    </div>

                    {/* ── Data quality (screen only) ─────────────────────── */}
                    {quality && (
                        <section className="report-quality no-print">
                            <h2>Data quality</h2>
                            <p className="report-lede">
                                How complete the {quality.total.toLocaleString()} project records are. Gaps here are why some
                                projects are missing from the charts above.
                            </p>
                            <div className="report-grid">
                                <Panel title="Fields filled in" subtitle="Share of projects with each field recorded.">
                                    <ul className="completeness-list">
                                        {quality.fields.map((f) => {
                                            const share = pct(f.filled, quality.total);
                                            return (
                                                <li key={f.field} tabIndex={0} title={`${f.label}: ${f.filled.toLocaleString()} filled, ${f.missing.toLocaleString()} missing`}>
                                                    <span className="bar-list-label">{f.label}</span>
                                                    <span className="completeness-meter"><span style={{ width: `${share}%` }} /></span>
                                                    <span className="completeness-value">{share}%</span>
                                                    <span className="completeness-missing">{f.missing.toLocaleString()} missing</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </Panel>
                                <Panel title="By data source" subtitle="Share filled in, per source the records came from.">
                                    <div className="chart-scroll">
                                        <table className="report-table">
                                            <thead>
                                                <tr>
                                                    <th>Source</th>
                                                    <th>Projects</th>
                                                    {['province', 'coordinates', 'start_date', 'funding_amount', 'project_manager_email'].map((key) => (
                                                        <th key={key}>{quality.fields.find((f) => f.field === key)?.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {quality.by_source.map((src) => (
                                                    <tr key={src.source}>
                                                        <td>{src.source}</td>
                                                        <td>{src.total.toLocaleString()}</td>
                                                        {['province', 'coordinates', 'start_date', 'funding_amount', 'project_manager_email'].map((key) => {
                                                            const f = src.fields.find((x) => x.field === key);
                                                            return <td key={key}>{pct(f.filled, src.total)}%</td>;
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="report-note">
                                        {quality.duplicate_titles.groups.toLocaleString()} titles are shared by more than one project
                                        ({quality.duplicate_titles.projects.toLocaleString()} projects): possible duplicates to review.
                                    </p>
                                </Panel>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {!summary && loading && !error && <p className="report-empty">Loading reports…</p>}
        </div>
    );
};

export default Reports;
