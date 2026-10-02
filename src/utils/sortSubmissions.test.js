import { describe, it, expect } from 'vitest';
import { sortSubmissions } from './sortSubmissions';

const rows = [
    { id: 'a', title: 'water project', createdate: '2024-05-01T10:00:00', start_date: null },
    { id: 'b', title: '', createdate: '2026-09-09T08:00:00', start_date: '2019-01-01T00:00:00' },
    { id: 'c', title: 'Agri 2', createdate: '2009-03-24T00:00:00', start_date: '2021-01-01T00:00:00' },
    { id: 'd', title: 'Agri 10', createdate: '2026-10-02T12:00:00', start_date: null },
];
const ids = (list) => list.map((r) => r.id);

describe('sortSubmissions', () => {
    it('sorts by date added in both directions', () => {
        expect(ids(sortSubmissions(rows, 'recent'))).toEqual(['d', 'b', 'a', 'c']);
        expect(ids(sortSubmissions(rows, 'oldest'))).toEqual(['c', 'a', 'b', 'd']);
    });

    it('sorts titles case-insensitively and numerically, blanks last both ways', () => {
        expect(ids(sortSubmissions(rows, 'title-asc'))).toEqual(['c', 'd', 'a', 'b']);
        expect(ids(sortSubmissions(rows, 'title-desc'))).toEqual(['a', 'd', 'c', 'b']);
    });

    it('ignores leading quotes and symbols in titles', () => {
        const quoted = [{ id: 'q', title: '“Ecopark” project' }, { id: 'k', title: '!Khwa Ttu' }, { id: 'a', title: 'Agri' }];
        expect(ids(sortSubmissions(quoted, 'title-asc'))).toEqual(['a', 'q', 'k']);
    });

    it('puts projects without a start date last', () => {
        expect(ids(sortSubmissions(rows, 'start-desc'))).toEqual(['c', 'b', 'a', 'd']);
    });

    it('does not mutate the input and falls back to the default', () => {
        const before = ids(rows);
        expect(ids(sortSubmissions(rows, 'nonsense'))).toEqual(['d', 'b', 'a', 'c']);
        expect(ids(rows)).toEqual(before);
    });
});
