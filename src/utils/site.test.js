import { describe, it, expect } from 'vitest';
import { NATIONAL_SITE, provinceParam, regionPossessive, siteFrom, themeVariables } from './site';

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
