// The site a page belongs to: the national NCCRD or a province site such as
// the Mpumalanga MCCRD (GET /site, context/SiteProvider.jsx).

/** The national site: shown until GET /site answers, and for anything it leaves empty. */
export const NATIONAL_SITE = {
    title: 'National Climate Change Response Database',
    short_title: 'NCCRD',
    province: null,
    logo_url: null,       // a site's own emblem, shown beside the DFFE logo
    flag_url: '/flag.svg',
    hero_image: { url: '/hero-bg.jpg' },
    contact_email: 'nccrd@environment.gov.za',
    theme: null,
    front_matter: null,
    is_default: true,
};

/** The site from GET /site, with the national value for each field it leaves empty. */
export const siteFrom = (data) => ({
    ...NATIONAL_SITE,
    ...Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')),
});

/**
 * The site's colours as CSS custom properties, e.g. { "accent-primary": "#622700" }
 * → [["--accent-primary", "#622700"]]. Only the colour variables the
 * stylesheet themes by (accent-*, chart-*) are taken.
 */
export const themeVariables = (theme) => Object.entries(theme || {})
    .filter(([name, value]) => /^(accent|chart)-[a-z-]+$/.test(name) && typeof value === 'string')
    .map(([name, value]) => [`--${name}`, value]);

/** "South Africa’s", or the province site's "Mpumalanga’s". */
export const regionPossessive = (site) => `${site.province || 'South Africa'}’s`;

/**
 * Each province's extent, [[south, west], [north, east]], roughly: a province
 * site's maps open on its province rather than the whole country.
 */
export const PROVINCE_BOUNDS = {
    'Eastern Cape': [[-34.2, 22.7], [-30.0, 30.2]],
    'Free State': [[-30.7, 24.3], [-26.6, 29.8]],
    Gauteng: [[-26.9, 27.1], [-25.1, 28.9]],
    'KwaZulu-Natal': [[-31.1, 28.8], [-26.8, 32.9]],
    Limpopo: [[-25.0, 26.4], [-22.1, 31.9]],
    Mpumalanga: [[-27.5, 28.2], [-24.4, 32.0]],
    'Northern Cape': [[-32.9, 16.4], [-24.7, 25.6]],
    'North West': [[-28.0, 22.6], [-24.6, 28.3]],
    'Western Cape': [[-34.8, 17.8], [-31.0, 24.2]],
};
