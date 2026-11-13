import { describe, it, expect } from 'vitest';
import { NATIONAL_SITE, provinceParam, provinceSegmentOf, regionPossessive, siteAddress, siteBasename, siteFrom, themeVariables } from './site';

describe('provinceParam', () => {
    it('writes a province as it appears in a URL', () => {
        expect(provinceParam('Mpumalanga')).toBe('mpumalanga');
        expect(provinceParam('Western Cape')).toBe('western-cape');
        expect(provinceParam('KwaZulu-Natal')).toBe('kwazulu-natal');
    });
});

describe('siteFrom', () => {
    it('keeps the national value for fields the site leaves empty', () => {
        const site = siteFrom({ title: 'Mpumalanga Climate Change Response Database', logo_url: null, flag_url: '', province: 'Mpumalanga' });
        expect(site.title).toBe('Mpumalanga Climate Change Response Database');
        expect(site.province).toBe('Mpumalanga');
        expect(site.logo_url).toBe(NATIONAL_SITE.logo_url);
        expect(site.flag_url).toBe(NATIONAL_SITE.flag_url);
    });

    it('is the national site without an answer', () => {
        expect(siteFrom(null)).toEqual(NATIONAL_SITE);
    });
});

describe('themeVariables', () => {
    it('takes only the colour variables the stylesheet themes by', () => {
        expect(themeVariables({
            'accent-primary': '#622700',
            'chart-series': '#0a51a5',
            'font-family': 'Comic Sans',
            'accent-light': 12,
            'accent-primary; color': 'red',
        })).toEqual([['--accent-primary', '#622700'], ['--chart-series', '#0a51a5']]);
        expect(themeVariables(null)).toEqual([]);
    });
});

describe('regionPossessive', () => {
    it('names the province of a province site, else South Africa', () => {
        expect(regionPossessive(NATIONAL_SITE)).toBe('South Africa’s');
        expect(regionPossessive(siteFrom({ province: 'Mpumalanga' }))).toBe('Mpumalanga’s');
    });
});

describe('province paths', () => {
    it('finds the province site an address belongs to', () => {
        expect(provinceSegmentOf('/mpumalanga/reports')).toBe('mpumalanga');
        expect(provinceSegmentOf('/Western-Cape')).toBe('western-cape');
        expect(provinceSegmentOf('/reports')).toBeNull();
        expect(provinceSegmentOf('/')).toBeNull();
        expect(siteBasename('/kwazulu-natal/submission/new')).toBe('/kwazulu-natal');
        expect(siteBasename('/about')).toBe('');
    });

    const at = (path) => {
        const url = new URL(path, 'http://x');
        return siteAddress({ pathname: url.pathname, search: url.search, hash: url.hash });
    };

    it('moves the earlier ?siteprovince= address to the province path', () => {
        expect(at('/?siteprovince=mpumalanga')).toBe('/mpumalanga');
        expect(at('/reports?siteprovince=Western%20Cape&a=1#x')).toBe('/western-cape/reports?a=1#x');
    });

    it('writes the province in lower case', () => {
        expect(at('/Mpumalanga/reports?a=1')).toBe('/mpumalanga/reports?a=1');
    });

    it('leaves addresses that are fine alone', () => {
        expect(at('/mpumalanga/reports')).toBeNull();
        expect(at('/reports?a=1')).toBeNull();
        expect(at('/?siteprovince=atlantis')).toBeNull();
    });
});

describe('uploaded site images', () => {
    it('are served by the API; images shipped with the interface are not', async () => {
        const { assetUrl, siteFrom } = await import('./site');
        expect(assetUrl('/uploads/sites/7/logo-ab.png', 'http://localhost:2022')).toBe('http://localhost:2022/uploads/sites/7/logo-ab.png');
        expect(assetUrl('/sites/mccrd/arms.png', 'http://localhost:2022')).toBe('/sites/mccrd/arms.png');
        const site = siteFrom({ logo_url: '/uploads/sites/7/logo.png', hero_image: { url: '/uploads/sites/7/hero.jpg', credit: 'Me' } }, '/api');
        expect(site.logo_url).toBe('/api/uploads/sites/7/logo.png');
        expect(site.hero_image).toEqual({ url: '/api/uploads/sites/7/hero.jpg', credit: 'Me' });
        expect(siteFrom({ hero_image: null }).hero_image).toEqual({ url: '/hero-bg.jpg' });
    });
});

