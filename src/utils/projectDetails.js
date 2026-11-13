// Helpers for the project page (pages/SubmissionDetails.jsx).

/**
 * A project's location points as [lat, lon] pairs, from geo_location.coordinates:
 * a [lon, lat] pair, or WKT text with one or more points
 * ("GEOMETRYCOLLECTION (POINT (30.97 -25.47), POINT (...))"). Empty, (0, 0) and
 * malformed values give no points.
 */
export const locationPoints = (coordinates) => {
    if (!coordinates) return [];
    let pairs = [];
    if (Array.isArray(coordinates)) {
        pairs = [coordinates];
    } else if (typeof coordinates === 'string') {
        pairs = [...coordinates.matchAll(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/gi)]
            .map((m) => [Number(m[1]), Number(m[2])]);
    }
    return pairs
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && !(lon === 0 && lat === 0))
        .map(([lon, lat]) => [lat, lon]);
};

/** How precise a mapped location is, from geo_location.located_by. */
export const LOCATION_PRECISION = {
    coordinates: { label: 'Exact location', zoom: 11 },
    local_municipality: { label: 'Approximate: centre of the local municipality', zoom: 9 },
    district: { label: 'Approximate: centre of the district', zoom: 8 },
    province: { label: 'Approximate: centre of the province', zoom: 6 },
};

export const locationPrecision = (locatedBy) => LOCATION_PRECISION[locatedBy] ?? LOCATION_PRECISION.coordinates;

const COUNTRIES = { ZAF: 'South Africa' };
export const countryName = (code) => COUNTRIES[code] ?? code;

const parts = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? { year: m[1], yearOnly: m[2] === '01' && m[3] === '01', date: `${m[3]}/${m[2]}/${m[1]}` } : null;
};

/**
 * "2019 – 2020", "2019", "From 2019", "Until 2020", or null. Most projects
 * record years only (stored as 1 January), so a full date is shown only when
 * one was actually given.
 */
export const timeline = (start, end) => {
    const s = parts(start);
    const e = parts(end);
    const show = (p) => (p.yearOnly ? p.year : p.date);
    if (s && e) return show(s) === show(e) ? show(s) : `${show(s)} – ${show(e)}`;
    if (s) return `From ${show(s)}`;
    if (e) return `Until ${show(e)}`;
    return null;
};

/** Other partners, unless they only repeat the implementing organisation. */
export const otherPartners = (partners, organization) => {
    const norm = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return partners && norm(partners) !== norm(organization) ? partners : null;
};
