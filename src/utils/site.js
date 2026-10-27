// The site a page belongs to: the national NCCRD or a province site such as
// the Mpumalanga MCCRD (GET /site, context/SiteProvider.jsx).

/** The national site: shown until GET /site answers, and for anything it leaves empty. */
export const NATIONAL_SITE = {
    title: 'National Climate Change Response Database',
    short_title: 'NCCRD',
    province: null,
    logo_url: '/dffe-logo.jpg',
    flag_url: '/flag.svg',
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
