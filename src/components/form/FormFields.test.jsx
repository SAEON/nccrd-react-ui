import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabularySelect } from './FormFields';

const OPTIONS = [
    { id: 1, term: 'NCCAS', level: 1 },
    { id: 2, term: 'Intervention 1', level: 2 },
];

describe('VocabularySelect', () => {
    it('keeps a stored value that is not in the list, marked as such', () => {
        render(<VocabularySelect value="Typed in the old system" onChange={vi.fn()} options={OPTIONS} />);
        expect(screen.getByRole('combobox')).toHaveValue('Typed in the old system');
        expect(screen.getByRole('option', { name: 'Typed in the old system (not in the list)' })).toBeInTheDocument();
    });

    it('indents sub-terms under their parent', () => {
        render(<VocabularySelect value="" onChange={vi.fn()} options={OPTIONS} />);
        expect(screen.getAllByRole('option').map((o) => o.textContent))
            .toEqual(['-- Select --', 'NCCAS', '   Intervention 1']);
    });
});
