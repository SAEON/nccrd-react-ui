// ─────────────────────────────────────────────────────────────────────────────
// FacetSelect — labelled native <select> from backend vocabulary (used by Home)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A controlled, labelled <select> whose options are sourced dynamically from
 * the `facets` API response.  Gracefully degrades to "(ALL)" only when the
 * options array is empty (e.g. no data yet, or a column with no values at all).
 *
 * Null / undefined entries in `options` are filtered out before rendering to
 * guard against sparse DB columns.  Options are sorted alphabetically for
 * consistent UX.
 *
 * @param {string}   label    – Human-readable label rendered above the select
 * @param {string}   value    – Controlled value (from `filters` state)
 * @param {string[]} options  – Array of distinct string values from the API
 * @param {function} onChange – Callback receiving the newly selected string value
 * @param {Object}   labels   – Optional display text per option value
 * @param {string[]} pinned   – Option values listed first, ahead of the sorted rest
 */
const FacetSelect = ({ id, label, value, options = [], onChange, labels = {}, pinned = [] }) => (
    <div style={{ marginBottom: '0.875rem' }}>
        <label className="input-label" htmlFor={id}>{label}</label>
        <select
            id={id}
            className="input-field"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '0.6rem 0.8rem',
            }}
        >
            {/* Default "no filter" sentinel — always present */}
            <option value="">(ALL)</option>

            {/* Dynamic options: filter nulls, sort, then render */}
            {[
                ...pinned.filter((opt) => options.includes(opt)),
                ...options.filter((opt) => opt && !pinned.includes(opt)).sort(),
            ].map((opt) => (
                <option key={opt} value={opt}>{labels[opt] ?? opt}</option>
            ))}
        </select>
    </div>
);

export default FacetSelect;
