// ─────────────────────────────────────────────────────────────────────────────
// YearColumns — projects per start year as columns on one baseline. Gaps
// between years are filled with zero so the time axis stays even. Only the
// peak year is labelled; every column has a hover/focus readout and the
// collapsible table carries all values.
// ─────────────────────────────────────────────────────────────────────────────

const HEIGHT = 180;
const PAD = { top: 20, right: 8, bottom: 24, left: 40 };
const COLUMN_MAX = 24;

/** Round up to a clean axis maximum (1, 2 or 5 × a power of ten). */
const niceMax = (value) => {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 5, 10].map((m) => m * power).find((m) => m >= value);
};

const YearColumns = ({ data = [], unknown = 0 }) => {
    if (!data.length) return <p className="report-empty">No start dates recorded for this selection.</p>;

    const first = data[0].year;
    const last = data[data.length - 1].year;
    const byYear = Object.fromEntries(data.map((d) => [d.year, d.count]));
    const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
        .map((year) => ({ year, count: byYear[year] || 0 }));

    const width = Math.max(years.length * 28 + PAD.left + PAD.right, 320);
    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(...years.map((d) => d.count)));
    const band = plotW / years.length;
    const colW = Math.min(COLUMN_MAX, band - 4);
    const y = (v) => PAD.top + plotH - (v / max) * plotH;
    const ticks = [0, max / 2, max];
    const peak = years.reduce((a, b) => (b.count > a.count ? b : a));
    const labelEvery = Math.ceil(years.length / 12);

    return (
        <div>
            <div className="chart-scroll">
                <svg
                    viewBox={`0 0 ${width} ${HEIGHT}`}
                    // Fill the panel; on narrow screens keep a readable minimum and scroll.
                    style={{ width: '100%', minWidth: `${Math.min(width, 560)}px`, height: 'auto', display: 'block' }}
                    role="img"
                    aria-label={`Projects by start year, ${first} to ${last}. Peak: ${peak.count} in ${peak.year}.`}
                >
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
                            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="chart-axis-text">
                                {t.toLocaleString()}
                            </text>
                        </g>
                    ))}
                    {years.map((d, i) => {
                        const x = PAD.left + i * band + (band - colW) / 2;
                        const h = (d.count / max) * plotH;
                        const r = Math.min(4, h / 2);
                        const top = y(d.count);
                        const base = PAD.top + plotH;
                        return (
                            <g key={d.year} tabIndex={0} className="chart-column" aria-label={`${d.year}: ${d.count} projects`}>
                                <title>{`${d.year}: ${d.count.toLocaleString()} project${d.count === 1 ? '' : 's'}`}</title>
                                {/* Transparent hit area: the whole band, taller than the mark. */}
                                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" />
                                {d.count > 0 && (
                                    <path
                                        d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + colW - r} Q${x + colW},${top} ${x + colW},${top + r} V${base} Z`}
                                        fill="var(--chart-series)"
                                    />
                                )}
                                {d === peak && (
                                    <text x={x + colW / 2} y={top - 6} textAnchor="middle" className="chart-value-text">
                                        {d.count.toLocaleString()}
                                    </text>
                                )}
                                {i % labelEvery === 0 && (
                                    <text x={x + colW / 2} y={HEIGHT - 6} textAnchor="middle" className="chart-axis-text">
                                        {d.year}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            {unknown > 0 && (
                <p className="report-note">{unknown.toLocaleString()} projects have no start date and are not shown.</p>
            )}
            <details className="report-table-toggle no-print">
                <summary>Show as table</summary>
                <table className="report-table">
                    <thead><tr><th>Start year</th><th>Projects</th></tr></thead>
                    <tbody>
                        {data.map((d) => <tr key={d.year}><td>{d.year}</td><td>{d.count.toLocaleString()}</td></tr>)}
                    </tbody>
                </table>
            </details>
        </div>
    );
};

export default YearColumns;
