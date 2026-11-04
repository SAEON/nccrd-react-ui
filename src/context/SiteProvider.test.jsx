import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { SiteProvider } from './SiteProvider';
import { getSite } from '../services/api';

vi.mock('../services/api', () => ({ getSite: vi.fn() }));

const Where = () => {
    const { pathname, search, hash, state } = useLocation();
    return (
        <>
            <output>{`${pathname}${search}${hash}`}</output>
            <span data-testid="state">{state?.from}</span>
            <Link to="/reports">Reports</Link>
        </>
    );
};

const renderAt = (entry) => render(
    <MemoryRouter initialEntries={[entry]}>
        <SiteProvider><Where /></SiteProvider>
    </MemoryRouter>
);

describe('SiteProvider and the URL', () => {
    beforeEach(() => getSite.mockReset());

    it('adds the province of a province site to the URL, keeping the rest', async () => {
        getSite.mockResolvedValue({ short_title: 'MCCRD', province: 'Mpumalanga' });
        renderAt({ pathname: '/paia-popia', search: '?a=1', hash: '#privacy', state: { from: '/x' } });
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
            '/paia-popia?a=1&siteprovince=mpumalanga#privacy',
        ));
        expect(screen.getByTestId('state')).toHaveTextContent('/x');
    });

    it('keeps it when moving to another page', async () => {
        getSite.mockResolvedValue({ short_title: 'WCCRD', province: 'Western Cape' });
        renderAt('/');
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/?siteprovince=western-cape'));
        await userEvent.click(screen.getByRole('link', { name: 'Reports' }));
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/reports?siteprovince=western-cape'));
    });

    it('leaves the national site\'s URL alone', async () => {
        getSite.mockResolvedValue({ short_title: 'NCCRD', province: null });
        renderAt('/reports');
        await waitFor(() => expect(document.title).toBe('NCCRD'));
        expect(screen.getByRole('status')).toHaveTextContent(/^\/reports$/);
    });
});
