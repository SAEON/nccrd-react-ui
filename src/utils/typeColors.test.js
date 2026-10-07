import { describe, it, expect } from 'vitest';
import { countByType, typeColor } from './typeColors';

describe('typeColors', () => {
    it('counts projects per type in the fixed type order', () => {
        const projects = [{ type: 'Cross Cutting' }, { type: 'Mitigation' }, { type: 'Mitigation' }, { type: 'Research' }];
        expect(countByType(projects)).toEqual([['Mitigation', 2], ['Cross Cutting', 1], ['Research', 1]]);
    });

    it('gives unknown types a neutral colour', () => {
        expect(typeColor('Adaptation')).toBe('#1baf7a');
        expect(typeColor(undefined)).toBe('#94a3b8');
    });
});

describe('badge colours', () => {
    it('tints the type colour for the box and uses a darker shade for the text', async () => {
        const { typeTint, typeTextColor } = await import('./typeColors');
        expect(typeTint('Adaptation')).toBe('rgba(27, 175, 122, 0.12)');
        expect(typeTextColor('Adaptation')).toBe('#047857');
        expect(typeTextColor('Something else')).toBe('#475569');
    });
});
