// ─────────────────────────────────────────────────────────────────────────────
// FacetSelect — labelled native <select> from backend vocabulary (used by Home)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A controlled, labelled <select> whose options are sourced dynamically from
 * the `facets` API response.  Gracefully degrades to "(ALL)" only when the
 * options array is empty (e.g. no data yet, or the backend doesn't expose that
 * facet — province is an example of the latter because it lives in a JSONB blob).
 *
 * Null / undefined entries in `options` are filtered out before rendering to
 * guard against sparse DB columns.  Options are sorted alphabetically for
 * consistent UX.
 *
 * @param {string}   label    – Human-readable label rendered above the select
 * @param {string}   value    – Controlled value (from `filters` state)
 * @param {string[]} options  – Array of distinct string values from the API
 * @param {function} onChange – Callback receiving the newly selected string value
 */
const FacetSelect = ({ id, label, value, options = [], onChange }) => (
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
            {options
                .filter(Boolean)
                .sort()
                .map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))
            }
        </select>
    </div>
);

export default FacetSelect;
