/**
 * Client-side sort options for the project list. The list endpoint returns
 * every matching project, so sorting needs no extra request.
 *
 * Coverage is uneven (every project has `createdate`, but many lack a title or
 * start date), so projects missing the sort field always go last, whatever the
 * direction.
 */
const blank = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim());

const byField = (field, direction, compare) => (a, b) => {
    const av = a[field];
    const bv = b[field];
    if (blank(av) || blank(bv)) return blank(av) - blank(bv);
    return direction * compare(av, bv);
};

// Leading quotes and symbols ("Ecopark", !Khwa) are ignored so titles sort by their first letter.
const sortableText = (v) => v.trim().replace(/^[^\p{L}\p{N}]+/u, '');
const text = (a, b) => sortableText(a).localeCompare(sortableText(b), undefined, { sensitivity: 'base', numeric: true });
// ISO-8601 timestamps sort correctly as strings.
const date = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const SORT_OPTIONS = [
    { value: 'recent', label: 'Recently added', compare: byField('createdate', -1, date) },
    { value: 'oldest', label: 'Oldest added', compare: byField('createdate', 1, date) },
    { value: 'title-asc', label: 'Title A–Z', compare: byField('title', 1, text) },
    { value: 'title-desc', label: 'Title Z–A', compare: byField('title', -1, text) },
    { value: 'start-desc', label: 'Start date (newest)', compare: byField('start_date', -1, date) },
];

export const DEFAULT_SORT = 'recent';

/** Return a sorted copy of `submissions`; unknown keys fall back to the default. */
export const sortSubmissions = (submissions, sortKey) => {
    const option = SORT_OPTIONS.find((o) => o.value === sortKey)
        ?? SORT_OPTIONS.find((o) => o.value === DEFAULT_SORT);
    return [...submissions].sort(option.compare);
};
