import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { assignRole, getGrants, getUsers, revokeRole } from '../services/api';
import AdminUsers from './AdminUsers';
import { roleLabel } from '../utils/roles';

vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ user: { id: 1, name: 'Admin' }, hasPermission: (p) => p === 'assign-role', loading: false }),
}));
vi.mock('../context/SiteContext', () => ({ useSite: () => ({ short_title: 'MCCRD' }) }));
vi.mock('../services/api', () => ({
    getUsers: vi.fn(), getGrants: vi.fn(), assignRole: vi.fn(), revokeRole: vi.fn(),
}));

const PEOPLE = [
    { id: 1, name: 'Admin', email: 'admin@example.org', last_login: '2026-11-09T08:00:00', created_at: '2026-01-01T00:00:00',
        roles: [{ id: 10, role_id: 3, role: 'site-admin', tenant_id: 2, site: 'MCCRD' }] },
    { id: 7, name: 'Thandi M', email: 'thandi@example.org', organisation: 'Mbombela', last_login: null, created_at: '2026-01-01T00:00:00',
        roles: [{ id: 11, role_id: 6, role: 'reviewer', tenant_id: 2, site: 'MCCRD' }] },
];
const PROVINCE_GRANTS = { sites: [{ id: 2, name: 'MCCRD', is_default: false }],
    roles: [{ id: 5, name: 'contributor' }, { id: 6, name: 'reviewer' }, { id: 3, name: 'site-admin' }] };

const row = async (name) => (await screen.findByText(name)).closest('li');

describe('AdminUsers', () => {
    beforeEach(() => {
        getUsers.mockReset().mockResolvedValue(PEOPLE);
        getGrants.mockReset().mockResolvedValue(PROVINCE_GRANTS);
        assignRole.mockReset().mockResolvedValue({ id: 12, user_id: 7, role_id: 5, tenant_id: 2 });
        revokeRole.mockReset().mockResolvedValue({});
    });

    it('lists people with their roles and last login, and explains searching on a province site', async () => {
        render(<MemoryRouter><AdminUsers /></MemoryRouter>);
        const thandi = await row('Thandi M');
        expect(thandi).toHaveTextContent('thandi@example.org · Mbombela · never logged in');
        expect(within(thandi).getByRole('list', { name: "Thandi M's roles" })).toHaveTextContent('Reviewer');
        expect(screen.getByText(/search for their full email address/)).toBeInTheDocument();
    });

    it('gives a role, contributor by default, on the only site the admin runs', async () => {
        render(<MemoryRouter><AdminUsers /></MemoryRouter>);
        const thandi = await row('Thandi M');
        await waitFor(() => expect(within(thandi).getByLabelText('Role for Thandi M')).toHaveValue('5'));
        expect(within(thandi).queryByLabelText('Site for Thandi M')).not.toBeInTheDocument();
        fireEvent.click(within(thandi).getByRole('button', { name: 'Give role' }));
        await waitFor(() => expect(assignRole).toHaveBeenCalledWith(7, 5, 2));
        expect(await screen.findByRole('status')).toHaveTextContent('Thandi M is now contributor on MCCRD.');
        expect(within(thandi).getByRole('list', { name: "Thandi M's roles" })).toHaveTextContent('Contributor');
    });

    it('gives the default role on the default site when the choices arrive after the people', async () => {
        let grantsArrive;
        getGrants.mockReturnValue(new Promise((resolve) => { grantsArrive = resolve; }));
        render(<MemoryRouter><AdminUsers /></MemoryRouter>);
        const thandi = await row('Thandi M');
        grantsArrive(PROVINCE_GRANTS);
        fireEvent.click(await within(thandi).findByRole('button', { name: 'Give role' }));
        await waitFor(() => expect(assignRole).toHaveBeenCalledWith(7, 5, 2));
    });

    it('takes a role away, but offers no way to take away your own', async () => {
        render(<MemoryRouter><AdminUsers /></MemoryRouter>);
        const admin = await row('Admin');
        expect(within(admin).queryByRole('button', { name: /Take away/ })).not.toBeInTheDocument();

        const thandi = await row('Thandi M');
        fireEvent.click(within(thandi).getByRole('button', { name: 'Take away reviewer on MCCRD from Thandi M' }));
        await waitFor(() => expect(revokeRole).toHaveBeenCalledWith(7, 11));
        expect(within(thandi).getByRole('list', { name: "Thandi M's roles" })).toHaveTextContent('No role');
    });

    it('searches, and lets a national admin pick the site', async () => {
        getGrants.mockResolvedValue({ sites: [{ id: 1, name: 'NCCRD', is_default: true }, ...PROVINCE_GRANTS.sites], roles: PROVINCE_GRANTS.roles });
        render(<MemoryRouter><AdminUsers /></MemoryRouter>);
        const thandi = await row('Thandi M');
        expect(await within(thandi).findByLabelText('Site for Thandi M')).toBeInTheDocument();
        expect(screen.getByText(/Everyone with an account/)).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'thandi' } });
        fireEvent.submit(screen.getByRole('search'));
        await waitFor(() => expect(getUsers).toHaveBeenLastCalledWith('thandi'));
    });

    it('names roles for people', () => {
        expect(roleLabel('site-admin')).toBe('Site admin');
        expect(roleLabel('contributor')).toBe('Contributor');
    });
});
