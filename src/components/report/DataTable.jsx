// Collapsible table view of a by-type chart, so every value is reachable
// without hovering (and readable when printed).
const DataTable = ({ data, labelHeader }) => (
    <details className="report-table-toggle no-print">
        <summary>Show as table</summary>
        <div className="chart-scroll">
            <table className="report-table">
                <thead>
                    <tr><th>{labelHeader}</th>{data.series.map((s) => <th key={s}>{s}</th>)}<th>Total</th></tr>
                </thead>
                <tbody>
                    {data.rows.map((r) => (
                        <tr key={r.label}>
                            <td>{r.label}</td>
                            {data.series.map((s) => <td key={s}>{(r.values[s] || 0).toLocaleString()}</td>)}
                            <td>{data.series.reduce((n, s) => n + (r.values[s] || 0), 0).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </details>
);

export default DataTable;
