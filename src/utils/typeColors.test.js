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
