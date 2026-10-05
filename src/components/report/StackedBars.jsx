// ─────────────────────────────────────────────────────────────────────────────
// StackedBars — one horizontal bar per category, split by project type, with
// the row total at the bar's tip. Segments are separated by a 2px gap; hover
// or focus a segment for its exact count. Data shape: { series, rows: [{ label,
// values: { [series]: count } }] } (see /report/summary).
//
// "Not specified" is left out of the bars (it would set the scale and squash
// every real category) and stated as a note instead; the table keeps it.
// ─────────────────────────────────────────────────────────────────────────────
import { typeColor } from '../../utils/typeColors';
import SeriesLegend from './SeriesLegend';
import DataTable from './DataTable';

const total = (row, series) => series.reduce((n, s) => n + (row.values[s] || 0), 0);

const NOT_SPECIFIED = 'Not specified';

const StackedBars = ({ data, emptyText = 'No data for this selection.', unspecifiedText = 'have nothing recorded here' }) => {
    const { series } = data;
    const rows = data.rows.filter((r) => r.label !== NOT_SPECIFIED);
    const unspecified = data.rows.find((r) => r.label === NOT_SPECIFIED);
    const note = unspecified && (
        <p className="report-note">{total(unspecified, series).toLocaleString()} projects {unspecifiedText}.</p>
    );
    if (!rows.length) return <>{<p className="report-empty">{emptyText}</p>}{note}</>;
    const max = Math.max(...rows.map((r) => total(r, series)));

    return (
        <div>
            <SeriesLegend series={series} />
            <ul className="bar-list">
                {rows.map((row) => {
                    const sum = total(row, series);
                    return (
                        <li key={row.label} className="bar-list-row">
                            <span className="bar-list-label">{row.label}</span>
                            <span className="bar-list-track">
                                <span className="stacked-bar" style={{ width: `max(2px, calc((100% - 4rem) * ${sum / max}))` }}>
                                    {series.filter((s) => row.values[s]).map((s) => (
                                        <span
                                            key={s}
                                            className="stacked-segment"
                                            tabIndex={0}
                                            title={`${row.label}, ${s}: ${row.values[s].toLocaleString()}`}
                                            aria-label={`${row.label}, ${s}: ${row.values[s]}`}
                                            style={{ flexGrow: row.values[s], background: typeColor(s) }}
                                        />
                                    ))}
                                </span>
                                <span className="bar-list-value">{sum.toLocaleString()}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
            {note}
            <DataTable data={data} labelHeader="Category" />
        </div>
    );
};

export default StackedBars;
