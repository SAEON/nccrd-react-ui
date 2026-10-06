import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { registerAccount } from '../services/api';
import Register from './Register';

vi.mock('../services/api', () => ({ registerAccount: vi.fn() }));

const fill = (overrides = {}) => {
    const values = { 'Full name': 'Thandi M', Email: 't@example.org', Organisation: 'City of Joburg',
        'Password (at least 8 characters)': 'a-long-password', 'Confirm password': 'a-long-password', ...overrides };
    Object.entries(values).forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
};

describe('Register', () => {
    beforeEach(() => registerAccount.mockReset().mockResolvedValue({ detail: 'Thanks. An administrator will review your request.' }));

    it('catches mismatched passwords before sending', () => {
        render(<MemoryRouter><Register /></MemoryRouter>);
        fill({ 'Confirm password': 'something-else' });
        fireEvent.submit(screen.getByRole('button', { name: 'Request account' }).closest('form'));
        expect(screen.getByRole('alert')).toHaveTextContent('don’t match');
        expect(registerAccount).not.toHaveBeenCalled();
    });

    it('sends the request without the confirmation and shows the reply', async () => {
        render(<MemoryRouter><Register /></MemoryRouter>);
        fill();
        fireEvent.submit(screen.getByRole('button', { name: 'Request account' }).closest('form'));
        expect(await screen.findByRole('status')).toHaveTextContent('An administrator will review');
        expect(registerAccount).toHaveBeenCalledWith({ name: 'Thandi M', email: 't@example.org', organisation: 'City of Joburg', password: 'a-long-password', note: '' });
    });
});
