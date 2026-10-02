import { describe, it, expect } from 'vitest';
import { resolveValue } from './resolveValue';

describe('resolveValue', () => {
    it('passes plain values through', () => {
        expect(resolveValue('Drought')).toBe('Drought');
        expect(resolveValue(null)).toBeNull();
        expect(resolveValue('[]')).toBeNull();
    });

    it('joins term objects in arrays', () => {
        expect(resolveValue([{ term: 'Gauteng' }, { term: 'Free State' }])).toBe('Gauteng, Free State');
    });

    it('extracts terms from legacy repr strings', () => {
        const hazard = "[{'__typename': 'ControlledVocabulary', 'id': 'fa904137018d3f46eea2536429fe7f636938ba9c', "
            + "'root': 'Hazard', 'term': 'Drought', 'tree': 'hazards'}, {'__typename': 'ControlledVocabulary', "
            + "'id': 'Floods', 'term': 'Floods', 'tree': 'hazards', 'root': 'Hazard'}]";
        expect(resolveValue(hazard)).toBe('Drought, Floods');
    });

    it('handles terms Python quoted with double quotes', () => {
        expect(resolveValue(`[{'term': "Citizens' movement"}, {'term': 'Other'}]`)).toBe("Citizens' movement, Other");
    });
});
