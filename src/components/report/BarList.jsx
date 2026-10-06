// ─────────────────────────────────────────────────────────────────────────────
// BarList — ranked horizontal bars for one count per category (single series,
// so no legend: the panel title names what is counted). Labels and values are
// plain text, so the list doubles as its own table view.
// ─────────────────────────────────────────────────────────────────────────────

const NOT_SPECIFIED = 'Not specified';

const BarList = ({ rows = [], total, emptyText = 'No data for this selection.', format }) => {
    if (!rows.length) return <p className="report-empty">{emptyText}</p>;
    const max = Math.max(...rows.map((r) => r.count));

    return (
        <ul className="bar-list">
            {rows.map(({ label, count }) => {
                const share = total ? Math.round((count / total) * 100) : null;
                const description = format
                    ? `${label}: ${format(count)}`
                    : `${label}: ${count.toLocaleString()} project${count === 1 ? '' : 's'}`
                        + (share !== null ? ` (${share}% of projects)` : '');
                return (
                    <li key={label} className="bar-list-row" tabIndex={0} title={description} aria-label={description}>
                        <span className="bar-list-label">{label}</span>
                        <span className="bar-list-track">
                            <span
                                className={`bar-list-bar${label === NOT_SPECIFIED ? ' is-muted' : ''}`}
                                // Reserve room for the value label so the longest bar's number stays inside the panel.
                                style={{ width: `max(2px, calc((100% - 4rem) * ${count / max}))` }}
                            />
                            <span className="bar-list-value">{format ? format(count) : count.toLocaleString()}</span>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

export default BarList;
