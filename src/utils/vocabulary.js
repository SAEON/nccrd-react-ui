// Picking dropdown options out of a vocabulary tree (GET /vocabulary/{tree}),
// where each term comes with its parent, its heading (group) and its level.

/** The top-level terms, e.g. the four mitigation sectors. */
export const topLevel = (terms = []) => terms.filter((t) => t.level === 1);

/** The terms directly under `parent`, e.g. a sector's subsectors; none until a parent is chosen. */
export const childrenOf = (terms = [], parent) => (parent ? terms.filter((t) => t.parent === parent) : []);

/** The terms under one heading, e.g. "National policy", each followed by its own sub-terms. */
export const inGroup = (terms = [], group) => outline(terms.filter((t) => t.group === group));

/** Terms in outline order: each term followed by the terms under it. */
export const outline = (terms = []) => {
    const under = new Map();
    terms.forEach((t) => under.set(t.parent ?? null, [...(under.get(t.parent ?? null) ?? []), t]));
    const walk = (parent) => (under.get(parent) ?? []).flatMap((t) => [t, ...walk(t.term)]);
    return walk(null);
};
