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

/**
 * Darker shades of the same hues, for text: each reads at 4.9:1 or better on
 * its own badge tint (typeTint), where the identity colours above only reach
 * about 3:1.
 */
const TYPE_TEXT_COLORS = {
    Mitigation: '#8a5a00',
    Adaptation: '#047857',
    'Cross Cutting': '#4338ca',
};

export const typeTextColor = (type) => TYPE_TEXT_COLORS[type] ?? '#475569';

/** The type colour as a light tint, for a badge's background. */
export const typeTint = (type, alpha = 0.12) => {
    const hex = typeColor(type).slice(1);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Projects per type as [type, count] pairs, known types in their fixed order. */
export const countByType = (projects) => {
    const counts = {};
    projects.forEach((p) => { counts[p.type] = (counts[p.type] ?? 0) + 1; });
    const known = TYPE_ORDER.filter((t) => counts[t]).map((t) => [t, counts[t]]);
    const other = Object.entries(counts).filter(([t]) => !TYPE_ORDER.includes(t));
    return [...known, ...other];
};
