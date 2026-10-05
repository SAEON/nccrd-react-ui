/**
 * Identity colours for the three project types, shared by the map, its legend
 * and the type badges so a type looks the same everywhere. Validated with the
 * dataviz palette checks (lightness band, chroma, colour-blind separation);
 * contrast against white is just under 3:1, so these mark shapes (dots, map
 * markers) next to text labels and are never used as text colour.
 */
export const TYPE_ORDER = ['Mitigation', 'Adaptation', 'Cross Cutting'];

export const TYPE_COLORS = {
    Mitigation: '#c98500',
    Adaptation: '#1baf7a',
    'Cross Cutting': '#6366f1',
};

export const OTHER_TYPE_COLOR = '#94a3b8';

export const typeColor = (type) => TYPE_COLORS[type] ?? OTHER_TYPE_COLOR;

/** Projects per type as [type, count] pairs, known types in their fixed order. */
export const countByType = (projects) => {
    const counts = {};
    projects.forEach((p) => { counts[p.type] = (counts[p.type] ?? 0) + 1; });
    const known = TYPE_ORDER.filter((t) => counts[t]).map((t) => [t, counts[t]]);
    const other = Object.entries(counts).filter(([t]) => !TYPE_ORDER.includes(t));
    return [...known, ...other];
};
