import { describe, it, expect } from 'vitest';
import { countryName, locationPoints, locationPrecision, otherPartners, timeline } from './projectDetails';

describe('locationPoints', () => {
    it('reads a [lon, lat] pair and WKT points, as [lat, lon]', () => {
        expect(locationPoints([18.42, -33.92])).toEqual([[-33.92, 18.42]]);
        expect(locationPoints('GEOMETRYCOLLECTION (POINT (30.97 -25.47), POINT (31.1 -25.5))'))
            .toEqual([[-25.47, 30.97], [-25.5, 31.1]]);
    });

    it('ignores empty, zero and malformed coordinates', () => {
        expect(locationPoints(null)).toEqual([]);
        expect(locationPoints([0, 0])).toEqual([]);
        expect(locationPoints('GEOMETRYCOLLECTION ()')).toEqual([]);
        expect(locationPoints(['x', 'y'])).toEqual([]);
    });
});

describe('timeline', () => {
    it('shows years when only years were recorded', () => {
        expect(timeline('2019-01-01T00:00:00', '2020-01-01T00:00:00')).toBe('2019 – 2020');
        expect(timeline('2019-01-01T00:00:00', '2019-01-01T00:00:00')).toBe('2019');
        expect(timeline('2019-01-01T00:00:00', null)).toBe('From 2019');
        expect(timeline(null, '2020-01-01')).toBe('Until 2020');
        expect(timeline(null, null)).toBeNull();
    });

    it('shows a full date when one was given', () => {
        expect(timeline('2021-03-15T00:00:00', '2022-01-01T00:00:00')).toBe('15/03/2021 – 2022');
    });
});

describe('other details', () => {
    it('hides partners that only repeat the implementing organisation', () => {
        expect(otherPartners('African Climate & Development Initiative, UCT', 'african climate & development initiative, uct')).toBeNull();
        expect(otherPartners('WWF', 'City of Cape Town')).toBe('WWF');
        expect(otherPartners(null, 'City of Cape Town')).toBeNull();
    });

    it('names the country and the precision of a location', () => {
        expect(countryName('ZAF')).toBe('South Africa');
        expect(locationPrecision('local_municipality').label).toMatch(/municipality/);
        expect(locationPrecision(undefined).label).toBe('Exact location');
    });
});
