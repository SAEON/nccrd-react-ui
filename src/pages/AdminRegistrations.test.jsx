import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { approveRegistration } from '../services/api';
import AdminRegistrations from './AdminRegistrations';

vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ hasPermission: (p) => p === 'assign-role', loading: false }),
}));
vi.mock('../services/api', () => ({
    getRegistrations: vi.fn().mockResolvedValue([
        { id: 9, name: 'Thandi M', email: 't@example.org', organisation: 'City of Joburg', registration_note: 'Capturing projects', created_at: '2026-10-02T09:00:00' },
    ]),
    // Only the roles this admin may give, as the server lists them.
    getGrants: vi.fn().mockResolvedValue({ sites: [{ id: 2, name: 'MCCRD', is_default: false }],
        roles: [{ id: 1, name: 'site-admin' }, { id: 5, name: 'contributor' }, { id: 6, name: 'reviewer' }] }),
    approveRegistration: vi.fn().mockResolvedValue({}),
    rejectRegistration: vi.fn().mockResolvedValue({}),
}));

describe('AdminRegistrations', () => {
    it('approves as a contributor by default and removes the request', async () => {
        render(<MemoryRouter><AdminRegistrations /></MemoryRouter>);
        expect(await screen.findByText('Capturing projects')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByLabelText('Role')).toHaveValue('5'));
        expect(screen.getByRole('option', { name: 'Site admin' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
        await waitFor(() => expect(approveRegistration).toHaveBeenCalledWith(9, 5));
        expect(await screen.findByRole('status')).toHaveTextContent('Thandi M can now log in.');
        expect(screen.queryByText('Capturing projects')).not.toBeInTheDocument();
    });
});
