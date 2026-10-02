/**
 * Render a stored vocabulary value as display text: a plain term, a list of
 * term objects, or the Python-repr string legacy rows hold in text columns.
 */
export const resolveValue = (v) => {
    if (v === '[]') return null;
    // Legacy rows store vocabulary lists as the Python repr of a list of term
    // dicts, e.g. "[{'term': 'Drought'}, {'term': 'Floods'}]" — show the terms.
    if (typeof v === 'string' && v.startsWith('[{')) {
        const terms = [...v.matchAll(/'term': (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)]
            .map((m) => (m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
        if (terms.length) return terms.join(', ');
    }
    if (Array.isArray(v)) return v.map(item => item?.term ?? item).filter(Boolean).join(', ') || null;
    if (v && typeof v === 'object' && 'term' in v) return v.term;
    return v;
};
