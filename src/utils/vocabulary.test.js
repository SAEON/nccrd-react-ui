import { describe, it, expect } from 'vitest';
import { childrenOf, inGroup, outline, topLevel } from './vocabulary';

const SECTORS = [
    { term: 'Energy', parent: null, group: 'Mitigation sector', level: 1 },
    { term: 'Transport', parent: 'Energy', group: 'Mitigation sector', level: 2 },
    { term: 'Road', parent: 'Transport', group: 'Mitigation sector', level: 3 },
    { term: 'Waste', parent: null, group: 'Mitigation sector', level: 1 },
];
const POLICIES = [
    { term: 'NCCAS', parent: null, group: 'National policy', level: 1 },
    { term: 'Agriculture Master Plan', parent: null, group: 'Regional policy', level: 1 },
    { term: 'Intervention 1', parent: 'NCCAS', group: 'National policy', level: 2 },
    { term: 'NDC', parent: null, group: 'National policy', level: 1 },
];
const terms = (list) => list.map((t) => t.term);

describe('vocabulary options', () => {
    it('offers the top level, then the terms under the chosen one', () => {
        expect(terms(topLevel(SECTORS))).toEqual(['Energy', 'Waste']);
        expect(terms(childrenOf(SECTORS, 'Energy'))).toEqual(['Transport']);
        expect(terms(childrenOf(SECTORS, 'Transport'))).toEqual(['Road']);
        expect(childrenOf(SECTORS, '')).toEqual([]);
    });

    it('keeps one heading’s terms, each followed by its own', () => {
        expect(terms(inGroup(POLICIES, 'National policy'))).toEqual(['NCCAS', 'Intervention 1', 'NDC']);
        expect(terms(inGroup(POLICIES, 'Regional policy'))).toEqual(['Agriculture Master Plan']);
        expect(terms(outline(SECTORS))).toEqual(['Energy', 'Transport', 'Road', 'Waste']);
    });
});
