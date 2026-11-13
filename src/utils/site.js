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

/**
 * The earlier form of a province site's address, ?siteprovince=mpumalanga,
 * still accepted (see siteAddress), and how report downloads name the site.
 */
export const SITE_PROVINCE_PARAM = 'siteprovince';

/** "Mpumalanga" → "mpumalanga", "Western Cape" → "western-cape": its value in a URL. */
export const provinceParam = (province) => province.trim().toLowerCase().replace(/\s+/g, '-');

/**
 * An image's address: images an admin uploaded (/uploads/…) are served by
 * the API, which may be on another host (locally localhost:2022); the rest
 * ship with the interface.
 */
export const assetUrl = (url, apiBase = '') => (url && url.startsWith('/uploads/') ? `${apiBase}${url}` : url);

/** The site from GET /site, with the national value for each field it leaves empty. */
export const siteFrom = (data, apiBase = '') => {
    const site = {
        ...NATIONAL_SITE,
        ...Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')),
    };
    return {
        ...site,
        logo_url: assetUrl(site.logo_url, apiBase),
        flag_url: assetUrl(site.flag_url, apiBase),
        hero_image: site.hero_image?.url
            ? { ...site.hero_image, url: assetUrl(site.hero_image.url, apiBase) }
            : { ...NATIONAL_SITE.hero_image, ...site.hero_image },
    };
};

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

/** Opens another address as a new page load (another site's basename). */
export const loadPage = (address) => window.location.replace(address);

/** Each province site's first path segment: /mpumalanga, /western-cape, … */
export const PROVINCE_SEGMENTS = Object.keys(PROVINCE_BOUNDS).map(provinceParam);

/** The province site an address belongs to: "/mpumalanga/reports" → "mpumalanga"; null for the national site. */
export const provinceSegmentOf = (pathname) => {
    const segment = (pathname.split('/')[1] || '').toLowerCase();
    return PROVINCE_SEGMENTS.includes(segment) ? segment : null;
};

/** The site's part of an address, the router's basename: "/mpumalanga", or "" for the national site. */
export const siteBasename = (pathname) => {
    const segment = provinceSegmentOf(pathname);
    return segment ? `/${segment}` : '';
};

/**
 * A province site's address as /<province>/…: from ?siteprovince=<province>
 * on the national address, or with the province in capitals. null if the
 * address is fine as it is.
 */
export const siteAddress = ({ pathname, search, hash }) => {
    const params = new URLSearchParams(search);
    const fromParam = params.get(SITE_PROVINCE_PARAM);
    const named = fromParam && provinceSegmentOf(`/${provinceParam(fromParam)}`);
    const current = pathname.split('/')[1] || '';
    let path = pathname;
    if (provinceSegmentOf(pathname)) {
        path = `/${current.toLowerCase()}${pathname.slice(current.length + 1)}`;
    } else if (named) {
        path = `/${named}${pathname === '/' ? '' : pathname}`;
    }
    if (named) params.delete(SITE_PROVINCE_PARAM);
    const address = `${path}${params.size ? `?${params}` : ''}${hash}`;
    return address === `${pathname}${search}${hash}` ? null : address;
};
