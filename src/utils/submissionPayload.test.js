import { describe, it, expect } from 'vitest';
import { sanitizePayload, normalizeGeoLocation, DEFAULT_COORDINATES } from './submissionPayload';

describe('sanitizePayload', () => {
    it('converts empty-string enum fields to null', () => {
        const result = sanitizePayload({
            funding_type: '',
            implementation_status: '',
        });
        expect(result.funding_type).toBeNull();
        expect(result.implementation_status).toBeNull();
    });

    it('leaves non-empty enum values untouched', () => {
        const result = sanitizePayload({
            funding_type: 'Grant',
            implementation_status: 'Under Implementation',
        });
        expect(result.funding_type).toBe('Grant');
        expect(result.implementation_status).toBe('Under Implementation');
    });

    it('appends midnight to a date-only string so Pydantic v1 accepts it', () => {
        const result = sanitizePayload({ start_date: '2024-03-15', end_date: '2024-12-01' });
        expect(result.start_date).toBe('2024-03-15T00:00:00');
        expect(result.end_date).toBe('2024-12-01T00:00:00');
    });

    it('converts falsy date fields to null', () => {
        const result = sanitizePayload({ start_date: '', end_date: null });
        expect(result.start_date).toBeNull();
        expect(result.end_date).toBeNull();
    });

    it('leaves an already-ISO datetime string untouched', () => {
        const result = sanitizePayload({ start_date: '2024-03-15T00:00:00', end_date: '' });
        expect(result.start_date).toBe('2024-03-15T00:00:00');
    });

    it('casts funding_amount to a float, treating 0/NaN/empty as null', () => {
        expect(sanitizePayload({ funding_amount: '1500.50' }).funding_amount).toBe(1500.5);
        expect(sanitizePayload({ funding_amount: '0' }).funding_amount).toBeNull();
        expect(sanitizePayload({ funding_amount: '' }).funding_amount).toBeNull();
        expect(sanitizePayload({ funding_amount: 'not-a-number' }).funding_amount).toBeNull();
    });

    it('ensures geo_location has a Point type and drops undefined keys', () => {
        const result = sanitizePayload({
            geo_location: { province: 'GT', coordinates: [28.0, -26.2] },
        });
        expect(result.geo_location).toEqual({
            province: 'GT',
            type: 'Point',
            coordinates: [28.0, -26.2],
        });
        expect(result.geo_location).not.toHaveProperty('country');
        expect(result.geo_location).not.toHaveProperty('district');
    });

    it('falls back to default coordinates when geo_location has none', () => {
        const result = sanitizePayload({ geo_location: { province: 'GT' } });
        expect(result.geo_location.coordinates).toEqual([30.374, -27.936]);
    });

    it('strips adaptation_data when intervention_measurement is Mitigation', () => {
        const result = sanitizePayload({
            intervention_measurement: 'Mitigation',
            mitigation_data: { sector: 'Energy' },
            adaptation_data: { sector: 'Water' },
        });
        expect(result.mitigation_data).toEqual({ sector: 'Energy' });
        expect(result.adaptation_data).toBeNull();
    });

    it('strips mitigation_data when intervention_measurement is Adaptation', () => {
        const result = sanitizePayload({
            intervention_measurement: 'Adaptation',
            mitigation_data: { sector: 'Energy' },
            adaptation_data: { sector: 'Water' },
        });
        expect(result.mitigation_data).toBeNull();
        expect(result.adaptation_data).toEqual({ sector: 'Water' });
    });

    it('keeps both nested data objects for Cross Cutting', () => {
        const result = sanitizePayload({
            intervention_measurement: 'Cross Cutting',
            mitigation_data: { sector: 'Energy' },
            adaptation_data: { sector: 'Water' },
        });
        expect(result.mitigation_data).toEqual({ sector: 'Energy' });
        expect(result.adaptation_data).toEqual({ sector: 'Water' });
    });

    it('removes response-only fields that would cause a 422 on submit', () => {
        const result = sanitizePayload({
            title: 'A project',
            mitigation: { sector: 'Energy' },
            adaptation: null,
            progress_reports: [{ id: 1 }],
            deleted: false,
            createdate: '2024-01-01',
            submission_status: 'Pending',
            _id: 'abc123',
        });
        expect(result.title).toBe('A project');
        expect(result).not.toHaveProperty('mitigation');
        expect(result).not.toHaveProperty('adaptation');
        expect(result).not.toHaveProperty('progress_reports');
        expect(result).not.toHaveProperty('deleted');
        expect(result).not.toHaveProperty('createdate');
        expect(result).not.toHaveProperty('submission_status');
        expect(result).not.toHaveProperty('_id');
    });

    it('does not mutate the object passed in', () => {
        const raw = { funding_type: '', start_date: '2024-01-01' };
        sanitizePayload(raw);
        expect(raw.funding_type).toBe('');
        expect(raw.start_date).toBe('2024-01-01');
    });
});

describe('normalizeGeoLocation', () => {
    it('returns sensible defaults when given nothing', () => {
        const result = normalizeGeoLocation(undefined);
        expect(result).toEqual({
            type: 'Point',
            country: 'ZAF',
            province: '',
            district: '',
            local_municipality: '',
            town_suburb: '',
            coordinates: DEFAULT_COORDINATES,
        });
    });

    it('passes through valid string region codes and a coordinate pair', () => {
        const result = normalizeGeoLocation({
            country: 'ZAF',
            province: 'GT',
            district: 'DC42',
            local_municipality: 'JHB',
            town_suburb: 'Sandton',
            coordinates: [28.05, -26.1],
        });
        expect(result.province).toBe('GT');
        expect(result.district).toBe('DC42');
        expect(result.coordinates).toEqual([28.05, -26.1]);
    });

    it('drops a legacy vocabulary-term object instead of feeding it to a code dropdown', () => {
        const result = normalizeGeoLocation({ province: { term: 'North West' } });
        expect(result.province).toBe('');
    });

    it('drops a legacy WKT coordinate string in favour of the default point', () => {
        const result = normalizeGeoLocation({
            coordinates: 'GEOMETRYCOLLECTION (POINT (24.27 -26.63))',
        });
        expect(result.coordinates).toEqual(DEFAULT_COORDINATES);
    });

    it('drops a coordinate array of the wrong length', () => {
        const result = normalizeGeoLocation({ coordinates: [1, 2, 3] });
        expect(result.coordinates).toEqual(DEFAULT_COORDINATES);
    });
});
