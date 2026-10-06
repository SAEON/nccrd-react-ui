// ─────────────────────────────────────────────────────────────────────────────
// StackedColumns — a count per year, stacked by project type, on one baseline.
// Missing years are filled with zero so the time axis stays even. Segments are
// separated by a 2px gap and the top of each column is rounded; only the peak
// total is labelled. Hovering or focusing a column lists every type for that
// year, and the table view carries all values.
// ─────────────────────────────────────────────────────────────────────────────
import { typeColor } from '../../utils/typeColors';
import SeriesLegend from './SeriesLegend';
import DataTable from './DataTable';

const HEIGHT = 200;
const PAD = { top: 22, right: 8, bottom: 24, left: 44 };
const COLUMN_MAX = 24;
const GAP = 2;

/** Round up to a clean axis maximum (1, 2 or 5 × a power of ten). */
const niceMax = (value) => {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 5, 10].map((m) => m * power).find((m) => m >= value);
};

const StackedColumns = ({ data, emptyText = 'No dates recorded for this selection.' }) => {
    const { series } = data;
    if (!data.rows.length) return <p className="report-empty">{emptyText}</p>;

    const first = data.rows[0].label;
    const last = data.rows[data.rows.length - 1].label;
    const byYear = Object.fromEntries(data.rows.map((r) => [r.label, r.values]));
    const years = Array.from({ length: last - first + 1 }, (_, i) => {
        const values = byYear[first + i] || {};
        return { year: first + i, values, total: series.reduce((n, s) => n + (values[s] || 0), 0) };
    });

    const width = Math.max(years.length * 28 + PAD.left + PAD.right, 320);
    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(...years.map((d) => d.total)));
    const scale = (v) => (v / max) * plotH;
    const base = PAD.top + plotH;
    const band = plotW / years.length;
    const colW = Math.min(COLUMN_MAX, band - 4);
    const peak = years.reduce((a, b) => (b.total > a.total ? b : a));
    const labelEvery = Math.ceil(years.length / 12);

    return (
        <div>
            <SeriesLegend series={series} />
            <div className="chart-scroll">
                <svg
                    viewBox={`0 0 ${width} ${HEIGHT}`}
                    style={{ width: '100%', minWidth: `${Math.min(width, 560)}px`, height: 'auto', display: 'block' }}
                    role="img"
                    aria-label={`Projects under way per year, ${first} to ${last}. Peak: ${peak.total} in ${peak.year}.`}
                >
                    {[0, max / 2, max].map((t) => (
                        <g key={t}>
                            <line x1={PAD.left} x2={width - PAD.right} y1={base - scale(t)} y2={base - scale(t)} stroke="var(--chart-grid)" strokeWidth="1" />
                            <text x={PAD.left - 6} y={base - scale(t) + 4} textAnchor="end" className="chart-axis-text">{t.toLocaleString()}</text>
                        </g>
                    ))}
                    {years.map((d, i) => {
                        const x = PAD.left + i * band + (band - colW) / 2;
                        // Stack bottom-up in series order, leaving a 2px surface gap between segments.
                        let top = base;
                        const present = series.filter((s) => d.values[s]);
                        const segments = present.map((s, j) => {
                            const h = Math.max(scale(d.values[s]) - (j ? GAP : 0), 0.5);
                            top -= h + (j ? GAP : 0);
                            return { s, y: top, h, isTop: j === present.length - 1 };
                        });
                        const readout = `${d.year}: ${d.total.toLocaleString()} projects`
                            + (d.total ? ` (${present.map((s) => `${s} ${d.values[s]}`).join(', ')})` : '');
                        return (
                            <g key={d.year} tabIndex={0} className="chart-column" aria-label={readout}>
                                <title>{readout}</title>
                                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" />
                                {segments.map(({ s, y, h, isTop }) => {
                                    const r = isTop ? Math.min(4, h / 2) : 0;
                                    return (
                                        <path
                                            key={s}
                                            fill={typeColor(s)}
                                            d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + colW - r} Q${x + colW},${y} ${x + colW},${y + r} V${y + h} Z`}
                                        />
                                    );
                                })}
                                {d === peak && (
                                    <text x={x + colW / 2} y={base - scale(d.total) - 6} textAnchor="middle" className="chart-value-text">
                                        {d.total.toLocaleString()}
                                    </text>
                                )}
                                {i % labelEvery === 0 && (
                                    <text x={x + colW / 2} y={HEIGHT - 6} textAnchor="middle" className="chart-axis-text">{d.year}</text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <DataTable data={data} labelHeader="Year" />
        </div>
    );
};

export default StackedColumns;
