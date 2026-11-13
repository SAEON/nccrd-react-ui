// ─────────────────────────────────────────────────────────────────────────────
// DailyColumns — one count per day as columns on one baseline (single series,
// so no legend: the panel title names what is counted). Days without any are
// zero, so the time axis stays even. Only the peak is labelled; hovering or
// focusing a column reads its day, and the table view carries every value.
// ─────────────────────────────────────────────────────────────────────────────

const HEIGHT = 180;
const PAD = { top: 22, right: 8, bottom: 24, left: 44 };
const COLUMN_MAX = 18;

/** Round up to a clean axis maximum (1, 2 or 5 × a power of ten). */
const niceMax = (value) => {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 5, 10].map((m) => m * power).find((m) => m >= value);
};

const dayLabel = (iso, options) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', options);

/**
 * `days`: [{ day: 'YYYY-MM-DD', [valueKey]: n }], oldest first. With `weekly`,
 * each column is a week (its `day` the week's first day).
 */
const DailyColumns = ({ days, valueKey, noun, weekly = false }) => {
    const total = days.reduce((n, d) => n + d[valueKey], 0);
    if (!total) return <p className="report-empty">No {noun}s in this period yet.</p>;

    // About the panel's own width, so text isn't scaled up; a year's days get 2px columns.
    const width = 780;
    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(...days.map((d) => d[valueKey])));
    const scale = (v) => (v / max) * plotH;
    const base = PAD.top + plotH;
    const band = plotW / days.length;
    const colW = Math.max(Math.min(COLUMN_MAX, band - 2), 1);
    const peak = days.reduce((a, b) => (b[valueKey] > a[valueKey] ? b : a));
    const labelEvery = Math.ceil(days.length / 8);
    const when = (d) => (weekly
        ? `Week of ${dayLabel(d.day, { day: 'numeric', month: 'short' })}`
        : dayLabel(d.day, { weekday: 'short', day: 'numeric', month: 'short' }));
    const describe = (d) => `${when(d)}: ${d[valueKey].toLocaleString()} ${noun}${d[valueKey] === 1 ? '' : 's'}`;

    return (
        <div>
            <div className="chart-scroll">
                <svg
                    viewBox={`0 0 ${width} ${HEIGHT}`}
                    style={{ width: '100%', minWidth: `${Math.min(width, 560)}px`, height: 'auto', display: 'block' }}
                    role="img"
                    aria-label={`${noun[0].toUpperCase()}${noun.slice(1)}s per ${weekly ? 'week' : 'day'}, ${total.toLocaleString()} in all. Busiest: ${describe(peak)}.`}
                >
                    {[0, max / 2, max].map((t) => (
                        <g key={t}>
                            <line x1={PAD.left} x2={width - PAD.right} y1={base - scale(t)} y2={base - scale(t)} stroke="var(--chart-grid)" strokeWidth="1" />
                            <text x={PAD.left - 6} y={base - scale(t) + 4} textAnchor="end" className="chart-axis-text">{t.toLocaleString()}</text>
                        </g>
                    ))}
                    {days.map((d, i) => {
                        const x = PAD.left + i * band + (band - colW) / 2;
                        const h = d[valueKey] ? Math.max(scale(d[valueKey]), 1) : 0;
                        const y = base - h;
                        const r = Math.min(4, h / 2, colW / 2);
                        return (
                            <g key={d.day} tabIndex={0} className="chart-column" aria-label={describe(d)}>
                                <title>{describe(d)}</title>
                                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" />
                                {h > 0 && (
                                    <path
                                        fill="var(--chart-series)"
                                        d={`M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + colW - r} Q${x + colW},${y} ${x + colW},${y + r} V${base} Z`}
                                    />
                                )}
                                {d === peak && (
                                    <text x={x + colW / 2} y={y - 6} textAnchor="middle" className="chart-value-text">{d[valueKey].toLocaleString()}</text>
                                )}
                                {i % labelEvery === 0 && (
                                    <text x={x + colW / 2} y={HEIGHT - 6} textAnchor="middle" className="chart-axis-text">
                                        {dayLabel(d.day, { day: 'numeric', month: 'short' })}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <details className="report-table-toggle no-print">
                <summary>Show as table</summary>
                <div className="chart-scroll">
                    <table className="report-table">
                        <thead><tr><th>{weekly ? 'Week of' : 'Day'}</th><th>{noun[0].toUpperCase()}{noun.slice(1)}s</th></tr></thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d.day}><td>{dayLabel(d.day, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{d[valueKey].toLocaleString()}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
};

export default DailyColumns;
