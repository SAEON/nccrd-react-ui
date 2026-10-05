import { describe, it, expect } from 'vitest';
import { toCsv, listCsv, byTypeCsv } from './csv';

describe('csv', () => {
    it('escapes quotes, commas and line breaks', () => {
        expect(toCsv([['a', 'b,c'], ['say "hi"', 'x\ny']])).toBe('a,"b,c"\r\n"say ""hi""","x\ny"');
    });

    it('builds list and by-type tables with totals', () => {
        expect(listCsv('Province', 'Projects', [{ label: 'Gauteng', count: 855 }])).toEqual([['Province', 'Projects'], ['Gauteng', 855]]);
        const data = { series: ['Mitigation', 'Adaptation'], rows: [{ label: 2020, values: { Mitigation: 2 } }] };
        expect(byTypeCsv('Year', data)).toEqual([['Year', 'Mitigation', 'Adaptation', 'Total'], [2020, 2, 0, 2]]);
    });
});
