import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, TextInput, VocabularySelect } from './FormFields';

describe('Field', () => {
    it('derives the id from the child\'s name prop and wires up htmlFor', () => {
        render(
            <Field label="Project Title">
                <TextInput name="title" value="" onChange={() => {}} />
            </Field>
        );
        const input = screen.getByLabelText('Project Title');
        expect(input).toHaveAttribute('name', 'title');
        expect(input).toHaveAttribute('id', 'title');
    });

    it('clicking the label focuses the associated control', async () => {
        const user = userEvent.setup();
        render(
            <Field label="Project Title">
                <TextInput name="title" value="" onChange={() => {}} />
            </Field>
        );
        await user.click(screen.getByText('Project Title'));
        expect(screen.getByLabelText('Project Title')).toHaveFocus();
    });

    it('falls back to an auto-generated id when the child has no name prop (e.g. VocabularySelect)', () => {
        render(
            <Field label="Estimated Budget Range">
                <VocabularySelect value="" onChange={() => {}} options={[]} />
            </Field>
        );
        const select = screen.getByLabelText('Estimated Budget Range');
        expect(select.id).toBeTruthy();
    });

    it('appends an asterisk to the label when required', () => {
        render(
            <Field label="Email" required>
                <TextInput name="email" value="" onChange={() => {}} required />
            </Field>
        );
        expect(screen.getByText('Email *')).toBeInTheDocument();
    });
});

describe('TextInput', () => {
    it('calls onChange with the new value on user input', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<TextInput name="title" value="" onChange={handleChange} />);
        await user.type(screen.getByRole('textbox'), 'a');
        expect(handleChange).toHaveBeenCalled();
    });
});

const OPTIONS = [
    { id: 1, term: 'NCCAS', level: 1 },
    { id: 2, term: 'Intervention 1', level: 2 },
];

describe('VocabularySelect with tree terms', () => {
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
